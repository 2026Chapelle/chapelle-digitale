[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidateSet('staging', 'production')]
  [string]$TargetEnvironment,

  [Parameter(Mandatory)]
  [ValidateNotNullOrEmpty()]
  [string]$RollbackManifestPath,

  [Parameter(Mandatory)]
  [ValidateNotNullOrEmpty()]
  [string]$IdentityManifestPath,

  [switch]$AuthorizeMutation,
  [switch]$Execute,

  [ValidateNotNullOrEmpty()]
  [string]$ConnectionStringEnv = 'SUPABASE_DB_URL'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'mahanaim-target-identity.psm1') -Force

function Stop-Safely([string]$Reason) {
  throw "MAHANAIM_CALENDAR_ROLLBACK_STOP: $Reason"
}

if (-not (Test-Path -LiteralPath $RollbackManifestPath -PathType Leaf)) {
  Stop-Safely 'rollback manifest not found'
}
try {
  $manifest = Get-Content -LiteralPath $RollbackManifestPath -Raw | ConvertFrom-Json
} catch {
  Stop-Safely 'rollback manifest is not valid JSON'
}

if ($null -eq $manifest.retreatId -or @($manifest.days).Count -ne 10) {
  Stop-Safely 'rollback manifest must contain retreatId and exactly J1 through J10'
}
$retreatId = [guid]::Empty
if (-not [guid]::TryParse([string]$manifest.retreatId, [ref]$retreatId)) {
  Stop-Safely 'rollback manifest retreatId is not a UUID'
}

$days = foreach ($day in @($manifest.days)) {
  $id = [guid]::Empty
  $date = [datetime]::MinValue
  if ($null -eq $day.id -or -not [guid]::TryParse([string]$day.id, [ref]$id)) { Stop-Safely 'each rollback day id must be a UUID' }
  if ($null -eq $day.dayNumber -or [int]$day.dayNumber -lt 1 -or [int]$day.dayNumber -gt 10) { Stop-Safely 'rollback dayNumber must be between 1 and 10' }
  if ($null -eq $day.dayDate -or -not [datetime]::TryParseExact([string]$day.dayDate, 'yyyy-MM-dd', $null, [Globalization.DateTimeStyles]::None, [ref]$date)) { Stop-Safely 'rollback dayDate must use YYYY-MM-DD' }
  [pscustomobject]@{ Id = $id; DayNumber = [int]$day.dayNumber; DayDate = $date.Date }
}
$days = @($days | Sort-Object DayNumber)
if (@($days.Id | Select-Object -Unique).Count -ne 10) { Stop-Safely 'rollback manifest contains duplicate day IDs' }
for ($index = 0; $index -lt 10; $index++) {
  if ($days[$index].DayNumber -ne ($index + 1)) { Stop-Safely 'rollback day numbers must be J1 through J10 without gaps' }
  if ($index -gt 0 -and $days[$index].DayDate -ne $days[0].DayDate.AddDays($index)) { Stop-Safely 'rollback day dates must be consecutive from J1' }
}

$targetIdentity = Read-MahanaimTargetIdentityManifest $IdentityManifestPath
if ($TargetEnvironment -ne $targetIdentity.Environment) { Stop-Safely 'TargetEnvironment does not match the approved identity manifest' }

Write-Output "ROLLBACK_TARGET=$TargetEnvironment"
Write-Output 'ROLLBACK_MANIFEST_VALID=YES'
Write-Output 'ROLLBACK_DB_CONNECTION=NOT_ATTEMPTED'
if (-not $Execute) {
  Write-Output 'ROLLBACK_MUTATION=NOT_EXECUTED (add -Execute and -AuthorizeMutation only after release approval)'
  exit 0
}
if (-not $AuthorizeMutation) { Stop-Safely 'missing -AuthorizeMutation' }
if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($ConnectionStringEnv))) { Stop-Safely "connection string environment variable '$ConnectionStringEnv' is unavailable" }
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) { Stop-Safely 'psql is required for an explicitly authorized execution' }

$connectionString = [Environment]::GetEnvironmentVariable($ConnectionStringEnv)
$identityRows = @(
  & psql $connectionString --tuples-only --no-align --quiet --set ON_ERROR_STOP=1 --command "select coalesce(current_setting('app.cier_environment_id', true), '<missing>');"
)
if ($LASTEXITCODE -ne 0 -or $identityRows.Count -ne 1) { Stop-Safely 'database identity probe is absent or ambiguous' }
Assert-MahanaimTargetIdentity -TargetEnvironment $TargetEnvironment -ExpectedEnvironment $targetIdentity.Environment -ExpectedEnvironmentId $targetIdentity.EnvironmentId -ActualEnvironmentId ([string]$identityRows[0])

$values = ($days | ForEach-Object { "('$($_.Id)', $($_.DayNumber), '$($_.DayDate.ToString('yyyy-MM-dd'))')" }) -join ",`n  "
$sql = @"
DO `$guard`$
DECLARE
  expected_count integer := 10;
  matched_count integer;
  updated_count integer;
BEGIN
  WITH manifest(id, day_number, day_date) AS (
    VALUES
    $values
  ), checked AS (
    SELECT d.id FROM chapelle.mahanaim_retreat_days d
    JOIN manifest m ON m.id = d.id AND m.day_number = d.day_number
    WHERE d.retreat_id = '$retreatId'
  ) SELECT count(*) INTO matched_count FROM checked;
  IF matched_count <> expected_count THEN RAISE EXCEPTION 'rollback manifest mismatch: expected %, got %', expected_count, matched_count; END IF;
  UPDATE chapelle.mahanaim_retreat_days d SET day_date = m.day_date
  FROM manifest m
  WHERE d.id = m.id AND d.retreat_id = '$retreatId' AND d.day_number = m.day_number;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> expected_count THEN RAISE EXCEPTION 'rollback update mismatch: expected %, got %', expected_count, updated_count; END IF;
END
`$guard`$;
"@

$artifactDirectory = Join-Path $PSScriptRoot '..\..\..\..\tmp'
New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
$sqlPath = Join-Path $artifactDirectory 'mahanaim-calendar-rollback-authorized.sql'
Set-Content -LiteralPath $sqlPath -Value $sql -NoNewline
& psql $connectionString --set ON_ERROR_STOP=1 --single-transaction --file $sqlPath
if ($LASTEXITCODE -ne 0) { Stop-Safely 'psql rejected the rollback transaction; no partial calendar rollback is accepted' }
Write-Output 'ROLLBACK_MUTATION=EXECUTED'

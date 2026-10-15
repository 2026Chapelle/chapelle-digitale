$ErrorActionPreference = 'Stop'

$modulePath = Join-Path $PSScriptRoot 'mahanaim-target-identity.psm1'
$calendarScript = Join-Path $PSScriptRoot 'prepare-retreat-calendar.ps1'
$lotTmp = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\..\tmp'))

function Assert-Throws([scriptblock]$Action, [string]$Message) {
  try {
    & $Action
  } catch {
    return
  }
  throw "Expected failure: $Message"
}

Import-Module $modulePath -Force

Assert-Throws {
  Assert-MahanaimTargetIdentity -TargetEnvironment 'staging' -ExpectedEnvironment 'production' -ExpectedEnvironmentId 'prod-identity' -ActualEnvironmentId 'prod-identity'
} 'staging/prod inversion must stop'

Assert-Throws {
  Assert-MahanaimTargetIdentity -TargetEnvironment 'production' -ExpectedEnvironment 'production' -ExpectedEnvironmentId 'prod-identity' -ActualEnvironmentId ''
} 'missing database identity must stop'

Assert-Throws {
  Assert-MahanaimTargetIdentity -TargetEnvironment 'production' -ExpectedEnvironment 'production' -ExpectedEnvironmentId 'prod-identity' -ActualEnvironmentId 'unknown-identity'
} 'unknown database identity must stop'

New-Item -ItemType Directory -Path $lotTmp -Force | Out-Null
$calendarManifestPath = Join-Path $lotTmp 'mahanaim-calendar-invalid-test.json'
$identityManifestPath = Join-Path $lotTmp 'mahanaim-target-identity-test.json'

try {
  @{ retreatId = '11111111-1111-1111-1111-111111111111'; days = @() } |
    ConvertTo-Json -Depth 4 |
    Set-Content -LiteralPath $calendarManifestPath -NoNewline
  @{ environment = 'staging'; environmentId = 'staging-identity' } |
    ConvertTo-Json -Depth 4 |
    Set-Content -LiteralPath $identityManifestPath -NoNewline

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & powershell.exe -NoProfile -File $calendarScript -TargetEnvironment staging -ManifestPath $calendarManifestPath -IdentityManifestPath $identityManifestPath 2>$null
  $invalidManifestExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference
  if ($invalidManifestExitCode -eq 0) { throw 'Invalid calendar manifest unexpectedly succeeded' }

  $validDays = 1..10 | ForEach-Object {
    @{ id = ('00000000-0000-0000-0000-{0:d12}' -f $_); dayNumber = $_; dayDate = ('2026-10-{0:d2}' -f $_) }
  }
  @{ retreatId = '11111111-1111-1111-1111-111111111111'; days = $validDays } |
    ConvertTo-Json -Depth 4 |
    Set-Content -LiteralPath $calendarManifestPath -NoNewline

  $ErrorActionPreference = 'Continue'
  & powershell.exe -NoProfile -File $calendarScript -TargetEnvironment staging -ManifestPath $calendarManifestPath -IdentityManifestPath $identityManifestPath -Execute 2>$null
  $missingAuthorizationExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference
  if ($missingAuthorizationExitCode -eq 0) { throw 'Missing mutation authorization unexpectedly succeeded' }
} finally {
  Remove-Item -LiteralPath $calendarManifestPath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $identityManifestPath -Force -ErrorAction SilentlyContinue
}

Write-Output 'CALENDAR_SCRIPT_NEGATIVE_TESTS=PASS'

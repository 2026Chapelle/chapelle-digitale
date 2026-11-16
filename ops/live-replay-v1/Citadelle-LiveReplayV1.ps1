<#
  Citadelle Live & Replay V1 - pilote Windows PowerShell 5.1 (preflight / sauvegarde / activation / retour arriere)

  - Envoie le script bash correspondant (dossier .\remote) au serveur N0C via ssh, encode en base64
    (pas de stdin PowerShell, pas de CRLF, pas de substitution de processus, pas de /dev/fd).
  - Ecrit le rapport dans %USERPROFILE%\Desktop\CITADELLE\work\<Lot>\reports\ et le copie dans le presse-papiers.
  - Preflight : LECTURE SEULE. Backup / Activate / Rollback : simulation sauf si -Go <phrase exacte>,
    puis re-saisie interactive de la phrase.
  - Fichier volontairement en ASCII pur (PowerShell 5.1 lit les .ps1 sans BOM en ANSI).

  Exemples :
    .\Citadelle-LiveReplayV1.ps1 -Action SelfTest
    .\Citadelle-LiveReplayV1.ps1 -Action Preflight -PackagePath /home/frprszbd/releases/uploads/x.tar.gz -ExpectedPackageSha256 <sha>
    .\Citadelle-LiveReplayV1.ps1 -Action Backup
    .\Citadelle-LiveReplayV1.ps1 -Action Backup -Go GO-BACKUP-mOo2-hqdQzEOxdJn1siQz
#>
[CmdletBinding()]
param(
  [ValidateSet('SelfTest', 'Preflight', 'Backup', 'Activate', 'Rollback')]
  [string]$Action = 'Preflight',
  [string]$SshTarget = $(if ($env:CITADELLE_SSH) { $env:CITADELLE_SSH } else { 'citadelle-n0c' }),
  [int]$SshPort = 0,
  [string]$PackagePath = '',
  [string]$ExpectedPackageSha256 = '',
  [string]$ManifestPath = '',
  [string]$BackupArchive = '',
  [string]$BackupSha256 = '',
  [string]$StateFile = '',
  [string]$Go = '',
  [string]$Lot = 'LIVE-REPLAY-V1-PREACTIVATION',
  [string]$ActiveBuildId = 'mOo2-hqdQzEOxdJn1siQz',
  [string]$PreparedBuildId = 'w-q27AfjfpNh_tCWsSKH9',
  [string]$Commit = 'd1492c290552cf256be41ce2731023b86f774343',
  [string]$Staging = '/home/frprszbd/citadelle-staging/run10-d1492c2/prepared-fixed',
  [string]$App = '/home/frprszbd/citadelle',
  [switch]$NoClipboard
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$remoteDir = Join-Path $here 'remote'
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')

$PreflightChecks = @(
  'C01_TOOLS', 'C02_PROD_REAL_DIR', 'C03_PROD_BUILD_ID', 'C04_STAGING_STRUCTURE', 'C05_STAGING_BUILD_ID',
  'C06_PACKAGE_SHA256', 'C07_PACKAGE_BUILD_ID', 'C08_COMMIT', 'C09_PACKAGE_FILELIST', 'C10_PACKAGE_CONTENT',
  'C11_BUNDLE_GUARD', 'C12_SWAP_FEASIBLE', 'C13_CRON_INACTIVE', 'C14_PROTECTED_FILES'
)
$ScriptFor = @{ Preflight = 'preflight-runner.sh'; Backup = 'backup-prod.sh'; Activate = 'activate.sh'; Rollback = 'rollback.sh' }
$EndMarker = @{ Preflight = 'RUNNER_END'; Backup = 'BACKUP_END'; Activate = 'ACTIVATION_END'; Rollback = 'ROLLBACK_END' }

function Get-ReportDir {
  $d = Join-Path $env:USERPROFILE ('Desktop\CITADELLE\work\' + $Lot + '\reports')
  if (-not (Test-Path -LiteralPath $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
  return $d
}

function Assert-SafeValue([string]$name, [string]$value) {
  # Valeurs transmises au shell distant : caracteres surs uniquement (pas de guillemets ni d'espaces).
  if ($value -notmatch '^[A-Za-z0-9._/@:+=-]*$') { throw "Valeur refusee pour $name (caracteres non autorises): $value" }
}

function Get-RemoteScriptBase64([string]$file) {
  $path = Join-Path $remoteDir $file
  if (-not (Test-Path -LiteralPath $path)) { throw "Script distant introuvable: $path" }
  $text = [IO.File]::ReadAllText($path)
  $text = $text -replace "`r`n", "`n" -replace "`r", "`n"     # git autocrlf => LF obligatoire pour bash
  if ($text -match '<\(') { throw "$file contient une substitution de processus <( ) : interdit" }
  return [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($text))
}

function Get-RemoteEnv {
  $envs = [ordered]@{
    APP = $App; STAGING = $Staging; EXPECTED_ACTIVE_BUILD_ID = $ActiveBuildId
    EXPECTED_PREPARED_BUILD_ID = $PreparedBuildId; EXPECTED_COMMIT = $Commit
  }
  switch ($Action) {
    'Preflight' { $envs.PACKAGE_PATH = $PackagePath; $envs.EXPECTED_PACKAGE_SHA256 = $ExpectedPackageSha256; $envs.MANIFEST_PATH = $ManifestPath }
    'Backup' { $envs.CONFIRM = $Go }
    'Activate' { $envs.CONFIRM = $Go; $envs.BACKUP_ARCHIVE = $BackupArchive; $envs.BACKUP_SHA256 = $BackupSha256 }
    'Rollback' { $envs.CONFIRM = $Go; $envs.STATE = $StateFile }
  }
  $parts = @()
  foreach ($k in $envs.Keys) {
    $v = [string]$envs[$k]
    Assert-SafeValue $k $v
    $parts += ("{0}='{1}'" -f $k, $v)
  }
  return ($parts -join ' ')
}

function Invoke-Remote([string]$file) {
  $b64 = Get-RemoteScriptBase64 $file
  $remoteCmd = "printf %s $b64 | base64 -d | env $(Get-RemoteEnv) bash -s"
  if ($remoteCmd.Length -gt 30000) { throw "Commande distante trop longue ($($remoteCmd.Length) caracteres)" }
  if ($remoteCmd.Contains('"')) { throw 'Commande distante avec guillemet double : refuse (PS 5.1)' }
  $sshArgs = @('-n', '-o', 'ConnectTimeout=20')
  if ($SshPort -gt 0) { $sshArgs += @('-p', [string]$SshPort) }
  $sshArgs += @($SshTarget, $remoteCmd)
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    [Console]::OutputEncoding = [Text.Encoding]::UTF8
    $out = & ssh.exe @sshArgs 2>&1 | ForEach-Object { [string]$_ }
    $code = $LASTEXITCODE
  } finally { $ErrorActionPreference = $prevEap }
  if ($null -eq $out) { $out = @() }
  return @{ Lines = @($out); ExitCode = $code }
}

function Get-Verdict([string]$act, [string[]]$lines, [int]$exitCode) {
  $reasons = New-Object System.Collections.Generic.List[string]
  $checks = @{}
  foreach ($l in $lines) {
    if ($l -match '^CHECK\|([^|]+)\|(PASS|FAIL|WARN)\|') { $checks[$Matches[1]] = $Matches[2] }
  }
  $end = $lines | Where-Object { $_ -like ($EndMarker[$act] + '|*') } | Select-Object -Last 1
  if (-not $end) { $reasons.Add("marqueur $($EndMarker[$act]) absent (sortie tronquee ou ssh en echec)") }
  $failCount = @($checks.Values | Where-Object { $_ -eq 'FAIL' }).Count
  $passCount = @($checks.Values | Where-Object { $_ -eq 'PASS' }).Count
  if ($act -eq 'Preflight') {
    foreach ($id in $PreflightChecks) {
      if (-not $checks.ContainsKey($id)) { $reasons.Add("$id absent => FAIL") }
      elseif ($checks[$id] -ne 'PASS') { $reasons.Add("$id = $($checks[$id])") }
    }
    if ($exitCode -ne 0) { $reasons.Add("code de sortie distant $exitCode") }
    if ($end -and $end -notmatch '^RUNNER_END\|\d+\|0\|') { $reasons.Add("runner signale des FAIL: $end") }
    $verdict = if ($reasons.Count -eq 0) { 'PASS' } else { 'FAIL' }
    return @{ Verdict = $verdict; Pass = $passCount; Fail = $failCount + $(if ($verdict -eq 'FAIL' -and $failCount -eq 0) { 1 } else { 0 }); Reasons = $reasons }
  }
  $verdict = 'FAIL'
  if ($end -match '\|(PASS|DRY_RUN|NOOP)$' -and $exitCode -eq 0 -and $failCount -eq 0) { $verdict = $Matches[1] }
  elseif ($end -match '\|ROLLED_BACK$') { $verdict = 'ROLLED_BACK' }
  if ($verdict -eq 'FAIL' -and $exitCode -ne 0) { $reasons.Add("code de sortie distant $exitCode") }
  return @{ Verdict = $verdict; Pass = $passCount; Fail = $failCount; Reasons = $reasons }
}

function Write-Report([string]$act, [string[]]$lines, $v, [int]$exitCode) {
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine("CITADELLE LIVE & REPLAY V1 - $($act.ToUpper())")
  [void]$sb.AppendLine("DATE_UTC=$stamp")
  [void]$sb.AppendLine("SSH_TARGET=$SshTarget")
  [void]$sb.AppendLine("ACTIVE_BUILD_ID=$ActiveBuildId PREPARED_BUILD_ID=$PreparedBuildId COMMIT=$Commit")
  [void]$sb.AppendLine("VERDICT=$($v.Verdict) PASS=$($v.Pass) FAIL=$($v.Fail) EXIT=$exitCode")
  foreach ($r in $v.Reasons) { [void]$sb.AppendLine("REASON=$r") }
  [void]$sb.AppendLine('---- SORTIE DISTANTE ----')
  foreach ($l in $lines) { [void]$sb.AppendLine($l) }
  $text = $sb.ToString()
  $file = Join-Path (Get-ReportDir) ("{0}-{1}.txt" -f $act.ToLower(), $stamp)
  [IO.File]::WriteAllText($file, $text, (New-Object System.Text.UTF8Encoding($false)))
  if (-not $NoClipboard) { Set-Clipboard -Value $text }
  return $file
}

function Confirm-Go([string]$expected) {
  if ($Go -eq '') { Write-Host "Mode SIMULATION (aucune ecriture). Phrase pour executer : $expected" -ForegroundColor Yellow; return }
  if ($Go -ne $expected) { throw "Phrase GO incorrecte. Attendu : $expected" }
  $again = Read-Host "Confirmation : retapez exactement '$expected'"
  if ($again -ne $expected) { throw 'Confirmation refusee : aucune action distante.' }
}

function Invoke-SelfTest {
  $ok = $true
  foreach ($f in $ScriptFor.Values) {
    try { $b = Get-RemoteScriptBase64 $f; Write-Host ("OK   {0} ({1} car. base64)" -f $f, $b.Length) }
    catch { Write-Host "FAIL $f : $_" -ForegroundColor Red; $ok = $false }
  }
  $sample = @('CHECK|C01_TOOLS|PASS|x') + ($PreflightChecks | Select-Object -Skip 1 | ForEach-Object { "CHECK|$_|PASS|x" }) + @('RUNNER_END|14|0|0')
  $t1 = Get-Verdict 'Preflight' $sample 0
  $t2 = Get-Verdict 'Preflight' ($sample | Where-Object { $_ -notlike 'CHECK|C09*' }) 0
  $t3 = Get-Verdict 'Preflight' ($sample | Where-Object { $_ -notlike 'RUNNER_END*' }) 0
  $t4 = Get-Verdict 'Preflight' ($sample -replace 'C10_PACKAGE_CONTENT\|PASS', 'C10_PACKAGE_CONTENT|FAIL') 1
  $t5 = Get-Verdict 'Preflight' $sample 255
  $tests = @(
    @('complet => PASS', $t1.Verdict -eq 'PASS'), @('check manquant => FAIL', $t2.Verdict -eq 'FAIL'),
    @('sortie tronquee => FAIL', $t3.Verdict -eq 'FAIL'), @('check FAIL => FAIL', $t4.Verdict -eq 'FAIL'),
    @('ssh en echec => FAIL', $t5.Verdict -eq 'FAIL')
  )
  foreach ($t in $tests) { if ($t[1]) { Write-Host "OK   verdict: $($t[0])" } else { Write-Host "FAIL verdict: $($t[0])" -ForegroundColor Red; $ok = $false } }
  try { Assert-SafeValue 'X' "a'b"; Write-Host 'FAIL quote non refusee' -ForegroundColor Red; $ok = $false } catch { Write-Host 'OK   valeur avec apostrophe refusee' }
  if (Get-Command ssh.exe -ErrorAction SilentlyContinue) { Write-Host 'OK   ssh.exe present' } else { Write-Host 'FAIL ssh.exe absent (OpenSSH client Windows)' -ForegroundColor Red; $ok = $false }
  Write-Host ("PowerShell {0}" -f $PSVersionTable.PSVersion)
  if ($ok) { Write-Host 'SELFTEST=PASS' -ForegroundColor Green } else { Write-Host 'SELFTEST=FAIL' -ForegroundColor Red; exit 1 }
}

# ------------------------------------------------------------------ main
if ($Action -eq 'SelfTest') { Invoke-SelfTest; exit 0 }

switch ($Action) {
  'Preflight' {
    if (-not $PackagePath -or -not $ExpectedPackageSha256) { throw '-PackagePath et -ExpectedPackageSha256 sont obligatoires (sinon C06..C10 = FAIL).' }
    if ($Go) { throw 'Le preflight est en lecture seule : -Go interdit.' }
  }
  'Backup' { Confirm-Go "GO-BACKUP-$ActiveBuildId" }
  'Activate' {
    if (-not $BackupArchive -or -not $BackupSha256) { throw '-BackupArchive et -BackupSha256 obligatoires (sauvegarde GO prealable).' }
    Confirm-Go "GO-ACTIVATE-$PreparedBuildId"
  }
  'Rollback' {
    if (-not $StateFile) { throw '-StateFile obligatoire (ligne ROLLBACK_READY|STATE=... du rapport d''activation).' }
    Confirm-Go "GO-ROLLBACK-$ActiveBuildId"
  }
}

$res = Invoke-Remote $ScriptFor[$Action]
$v = Get-Verdict $Action $res.Lines $res.ExitCode
$file = Write-Report $Action $res.Lines $v $res.ExitCode
$color = if ($v.Verdict -in @('PASS', 'DRY_RUN', 'NOOP')) { 'Green' } else { 'Red' }
Write-Host ("{0} VERDICT={1} PASS={2} FAIL={3}" -f $Action.ToUpper(), $v.Verdict, $v.Pass, $v.Fail) -ForegroundColor $color
foreach ($r in $v.Reasons) { Write-Host "  - $r" -ForegroundColor $color }
Write-Host "Rapport : $file"
if (-not $NoClipboard) { Write-Host 'Rapport copie dans le presse-papiers.' }
if ($v.Verdict -in @('PASS', 'DRY_RUN', 'NOOP')) { exit 0 } else { exit 1 }

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

function Get-CodeLines([string]$text) {
  # Lignes de code bash numerotees. Seules les lignes de commentaire completes (# en premier
  # caractere non blanc) sont ignorees : un commentaire en fin de ligne n'est PAS retire, pour ne
  # jamais masquer une vraie substitution placee apres une chaine contenant " #".
  $out = New-Object System.Collections.Generic.List[string]
  $n = 0
  foreach ($line in ($text -split "`n")) {
    $n++
    if ($line -match '^\s*#') { continue }
    $out.Add(('{0}:{1}' -f $n, $line))
  }
  return $out.ToArray()
}

function Find-ProcessSubstitution([string]$text) {
  # Substitutions de processus <( ) et >( ) : interdites (dependance a /dev/fd).
  return @(Get-CodeLines $text | Where-Object { $_ -match '[<>]\(' })
}

function Get-RemoteScriptText([string]$file) {
  $path = Join-Path $remoteDir $file
  if (-not (Test-Path -LiteralPath $path)) { throw "Script distant introuvable: $path" }
  $text = [IO.File]::ReadAllText($path)
  return ($text -replace "`r`n", "`n" -replace "`r", "`n")     # git autocrlf => LF obligatoire pour bash
}

function Get-RemoteScriptBase64([string]$file) {
  $text = Get-RemoteScriptText $file
  $hits = @(Find-ProcessSubstitution $text)
  if ($hits.Count -gt 0) { throw ("$file contient une substitution de processus (ligne {0})" -f $hits[0]) }
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
  if (-not (Get-Command ssh.exe -ErrorAction SilentlyContinue)) { throw 'ssh.exe introuvable (client OpenSSH Windows)' }
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $global:LASTEXITCODE = -999          # sentinelle : si ssh ne fixe pas de code, le verdict sera FAIL
  $code = $null
  try {
    [Console]::OutputEncoding = [Text.Encoding]::UTF8
    $out = & ssh.exe @sshArgs 2>&1 | ForEach-Object { [string]$_ }
    $code = $global:LASTEXITCODE
  } finally { $ErrorActionPreference = $prevEap }
  if ($null -eq $out) { $out = @() }
  return @{ Lines = @($out); ExitCode = $code }
}

function Get-Verdict {
  param([string]$act, [object[]]$lines, [object]$exitCode)
  # Verdict strict : tout ce qui n'est pas explicitement conforme donne FAIL.
  $reasons = New-Object System.Collections.Generic.List[string]
  $rank = @{ PASS = 0; WARN = 1; FAIL = 2 }
  $checks = @{}
  $clean = New-Object System.Collections.Generic.List[string]
  foreach ($raw in @($lines)) {
    if ($null -ne $raw) { $clean.Add(([string]$raw).TrimEnd([char]13, [char]10)) }
  }
  foreach ($l in $clean) {
    $m = [regex]::Match($l, '^CHECK\|([^|]+)\|(PASS|FAIL|WARN)\|')
    if ($m.Success) {
      $id = $m.Groups[1].Value; $st = $m.Groups[2].Value
      # Un controle repete garde son pire etat : un PASS ulterieur ne masque jamais un FAIL.
      if (-not $checks.ContainsKey($id) -or $rank[$st] -gt $rank[$checks[$id]]) { $checks[$id] = $st }
    }
  }
  $marker = [string]$EndMarker[$act]
  $end = $null
  foreach ($l in $clean) { if ($l.StartsWith($marker + '|')) { $end = $l } }
  $ec = $null
  if ($exitCode -is [int]) { $ec = [int]$exitCode }
  $failIds = @($checks.Keys | Where-Object { $checks[$_] -eq 'FAIL' })
  $passIds = @($checks.Keys | Where-Object { $checks[$_] -eq 'PASS' })

  if ($null -eq $end) { $reasons.Add("marqueur $marker absent (sortie tronquee ou ssh en echec)") }
  if ($null -eq $ec) { $reasons.Add('code de sortie ssh inconnu') }
  elseif ($ec -ne 0) { $reasons.Add("code de sortie distant $ec") }
  foreach ($id in $failIds) { $reasons.Add("$id = FAIL") }

  $verdict = 'FAIL'
  if ($act -eq 'Preflight') {
    foreach ($id in $PreflightChecks) {
      if (-not $checks.ContainsKey($id)) { $reasons.Add("$id absent") }
      elseif ($checks[$id] -ne 'PASS') { if ($checks[$id] -ne 'FAIL') { $reasons.Add("$id = $($checks[$id])") } }
    }
    if (($null -ne $end) -and ($end -notmatch '^RUNNER_END\|\d+\|0\|\d+$')) { $reasons.Add("fin du runner non conforme : $end") }
    if ($reasons.Count -eq 0) { $verdict = 'PASS' }
  } else {
    $state = ''
    if ($null -ne $end) { $state = $end.Substring($marker.Length + 1) }
    if (($state -eq 'PASS' -or $state -eq 'DRY_RUN' -or $state -eq 'NOOP') -and $reasons.Count -eq 0) { $verdict = $state }
    elseif ($state -eq 'ROLLED_BACK') { $verdict = 'ROLLED_BACK' }
    elseif ($state -ne '') { $reasons.Add("fin : $state") }
  }
  if ($verdict -eq 'FAIL' -and $reasons.Count -eq 0) { $reasons.Add('verdict FAIL') }
  return New-Object psobject -Property @{
    Verdict = $verdict; Pass = $passIds.Count; Fail = $failIds.Count; Reasons = $reasons.ToArray()
  }
}

function Write-Report([string]$act, [string[]]$lines, $v, [object]$exitCode) {
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine("CITADELLE LIVE & REPLAY V1 - $($act.ToUpper())")
  [void]$sb.AppendLine("DATE_UTC=$stamp")
  [void]$sb.AppendLine("SSH_TARGET=$SshTarget")
  [void]$sb.AppendLine("ACTIVE_BUILD_ID=$ActiveBuildId PREPARED_BUILD_ID=$PreparedBuildId COMMIT=$Commit")
  [void]$sb.AppendLine("VERDICT=$($v.Verdict) PASS=$($v.Pass) FAIL=$($v.Fail) EXIT=$(if ($null -eq $exitCode) { 'inconnu' } else { $exitCode })")
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

function Test-Case([string]$name, [bool]$ok) {
  if ($ok) { Write-Host "OK   $name" } else { Write-Host "FAIL $name" -ForegroundColor Red }
  return $ok
}

function Invoke-SelfTest {
  # Retourne $true seulement si tous les tests passent. Aucun acces reseau, aucun ssh lance.
  $results = New-Object System.Collections.Generic.List[bool]

  foreach ($f in @('preflight-runner.sh', 'backup-prod.sh', 'activate.sh', 'rollback.sh')) {
    try { $b = Get-RemoteScriptBase64 $f; $results.Add((Test-Case ("{0} ({1} car. base64)" -f $f, $b.Length) $true)) }
    catch { $results.Add((Test-Case ("{0} : {1}" -f $f, $_.Exception.Message) $false)) }
  }

  # Detection des substitutions de processus : vraies => detectees, commentaires => ignores.
  $subst = @(
    @{ Name = 'subst: diff <(a) <(b) detecte'; Text = 'diff <(a) <(b)'; Expect = 1 },
    @{ Name = 'subst: tee >(gzip) detecte'; Text = 'tar c . | tee >(gzip > x)'; Expect = 1 },
    @{ Name = 'subst: indentee apres code detectee'; Text = "x=1`n  comm <(sort a) b"; Expect = 1 },
    @{ Name = 'subst: apres une chaine " #" detectee'; Text = "echo ' #'; cat <(ls)"; Expect = 1 },
    @{ Name = 'subst: commentaire pleine ligne ignore'; Text = "# AUCUNE substitution <(...)`n  # ni >(...)`nls"; Expect = 0 },
    @{ Name = 'subst: CRLF commentaire ignore'; Text = "# <(x)`r`nls`r`n"; Expect = 0 }
  )
  foreach ($c in $subst) {
    $t = ([string]$c.Text) -replace "`r`n", "`n"
    $n = @(Find-ProcessSubstitution $t).Count
    $results.Add((Test-Case $c.Name ($n -eq [int]$c.Expect)))
  }

  # Verdicts : nominal => PASS ; tout scenario defectueux => FAIL.
  $nominal = New-Object System.Collections.Generic.List[string]
  $nominal.Add('INFO|RUNNER_VERSION|x')
  foreach ($id in $PreflightChecks) { $nominal.Add("CHECK|$id|PASS|ok") }
  $nominal.Add(('RUNNER_END|{0}|0|0' -f $PreflightChecks.Count))
  $nom = $nominal.ToArray()
  $cases = @(
    @{ Name = 'preflight nominal => PASS'; Act = 'Preflight'; Lines = $nom; Exit = 0; Expect = 'PASS' },
    @{ Name = 'preflight nominal CRLF => PASS'; Act = 'Preflight'; Lines = @($nom | ForEach-Object { $_ + "`r" }); Exit = 0; Expect = 'PASS' },
    @{ Name = 'controle absent (C09) => FAIL'; Act = 'Preflight'; Lines = @($nom | Where-Object { $_ -notlike 'CHECK|C09_*' }); Exit = 0; Expect = 'FAIL' },
    @{ Name = 'sortie tronquee (sans RUNNER_END) => FAIL'; Act = 'Preflight'; Lines = @($nom | Where-Object { $_ -notlike 'RUNNER_END*' }); Exit = 0; Expect = 'FAIL' },
    @{ Name = 'sortie tronquee (moitie) => FAIL'; Act = 'Preflight'; Lines = @($nom | Select-Object -First 6); Exit = 0; Expect = 'FAIL' },
    @{ Name = 'controle FAIL (C10) => FAIL'; Act = 'Preflight'; Lines = @($nom -replace '^CHECK\|C10_PACKAGE_CONTENT\|PASS', 'CHECK|C10_PACKAGE_CONTENT|FAIL'); Exit = 1; Expect = 'FAIL' },
    @{ Name = 'controle FAIL masque par PASS duplique => FAIL'; Act = 'Preflight'; Lines = @(@('CHECK|C10_PACKAGE_CONTENT|FAIL|x') + $nom); Exit = 0; Expect = 'FAIL' },
    @{ Name = 'controle WARN => FAIL'; Act = 'Preflight'; Lines = @($nom -replace '^CHECK\|C13_CRON_INACTIVE\|PASS', 'CHECK|C13_CRON_INACTIVE|WARN'); Exit = 0; Expect = 'FAIL' },
    @{ Name = 'RUNNER_END avec FAIL>0 => FAIL'; Act = 'Preflight'; Lines = @($nom -replace '^RUNNER_END\|.*$', 'RUNNER_END|13|1|0'); Exit = 0; Expect = 'FAIL' },
    @{ Name = 'ssh en echec (255) => FAIL'; Act = 'Preflight'; Lines = $nom; Exit = 255; Expect = 'FAIL' },
    @{ Name = 'ssh sans code (null) => FAIL'; Act = 'Preflight'; Lines = $nom; Exit = $null; Expect = 'FAIL' },
    @{ Name = 'ssh sentinelle (-999) => FAIL'; Act = 'Preflight'; Lines = $nom; Exit = -999; Expect = 'FAIL' },
    @{ Name = 'aucune sortie => FAIL'; Act = 'Preflight'; Lines = @(); Exit = 0; Expect = 'FAIL' },
    @{ Name = 'sortie null => FAIL'; Act = 'Preflight'; Lines = $null; Exit = 0; Expect = 'FAIL' },
    @{ Name = 'backup simulation => DRY_RUN'; Act = 'Backup'; Lines = @('CHECK|PROD_BUILD_ID|PASS|x', 'BACKUP_END|DRY_RUN'); Exit = 0; Expect = 'DRY_RUN' },
    @{ Name = 'backup PASS => PASS'; Act = 'Backup'; Lines = @('CHECK|SHA256|PASS|x', 'BACKUP_END|PASS'); Exit = 0; Expect = 'PASS' },
    @{ Name = 'backup FAIL => FAIL'; Act = 'Backup'; Lines = @('RESULT|FAIL|x', 'BACKUP_END|FAIL'); Exit = 1; Expect = 'FAIL' },
    @{ Name = 'backup PASS mais ssh 255 => FAIL'; Act = 'Backup'; Lines = @('BACKUP_END|PASS'); Exit = 255; Expect = 'FAIL' },
    @{ Name = 'backup PASS avec un CHECK FAIL => FAIL'; Act = 'Backup'; Lines = @('CHECK|TAR|FAIL|x', 'BACKUP_END|PASS'); Exit = 0; Expect = 'FAIL' },
    @{ Name = 'activation tronquee => FAIL'; Act = 'Activate'; Lines = @('CHECK|SWITCH|PASS|x'); Exit = 0; Expect = 'FAIL' },
    @{ Name = 'activation annulee => ROLLED_BACK'; Act = 'Activate'; Lines = @('CHECK|HTTP_HOME|FAIL|500', 'ACTIVATION_END|ROLLED_BACK'); Exit = 1; Expect = 'ROLLED_BACK' },
    @{ Name = 'rollback deja en place => NOOP'; Act = 'Rollback'; Lines = @('ROLLBACK_END|NOOP'); Exit = 0; Expect = 'NOOP' }
  )
  foreach ($c in $cases) {
    $got = 'EXCEPTION'
    try { $got = [string](Get-Verdict ([string]$c.Act) $c.Lines $c.Exit).Verdict }
    catch { $got = 'EXCEPTION: ' + $_.Exception.Message }
    $results.Add((Test-Case ("verdict: {0} (obtenu {1})" -f $c.Name, $got) ($got -ceq [string]$c.Expect)))
  }

  $refused = $false
  try { Assert-SafeValue 'X' "a'b" } catch { $refused = $true }
  $results.Add((Test-Case 'valeur avec apostrophe refusee' $refused))
  $results.Add((Test-Case 'ssh.exe present' ($null -ne (Get-Command ssh.exe -ErrorAction SilentlyContinue))))

  $failed = @($results | Where-Object { -not $_ }).Count
  Write-Host ("PowerShell {0} ; tests={1} echecs={2}" -f $PSVersionTable.PSVersion, $results.Count, $failed)
  return ($failed -eq 0 -and $results.Count -gt 0)
}

# ------------------------------------------------------------------ main
if ($Action -eq 'SelfTest') {
  $ok = $false
  try {
    $r = @(Invoke-SelfTest)
    # Exactement un booleen $true attendu : toute sortie parasite de la fonction donne FAIL.
    $ok = ($r.Count -eq 1) -and ($r[0] -is [bool]) -and $r[0]
  } catch { Write-Host ("SELFTEST exception : {0}" -f $_.Exception.Message) -ForegroundColor Red; $ok = $false }
  if ($ok) { Write-Host 'SELFTEST=PASS' -ForegroundColor Green; exit 0 }
  Write-Host 'SELFTEST=FAIL' -ForegroundColor Red
  exit 1
}

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
$color = 'Red'
if ($v.Verdict -in @('PASS', 'DRY_RUN', 'NOOP')) { $color = 'Green' }
Write-Host ("{0} VERDICT={1} PASS={2} FAIL={3}" -f $Action.ToUpper(), $v.Verdict, $v.Pass, $v.Fail) -ForegroundColor $color
foreach ($r in $v.Reasons) { Write-Host "  - $r" -ForegroundColor $color }
Write-Host "Rapport : $file"
if (-not $NoClipboard) { Write-Host 'Rapport copie dans le presse-papiers.' }
if ($v.Verdict -in @('PASS', 'DRY_RUN', 'NOOP')) { exit 0 } else { exit 1 }

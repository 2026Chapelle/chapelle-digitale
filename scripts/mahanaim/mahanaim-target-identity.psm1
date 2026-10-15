Set-StrictMode -Version Latest

function Stop-MahanaimTargetIdentity([string]$Reason) {
  throw "MAHANAIM_TARGET_IDENTITY_STOP: $Reason"
}

function Read-MahanaimTargetIdentityManifest([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    Stop-MahanaimTargetIdentity 'identity manifest not found'
  }

  try {
    $manifest = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  } catch {
    Stop-MahanaimTargetIdentity 'identity manifest is not valid JSON'
  }

  if ($null -eq $manifest.environment -or $null -eq $manifest.environmentId) {
    Stop-MahanaimTargetIdentity 'identity manifest must contain environment and environmentId'
  }

  $environment = [string]$manifest.environment
  $environmentId = [string]$manifest.environmentId
  if ($environment -notin @('staging', 'production')) {
    Stop-MahanaimTargetIdentity 'identity manifest environment is unknown'
  }
  if ($environmentId -notmatch '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$') {
    Stop-MahanaimTargetIdentity 'identity manifest environmentId is invalid'
  }

  return [pscustomobject]@{ Environment = $environment; EnvironmentId = $environmentId }
}

function Assert-MahanaimTargetIdentity(
  [ValidateSet('staging', 'production')]
  [string]$TargetEnvironment,
  [ValidateSet('staging', 'production')]
  [string]$ExpectedEnvironment,
  [string]$ExpectedEnvironmentId,
  [string]$ActualEnvironmentId
) {
  if ($TargetEnvironment -ne $ExpectedEnvironment) {
    Stop-MahanaimTargetIdentity 'target environment does not match the approved identity manifest'
  }
  if ([string]::IsNullOrWhiteSpace($ExpectedEnvironmentId)) {
    Stop-MahanaimTargetIdentity 'approved environment identity is absent'
  }
  if ([string]::IsNullOrWhiteSpace($ActualEnvironmentId) -or $ActualEnvironmentId -eq '<missing>') {
    Stop-MahanaimTargetIdentity 'database environment identity is absent'
  }
  if ($ActualEnvironmentId -ne $ExpectedEnvironmentId) {
    Stop-MahanaimTargetIdentity 'database environment identity does not match the approved manifest'
  }
}

Export-ModuleMember -Function Read-MahanaimTargetIdentityManifest, Assert-MahanaimTargetIdentity

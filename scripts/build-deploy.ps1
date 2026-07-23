# Assemble deploy-citadelle/ depuis le build standalone FRAIS (.next/standalone),
# puis régénère deploy-citadelle.zip (slashs Linux) via make-zip.ps1.
#
# Prérequis : `npm run build` a été lancé (génère .next/standalone + .next/static).
# node_modules est TOUJOURS regénéré depuis .next/standalone/node_modules (jamais
# réutilisé tel quel) : un arbre partiellement copié ou périmé casse le runtime
# Passenger (ex. MODULE_NOT_FOUND sur next/dist/server/node-polyfill-crypto.js).
$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$standalone = Join-Path $root '.next\standalone'
$deploy = Join-Path $root 'deploy-citadelle'

if (-not (Test-Path (Join-Path $standalone 'server.js'))) {
  throw "Build standalone introuvable. Lancez 'npm run build' d'abord."
}

Write-Host '1/5  .next (server + manifests)...'
$deployNext = Join-Path $deploy '.next'
if (-not (Test-Path $deployNext)) { New-Item -ItemType Directory -Path $deployNext | Out-Null }
if (Test-Path (Join-Path $deployNext 'server')) { Remove-Item (Join-Path $deployNext 'server') -Recurse -Force }
Copy-Item (Join-Path $standalone '.next\*') $deployNext -Recurse -Force

Write-Host '2/5  .next\static (assets hashés)...'
$deployStatic = Join-Path $deployNext 'static'
if (Test-Path $deployStatic) { Remove-Item $deployStatic -Recurse -Force }
Copy-Item (Join-Path $root '.next\static') $deployStatic -Recurse -Force

Write-Host '3/5  server.js + package.json...'
Copy-Item (Join-Path $standalone 'server.js') (Join-Path $deploy 'server.js') -Force
Copy-Item (Join-Path $standalone 'package.json') (Join-Path $deploy 'package.json') -Force

Write-Host '4/5  public/...'
$deployPublic = Join-Path $deploy 'public'
if (Test-Path $deployPublic) { Remove-Item $deployPublic -Recurse -Force }
Copy-Item (Join-Path $root 'public') $deployPublic -Recurse -Force

Write-Host '5/5  node_modules (regeneration complete)...'
$deployNodeModules = Join-Path $deploy 'node_modules'
if (Test-Path $deployNodeModules) { Remove-Item $deployNodeModules -Recurse -Force }
Copy-Item (Join-Path $standalone 'node_modules') $deployNodeModules -Recurse -Force

$buildId = (Get-Content (Join-Path $deployNext 'BUILD_ID') -Raw).Trim()
Write-Host ("deploy-citadelle rafraichi - BUILD_ID = " + $buildId)
Write-Host 'Zippage...'
& (Join-Path $root 'scripts\make-zip.ps1')

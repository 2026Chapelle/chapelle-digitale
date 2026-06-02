# Crée deploy-citadelle.zip avec des chemins en SLASH '/' (compatible Linux/PlanetHoster).
# Contourne le bug de Compress-Archive (PowerShell 5.1) qui écrit des antislashs.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$src = (Resolve-Path 'deploy-citadelle').Path
$zipPath = Join-Path (Get-Location) 'deploy-citadelle.zip'
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  $files = Get-ChildItem -LiteralPath $src -Recurse -File
  $n = 0
  foreach ($f in $files) {
    $rel = $f.FullName.Substring($src.Length + 1).Replace('\','/')   # FORCER les slashs
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip, $f.FullName, $rel,
      [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    $n++
  }
  "Entrées ajoutées : $n"
} finally {
  $zip.Dispose()
}
$z = Get-Item $zipPath
"ZIP : $($z.FullName) | {0:N1} Mo" -f ($z.Length/1MB)

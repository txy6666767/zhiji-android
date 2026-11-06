$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$webRoot = Split-Path -Parent $projectRoot
$assetRoot = Join-Path $projectRoot "app\src\main\assets"
New-Item -ItemType Directory -Force $assetRoot | Out-Null

$files = @(
  "index.html",
  "styles.css",
  "app.js",
  "data.js",
  "question-data.js",
  "icon.svg",
  "manifest.webmanifest",
  "sw.js"
)

foreach ($file in $files) {
  Copy-Item -LiteralPath (Join-Path $webRoot $file) -Destination $assetRoot -Force
}

Write-Host "Web assets synced to Android assets."

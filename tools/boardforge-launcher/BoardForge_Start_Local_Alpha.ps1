$ErrorActionPreference = "Stop"
$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repo

Write-Host "BoardForge local alpha"
Write-Host "Repo: $repo"

& (Join-Path $PSScriptRoot "BoardForge_Check_Environment.ps1")

if (-not (Test-Path (Join-Path $repo "node_modules"))) {
  Write-Host "Installing npm dependencies..."
  npm install
}

Write-Host "Starting BoardForge local engine bridge"
npm run boardforge:start

Write-Host "Run BoardForge_Open_Dashboard.cmd to open the dashboard or pair the live site."

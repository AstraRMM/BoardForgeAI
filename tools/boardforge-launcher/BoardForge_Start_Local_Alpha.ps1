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

Write-Host "Starting BoardForge web dashboard at http://localhost:3000"
npm run dev:web

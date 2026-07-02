$ErrorActionPreference = "Stop"
$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$installMarker = Join-Path $repo "BoardForge_Local_Alpha_Install_Report.md"

$lines = @(
  "# BoardForge Local Alpha Install Report",
  "",
  "- repo: $repo",
  "- install mode: local development workspace",
  "- npm install required: $(if (Test-Path (Join-Path $repo 'node_modules')) { 'no' } else { 'yes' })",
  "- dashboard command: npm run dev:web",
  "- demo command: npm run boardforge:demo",
  "",
  "This script records local alpha setup state. It does not install a production service or modify protected ESC/FC projects."
)

Set-Content -LiteralPath $installMarker -Value ($lines -join "`r`n") -Encoding UTF8
Write-Output "BoardForge local alpha install report written: $installMarker"

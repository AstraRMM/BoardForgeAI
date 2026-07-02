$ErrorActionPreference = "Continue"
$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$source = Join-Path $repo "kicad-plugin\boardforge_action_plugin.py"
$report = Join-Path $repo "BoardForge_KiCad_Plugin_Install_Report.md"
$candidateDirs = @(
  (Join-Path $env:APPDATA "kicad\scripting\plugins"),
  (Join-Path $env:APPDATA "KiCad\scripting\plugins"),
  (Join-Path $env:USERPROFILE "Documents\KiCad\plugins")
)

$existing = $candidateDirs | Where-Object { Test-Path $_ } | Select-Object -First 1
$demo = $args -contains "--demo"

$lines = @(
  "# BoardForge KiCad Plugin Install Report",
  "",
  "- plugin source: $source",
  "- detected plugin folder: $(if ($existing) { $existing } else { 'not found' })",
  "- copied: false",
  "",
  "The helper does not force install when the KiCad plugin folder is unknown. Use `--demo` to copy into a detected folder."
)

if ($existing -and $demo) {
  Copy-Item -LiteralPath $source -Destination (Join-Path $existing "boardforge_action_plugin.py") -Force
  $lines[3] = "- copied: true"
}

Set-Content -LiteralPath $report -Value ($lines -join "`r`n") -Encoding UTF8
Write-Output "BoardForge KiCad plugin install report written: $report"

$ErrorActionPreference = "Continue"
$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$report = Join-Path $repo "BoardForge_Local_Alpha_Uninstall_Report.md"

$lines = @(
  "# BoardForge Local Alpha Uninstall Report",
  "",
  "- repo: $repo",
  "- action: report-only",
  "- removed files: none",
  "",
  "Manual cleanup can remove local build artifacts such as .next, dist, and tmp after review. This script does not delete project fixtures or protected user projects."
)

Set-Content -LiteralPath $report -Value ($lines -join "`r`n") -Encoding UTF8
Write-Output "BoardForge local alpha uninstall report written: $report"

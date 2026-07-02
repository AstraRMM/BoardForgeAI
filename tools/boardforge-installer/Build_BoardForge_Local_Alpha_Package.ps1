$ErrorActionPreference = "Stop"
$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$packageRoot = Join-Path $repo "dist\BoardForge_Local_Alpha"
$report = Join-Path $repo "BoardForge_Code_Signing_Status_Report.md"

New-Item -ItemType Directory -Force -Path $packageRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $packageRoot "tools") | Out-Null
Copy-Item -Recurse -Force -Path (Join-Path $repo "tools\boardforge-launcher") -Destination (Join-Path $packageRoot "tools\boardforge-launcher")

$cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert -ErrorAction SilentlyContinue | Select-Object -First 1
$signed = [bool]$cert

$lines = @(
  "# BoardForge Code Signing Status Report",
  "",
  "- package: $packageRoot",
  "- installerSigned: $signed",
  "- alphaStatus: $(if ($signed) { 'SIGNED_LOCAL_ALPHA_PACKAGE' } else { 'UNSIGNED_LOCAL_ALPHA_PACKAGE' })",
  "- certificate: $(if ($cert) { $cert.Subject } else { 'missing' })",
  "",
  "No production-ready installer claim is made without a real code-signing certificate."
)

Set-Content -LiteralPath $report -Value ($lines -join "`r`n") -Encoding UTF8
Write-Output "BoardForge local alpha package staged: $packageRoot"

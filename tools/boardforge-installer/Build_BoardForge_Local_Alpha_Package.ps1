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

$readme = @(
  "# BoardForge Public Alpha Launcher",
  "",
  "Status: INSTALLER_READY_UNSIGNED_PUBLIC_ALPHA",
  "",
  "This package starts and checks the local BoardForge engine bridge. It is unsigned for public alpha until a real code-signing certificate is available.",
  "",
  "## Start",
  "Run tools\boardforge-launcher\BoardForge_Start_Local_Alpha.cmd",
  "",
  "## Check",
  "Run tools\boardforge-launcher\BoardForge_Check_Environment.ps1",
  "",
  "## Open Site",
  "Run tools\boardforge-launcher\BoardForge_Open_Dashboard.cmd and pair the live site with the localhost engine.",
  "",
  "No secrets, token stores, .env.local, .boardforge, ESC, or FC projects are included."
)
Set-Content -LiteralPath (Join-Path $packageRoot "README_PUBLIC_ALPHA.md") -Value ($readme -join "`r`n") -Encoding UTF8

$limitations = @(
  "# BoardForge Public Alpha Known Limitations",
  "",
  "- Installer is unsigned until a code-signing certificate is provided.",
  "- PoE compliance/certification is not claimed; BoardForge only prepares a human-review package.",
  "- DigiKey ProductInformation V4 live sourcing is supported; direct Quote API support is only marked ready after a live endpoint succeeds.",
  "- FreeRouting JAR workflow is optional and requires Java plus a configured JAR path.",
  "- BoardForge does not guarantee manufacturability; DRC/ERC/export evidence must be reviewed."
)
Set-Content -LiteralPath (Join-Path $packageRoot "KNOWN_LIMITATIONS.md") -Value ($limitations -join "`r`n") -Encoding UTF8

$signing = @(
  "# Installer Signing Readiness",
  "",
  "- Current status: INSTALLER_READY_UNSIGNED_PUBLIC_ALPHA",
  "- Certificate needed: Windows Authenticode code-signing certificate.",
  "- External blocker: no signing certificate is available in this repo.",
  "- Once certificate exists: run SignTool or a release pipeline against launcher scripts and packaged installer artifacts.",
  "",
  "No signed-installer claim is made by this package."
)
Set-Content -LiteralPath (Join-Path $packageRoot "INSTALLER_SIGNING_READINESS.md") -Value ($signing -join "`r`n") -Encoding UTF8

$kicad = @(
  "# KiCad Plugin Install Notes",
  "",
  "1. Install BoardForge local alpha package.",
  "2. Start the local engine bridge.",
  "3. In KiCad, install the BoardForge plugin package when the signed/public plugin package is published.",
  "4. The web app and plugin should talk to the local engine; KiCad files stay local unless explicitly published."
)
Set-Content -LiteralPath (Join-Path $packageRoot "KICAD_PLUGIN_INSTALL.md") -Value ($kicad -join "`r`n") -Encoding UTF8

$pairing = @(
  "# Live Site Pairing",
  "",
  "1. Run npm run boardforge:start or the launcher start script.",
  "2. Run npm run boardforge:doctor and confirm local engine bridge is ONLINE.",
  "3. Open https://www.boardforge-ai.com and use setup/local pairing.",
  "4. Supplier credentials remain local and are never copied into the browser package."
)
Set-Content -LiteralPath (Join-Path $packageRoot "LIVE_SITE_PAIRING.md") -Value ($pairing -join "`r`n") -Encoding UTF8

Write-Output "BoardForge local alpha package staged: $packageRoot"

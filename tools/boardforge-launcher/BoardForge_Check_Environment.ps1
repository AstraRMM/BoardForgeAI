$ErrorActionPreference = "Continue"

$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$report = Join-Path $repo "BoardForge_Local_Alpha_Environment_Report.md"

function Test-Command($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

$node = Test-Command "node"
$npm = Test-Command "npm"
$java = Test-Command "java"
$kicad = Test-Command "kicad"
$pcbnew = Test-Command "pcbnew"
$freeroutingJar = Get-ChildItem -Path $repo -Filter "*freerouting*.jar" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
$nodeModules = Test-Path (Join-Path $repo "node_modules")
$nextBuild = Test-Path (Join-Path $repo ".next")

$supplierKeys = @(
  "DIGIKEY_CLIENT_ID",
  "DIGIKEY_CLIENT_SECRET",
  "MOUSER_API_KEY",
  "LCSC_API_KEY",
  "JLCPCB_API_KEY"
) | ForEach-Object {
  [PSCustomObject]@{ Name = $_; Present = [bool](Get-Item "env:$_" -ErrorAction SilentlyContinue) }
}

$lines = @(
  "# BoardForge Local Alpha Environment Report",
  "",
  "- repo: $repo",
  "- node: $(if ($node) { $node } else { 'missing' })",
  "- npm: $(if ($npm) { $npm } else { 'missing' })",
  "- npm install completed: $nodeModules",
  "- KiCad command: $(if ($kicad) { $kicad } elseif ($pcbnew) { $pcbnew } else { 'missing' })",
  "- Java: $(if ($java) { $java } else { 'missing' })",
  "- FreeRouting jar: $(if ($freeroutingJar) { $freeroutingJar.FullName } else { 'missing' })",
  "- web build present: $nextBuild",
  "- local engine: npm scripts available",
  "",
  "## Supplier API Keys",
  ""
)

foreach ($key in $supplierKeys) {
  $presence = if ($key.Present) { "present" } else { "missing" }
  $lines += "- $($key.Name): $presence"
}

$lines += @(
  "",
  "Missing KiCad, Java, FreeRouting, or supplier keys are reported honestly. BoardForge does not fake routing, sourcing, stock, assembly availability, or compliance.",
  "",
  "Next local commands:",
  "",
  "- npm install",
  "- npm run build:web",
  "- npm run boardforge:demo",
  "- npm run dev:web"
)

Set-Content -LiteralPath $report -Value ($lines -join "`r`n") -Encoding UTF8
Write-Output "BoardForge environment report written: $report"

#!/usr/bin/env node
import { access, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const packageDir = path.resolve('dist/BoardForge_Local_Alpha')
const microsoftPackageDir = path.resolve('C:/Users/luifi/Desktop/BoardForge_Public_Alpha_Demo_Package/microsoft-store-package')
const required = [
  'tools/boardforge-launcher/BoardForge_Start_Local_Alpha.cmd',
  'tools/boardforge-launcher/BoardForge_Start_Local_Alpha.ps1',
  'tools/boardforge-launcher/BoardForge_Open_Dashboard.cmd',
  'tools/boardforge-launcher/BoardForge_Check_Environment.ps1',
  'README_PUBLIC_ALPHA.md',
  'KNOWN_LIMITATIONS.md',
  'INSTALLER_SIGNING_READINESS.md',
  'KICAD_PLUGIN_INSTALL.md',
  'LIVE_SITE_PAIRING.md',
]

const files = await listFiles(packageDir).catch(() => [])
const checks = []
for (const rel of required) {
  checks.push({ file: rel, exists: await exists(path.join(packageDir, rel)) })
}
const microsoftChecks = await checkMicrosoftPackage()
const secretHits = []
for (const file of files) {
  const body = await readFile(file, 'utf8').catch(() => '')
  if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|sk-or-v1-|AQ\.[A-Za-z0-9_-]+|"access_token"\s*:|"refresh_token"\s*:|DIGIKEY_CLIENT_SECRET=|MOUSER_API_KEY=/i.test(body)) {
    secretHits.push(path.relative(packageDir, file))
  }
}

const report = {
  status: checks.every((item) => item.exists) && microsoftChecks.ready && secretHits.length === 0 ? 'INSTALLER_READY_UNSIGNED_CERT_REQUIRED' : 'INSTALLER_PACKAGE_REVIEW_REQUIRED',
  packageDir,
  microsoftPackageDir,
  required: checks,
  microsoftStorePackage: microsoftChecks,
  secretScan: secretHits.length ? { status: 'POTENTIAL_SECRET_PATTERN_FOUND', files: secretHits } : { status: 'NO_SECRET_PATTERN_FOUND', files: [] },
  signed: false,
  signingBlocker: 'No code-signing certificate is bundled or assumed. Microsoft Store package is unsigned until a trusted Authenticode certificate or Microsoft Trusted Signing is configured.',
  generatedAt: new Date().toISOString(),
}

await writeFile('BoardForge_Installer_Check_Report.json', JSON.stringify(report, null, 2), 'utf8')
await writeFile('BoardForge_Installer_Check_Report.md', render(report), 'utf8')
console.log(JSON.stringify(report, null, 2))
process.exit(report.status === 'INSTALLER_READY_UNSIGNED_CERT_REQUIRED' ? 0 : 1)

async function exists(file) {
  try { await access(file); return true } catch { return false }
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const out = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...await listFiles(full))
    else out.push(full)
  }
  return out
}

async function checkMicrosoftPackage() {
  const manifestFile = path.join(microsoftPackageDir, 'BoardForge_Microsoft_Store_Package_Manifest.json')
  const manifestExists = await exists(manifestFile)
  const manifest = manifestExists ? JSON.parse(await readFile(manifestFile, 'utf8')) : null
  const installerExists = manifest?.installerFileName
    ? await exists(path.join(microsoftPackageDir, manifest.installerFileName))
    : false
  const checksumExists = manifest?.installerFileName
    ? await exists(path.join(microsoftPackageDir, `${manifest.installerFileName}.sha256`))
    : false
  const silentPassed = manifest?.silentInstall?.status === 'SILENT_INSTALL_AND_UNINSTALL_PASSED'
  return {
    ready: Boolean(manifestExists && installerExists && checksumExists && silentPassed && manifest?.status === 'INSTALLER_READY_UNSIGNED_CERT_REQUIRED'),
    manifestExists,
    installerExists,
    checksumExists,
    silentPassed,
    status: manifest?.status ?? 'MISSING',
    installerFileName: manifest?.installerFileName ?? null,
    packageUrl: manifest?.packageUrl ?? null,
    installerParameters: manifest?.installerParameters ?? null,
  }
}

function render(report) {
  return [
    '# BoardForge Installer Check Report',
    '',
    `- Status: ${report.status}`,
    `- Package: ${report.packageDir}`,
    `- Signed: ${report.signed}`,
    `- Secret scan: ${report.secretScan.status}`,
    `- Microsoft Store package: ${report.microsoftStorePackage.status}`,
    `- Installer file: ${report.microsoftStorePackage.installerFileName || 'missing'}`,
    `- Silent package test: ${report.microsoftStorePackage.silentPassed ? 'PASS' : 'REVIEW'}`,
    '',
    '## Required Files',
    ...report.required.map((item) => `- ${item.exists ? 'PASS' : 'MISSING'}: ${item.file}`),
    '',
    '## Signing',
    `- ${report.signingBlocker}`,
    '',
  ].join('\n')
}

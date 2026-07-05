#!/usr/bin/env node
import { access, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const packageDir = path.resolve('dist/BoardForge_Local_Alpha')
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
const secretHits = []
for (const file of files) {
  const body = await readFile(file, 'utf8').catch(() => '')
  if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|sk-or-v1-|AQ\.[A-Za-z0-9_-]+|"access_token"\s*:|"refresh_token"\s*:|DIGIKEY_CLIENT_SECRET=|MOUSER_API_KEY=/i.test(body)) {
    secretHits.push(path.relative(packageDir, file))
  }
}

const report = {
  status: checks.every((item) => item.exists) && secretHits.length === 0 ? 'INSTALLER_READY_UNSIGNED_PUBLIC_ALPHA' : 'INSTALLER_PACKAGE_REVIEW_REQUIRED',
  packageDir,
  required: checks,
  secretScan: secretHits.length ? { status: 'POTENTIAL_SECRET_PATTERN_FOUND', files: secretHits } : { status: 'NO_SECRET_PATTERN_FOUND', files: [] },
  signed: false,
  signingBlocker: 'No code-signing certificate is bundled or assumed.',
  generatedAt: new Date().toISOString(),
}

await writeFile('BoardForge_Installer_Check_Report.json', JSON.stringify(report, null, 2), 'utf8')
await writeFile('BoardForge_Installer_Check_Report.md', render(report), 'utf8')
console.log(JSON.stringify(report, null, 2))
process.exit(report.status === 'INSTALLER_READY_UNSIGNED_PUBLIC_ALPHA' ? 0 : 1)

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

function render(report) {
  return [
    '# BoardForge Installer Check Report',
    '',
    `- Status: ${report.status}`,
    `- Package: ${report.packageDir}`,
    `- Signed: ${report.signed}`,
    `- Secret scan: ${report.secretScan.status}`,
    '',
    '## Required Files',
    ...report.required.map((item) => `- ${item.exists ? 'PASS' : 'MISSING'}: ${item.file}`),
    '',
    '## Signing',
    `- ${report.signingBlocker}`,
    '',
  ].join('\n')
}

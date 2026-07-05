#!/usr/bin/env node
import { access, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const launcherDir = path.resolve('tools/boardforge-launcher')
const checks = [
  ['start_cmd', 'BoardForge_Start_Local_Alpha.cmd', /boardforge:start|BoardForge_Start_Local_Alpha/i],
  ['start_ps1', 'BoardForge_Start_Local_Alpha.ps1', /boardforge:start|boardforge:doctor/i],
  ['open_dashboard', 'BoardForge_Open_Dashboard.cmd', /boardforge-ai|localhost|http/i],
  ['doctor', 'BoardForge_Check_Environment.ps1', /boardforge:doctor|check-environment/i],
  ['kicad_install_docs', 'BoardForge_Install_KiCad_Plugin.ps1', /KiCad|plugin/i],
]

const results = []
for (const [id, file, pattern] of checks) {
  const full = path.join(launcherDir, file)
  const exists = await fileExists(full)
  const body = exists ? await readFile(full, 'utf8').catch(() => '') : ''
  results.push({ id, file, exists, contentLooksValid: exists && pattern.test(body) })
}

const report = {
  status: results.every((item) => item.exists && item.contentLooksValid) ? 'BOARD_FORGE_LAUNCHER_SMOKE_TEST_PASSED' : 'BOARD_FORGE_LAUNCHER_SMOKE_TEST_REVIEW_REQUIRED',
  launcherDir,
  results,
  generatedAt: new Date().toISOString(),
}

await writeFile('BoardForge_Launcher_Smoke_Test_Report.json', JSON.stringify(report, null, 2), 'utf8')
await writeFile('BoardForge_Launcher_Smoke_Test_Report.md', [
  '# BoardForge Launcher Smoke Test',
  '',
  `- Status: ${report.status}`,
  '',
  ...results.map((item) => `- ${item.exists && item.contentLooksValid ? 'PASS' : 'REVIEW'}: ${item.file}`),
  '',
].join('\n'), 'utf8')
console.log(JSON.stringify(report, null, 2))
process.exit(report.status.endsWith('PASSED') ? 0 : 1)

async function fileExists(file) {
  try { await access(file); return true } catch { return false }
}

import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { evaluateAlphaLaunchGate } from './alpha-launch-gate.mjs'

export async function writeAlphaLaunchReport({ rootDir }) {
  await mkdir(rootDir, { recursive: true })
  const report = evaluateAlphaLaunchGate()
  const jsonPath = path.join(rootDir, 'BoardForge_Public_Alpha_Launch_Report.json')
  const mdPath = path.join(rootDir, 'BoardForge_Public_Alpha_Launch_Report.md')
  await writeFile(jsonPath, JSON.stringify(report, null, 2))
  await writeFile(mdPath, [
    '# BoardForge Public Alpha Launch Gate',
    '',
    `Status: ${report.status}`,
    '',
    '## Categories',
    ...Object.entries(report.categories).map(([name, value]) => `- ${value ? 'PASS' : 'LIMITATION'}: ${name}`),
    '',
    '## External Blockers',
    ...report.externalBlockers.map((blocker) => `- ${blocker}`),
    '',
    '## Limitations',
    ...report.limitations.map((limitation) => `- ${limitation}`),
    '',
  ].join('\n'))
  return { status: 'BOARD_FORGE_PUBLIC_ALPHA_LAUNCH_REPORT_WRITTEN', report, artifactPaths: [jsonPath, mdPath] }
}

import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { evaluateAlphaLaunchGate } from './alpha-launch-gate.mjs'

const ALPHA_LAUNCH_REPORT_FILENAME = 'BoardForge_Public_Alpha_Launch_Report.json'

export async function writeAlphaLaunchReport({ rootDir }) {
  await mkdir(rootDir, { recursive: true })
  const report = evaluateAlphaLaunchGate()
  const jsonPath = path.join(rootDir, ALPHA_LAUNCH_REPORT_FILENAME)
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

/** Read the previously recorded launch-gate result without recalculating or writing it. */
export async function readAlphaLaunchReport({ rootDir }) {
  try {
    const report = JSON.parse(await readFile(path.join(rootDir, ALPHA_LAUNCH_REPORT_FILENAME), 'utf8'))
    return {
      status: 'BOARD_FORGE_PUBLIC_ALPHA_LAUNCH_REPORT_RECORDED',
      report: publicLaunchReport(report),
    }
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        status: 'BOARD_FORGE_PUBLIC_ALPHA_LAUNCH_REPORT_NOT_RECORDED',
        report: {
          status: 'BOARD_FORGE_PUBLIC_ALPHA_LAUNCH_REPORT_NOT_RECORDED',
          categories: {},
          externalBlockers: [],
          limitations: ['No local launch-gate report has been recorded yet.'],
          localOnly: true,
        },
      }
    }
    throw error
  }
}

function publicLaunchReport(report = {}) {
  return {
    status: typeof report.status === 'string' ? report.status : 'BOARD_FORGE_PUBLIC_ALPHA_LAUNCH_REPORT_RECORDED',
    categories: report.categories && typeof report.categories === 'object' ? report.categories : {},
    externalBlockers: Array.isArray(report.externalBlockers) ? report.externalBlockers.filter((item) => typeof item === 'string') : [],
    limitations: Array.isArray(report.limitations) ? report.limitations.filter((item) => typeof item === 'string') : [],
    localOnly: true,
  }
}

import path from 'node:path'
import { writeFile } from 'node:fs/promises'

export async function writeMakeManufacturableReport({ projectDir, result }) {
  const jsonPath = path.join(projectDir, 'BoardForge_Make_Manufacturable_Report.json')
  const mdPath = path.join(projectDir, 'BoardForge_Make_Manufacturable_Report.md')
  await writeFile(jsonPath, JSON.stringify(result, null, 2))
  await writeFile(mdPath, [
    '# BoardForge Make Manufacturable Report',
    '',
    `Status: ${result.status}`,
    `Before DRC: ${result.before?.drc ?? 'unknown'}`,
    `After DRC: ${result.after?.drc ?? 'unknown'}`,
    `Manufacturing ZIP: ${result.manufacturingZip || 'not exported'}`,
    '',
    '## Actions',
    ...result.actions.map((action) => `- ${action}`),
    '',
    '## Blockers',
    ...(result.blockers.length ? result.blockers.map((blocker) => `- ${blocker}`) : ['- none']),
    '',
  ].join('\n'))
  return { jsonPath, mdPath }
}

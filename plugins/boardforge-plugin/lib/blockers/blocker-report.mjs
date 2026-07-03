import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { classifyProjectBlockers } from './blocker-classifier.mjs'
import { recommendNextAction } from './next-action-recommender.mjs'

export async function writeBlockerReport({ projectDir }) {
  const manifest = JSON.parse(await readFile(path.join(projectDir, 'BoardForge_Project_Manifest.json'), 'utf8'))
  const blockers = classifyProjectBlockers({ manifest })
  const report = {
    projectId: manifest.projectId || path.basename(projectDir),
    blockers,
    nextAction: recommendNextAction(blockers),
    generatedAt: new Date().toISOString(),
  }
  const json = path.join(projectDir, 'BoardForge_Blocker_Report.json')
  const md = path.join(projectDir, 'BoardForge_Blocker_Report.md')
  await writeFile(json, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(md, `# BoardForge Blocker Report\n\n- Project: ${report.projectId}\n- Next action: ${report.nextAction}\n\n${blockers.map((item) => `- ${item.severity}: ${item.issue} Next: ${item.safeNextAction}`).join('\n') || '- No blocking issues found in local artifacts.'}\n`, 'utf8')
  return { status: 'BOARD_FORGE_BLOCKER_REPORT_WRITTEN', report, artifactPaths: [json, md] }
}

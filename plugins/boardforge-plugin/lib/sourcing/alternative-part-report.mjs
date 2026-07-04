import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { recommendAlternativeParts } from './alternative-part-recommender.mjs'

export async function writeAlternativePartReport({ projectDir, rows = [], lookupService }) {
  const report = { status: 'BOARD_FORGE_ALTERNATIVE_PARTS_WRITTEN', alternatives: await recommendAlternativeParts({ rows, lookupService }), generatedAt: new Date().toISOString() }
  const json = path.join(projectDir, 'BoardForge_Alternative_Parts_Report.json')
  const md = path.join(projectDir, 'BoardForge_Alternative_Parts_Report.md')
  await writeFile(json, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(md, ['# BoardForge Alternative Parts Report', '', ...report.alternatives.map((item) => `- ${item.mpn}: ${item.reason}; ${item.candidates.length} candidate alternatives. Engineering review required.`), ''].join('\n'), 'utf8')
  return { status: report.status, report, artifactPaths: [json, md] }
}

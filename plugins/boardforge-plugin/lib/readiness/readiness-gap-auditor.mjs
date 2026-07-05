import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { calculateReadiness99Scorecard } from './readiness-99-scorecard.mjs'
export async function writeReadinessGapAudit({ rootDir = process.cwd(), checks = {} } = {}) {
  await mkdir(rootDir, { recursive: true })
  const report = calculateReadiness99Scorecard(checks)
  const auditPath = path.join(rootDir, 'BoardForge_91_to_99_Readiness_Gap_Audit.json')
  const auditMd = path.join(rootDir, 'BoardForge_91_to_99_Readiness_Gap_Audit.md')
  const scorePath = path.join(rootDir, 'BoardForge_99_Readiness_Scorecard.json')
  const scoreMd = path.join(rootDir, 'BoardForge_99_Readiness_Scorecard.md')
  await writeFile(auditPath, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(scorePath, JSON.stringify(report, null, 2), 'utf8')
  const lines = ['# BoardForge 91 to 99 Readiness Gap Audit', '', `Status: ${report.status}`, `Old score: ${report.oldScore}`, `Evidence-backed score: ${report.evidenceBackedScore}`, '', '## Categories', ...report.categories.map((item) => `- ${item.category}: ${item.currentScore} (${item.blockerType}) - ${item.evidence}`), '', '## External Blockers', ...(report.externalBlockers.length ? report.externalBlockers.map((item) => `- ${item}`) : ['- none'])]
  await writeFile(auditMd, lines.join('\n') + '\n', 'utf8')
  await writeFile(scoreMd, ['# BoardForge 99 Readiness Scorecard', '', `Status: ${report.status}`, `Evidence-backed score: ${report.evidenceBackedScore}`, '', '99 is not claimed while external blockers remain.'].join('\n') + '\n', 'utf8')
  return { status: report.status, report, artifactPaths: [auditPath, auditMd, scorePath, scoreMd] }
}

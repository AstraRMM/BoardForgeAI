import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { scoreQuoteReadiness } from './quote-readiness-engine.mjs'

export async function writeQuoteReadinessReport({ projectDir, rows = [], providerConfigured = false, buildQuantity = 10 }) {
  const report = { ...scoreQuoteReadiness(rows, { providerConfigured, buildQuantity }), generatedAt: new Date().toISOString(), noAutomaticBuying: true }
  const json = path.join(projectDir, 'BoardForge_Quote_Readiness_Report.json')
  const md = path.join(projectDir, 'BoardForge_Quote_Readiness_Report.md')
  await writeFile(json, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(md, `# BoardForge Quote Readiness Report\n\n- Status: ${report.status}\n- Score: ${report.score}\n- Build quantity: ${report.buildQuantity}\n\n## Blockers\n${report.blockers.map((item) => `- ${item}`).join('\n') || '- None'}\n\nBoardForge does not place orders automatically.\n`, 'utf8')
  return { status: 'BOARD_FORGE_QUOTE_READINESS_WRITTEN', report, artifactPaths: [json, md] }
}

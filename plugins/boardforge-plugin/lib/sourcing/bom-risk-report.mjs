import { writeFile } from 'node:fs/promises'
import path from 'node:path'

export async function writeBomRiskReport({ projectDir, rows = [] }) {
  const report = {
    status: 'BOARD_FORGE_BOM_RISK_REPORT_WRITTEN',
    risks: rows.filter((row) => row.risk && row.risk !== 'verified_or_low_risk').map((row) => ({
      mpn: row.MPN || row.manufacturerPartNumber,
      risk: row.risk,
      recommendation: recommendationFor(row.risk),
    })),
    generatedAt: new Date().toISOString(),
  }
  const json = path.join(projectDir, 'BoardForge_BOM_Risk_Report.json')
  const md = path.join(projectDir, 'BoardForge_BOM_Risk_Report.md')
  await writeFile(json, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(md, ['# BoardForge BOM Risk Report', '', ...report.risks.map((risk) => `- ${risk.mpn}: ${risk.risk}; ${risk.recommendation}`), ''].join('\n'), 'utf8')
  return { status: report.status, report, artifactPaths: [json, md] }
}

function recommendationFor(risk) {
  if (risk === 'supplier_api_not_configured') return 'Configure supplier API keys before claiming sourcing readiness.'
  if (risk === 'ambiguous_match_requires_review') return 'Choose an exact manufacturer part match before quote readiness.'
  if (risk === 'out_of_stock') return 'Search candidate alternatives and require engineering review before substitution.'
  if (risk === 'limited_stock') return 'Confirm build quantity and consider alternates.'
  if (risk === 'missing_mpn') return 'Add manufacturer part number to BOM.'
  return 'Review before assembly release.'
}

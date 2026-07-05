import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
export function normalizeQuoteDepth({ productInfoRows = [], quoteApiResponse = null, error = null } = {}) {
  if (quoteApiResponse?.ok) return { source: 'LIVE_DIGIKEY_QUOTE_API', status: 'QUOTE_DEPTH_AVAILABLE', rows: quoteApiResponse.rows || [] }
  if (productInfoRows.length) return { source: 'LIVE_DIGIKEY_PRODUCTINFO_PRICEBREAKS', status: 'QUOTE_DEPTH_FALLBACK_PRODUCTINFO', rows: productInfoRows, blocker: error ? String(error.message || error) : null }
  return { source: error ? 'BLOCKED_BY_API' : 'NOT_AVAILABLE', status: error ? 'QUOTE_DEPTH_BLOCKED' : 'QUOTE_DEPTH_NOT_AVAILABLE', rows: [], blocker: error ? String(error.message || error) : 'No quote endpoint or ProductInformation price data available.' }
}
export async function writeDigiKeyQuoteDepthReport({ projectDir = process.cwd(), productInfoRows = [], quoteApiResponse = null, error = null } = {}) {
  await mkdir(projectDir, { recursive: true })
  const report = { ...normalizeQuoteDepth({ productInfoRows, quoteApiResponse, error }), autoOrdering: false, generatedAt: new Date().toISOString() }
  const json = path.join(projectDir, 'BoardForge_DigiKey_Quote_Depth_Report.json')
  const md = path.join(projectDir, 'BoardForge_DigiKey_Quote_Depth_Report.md')
  await writeFile(json, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(md, `# DigiKey Quote Depth Report\n\n- Status: ${report.status}\n- Source: ${report.source}\n- Auto ordering: false\n- Blocker: ${report.blocker || 'none'}\n`, 'utf8')
  return { status: report.status, report, artifactPaths: [json, md] }
}

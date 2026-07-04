import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createPartLookupService } from './part-lookup-service.mjs'
import { PART_LOOKUP_STATUSES } from './normalized-part-result.mjs'
import { scoreSourcingReadiness } from './sourcing-readiness-score.mjs'
import { writeBomRiskReport } from './bom-risk-report.mjs'
import { writeSupplierMatrix } from './provider-matrix.mjs'

export async function verifyBomSourcing({ projectDir, bomPath = path.join(projectDir, 'BoardForge_BOM.csv'), rows, env = process.env, lookupService = createPartLookupService({ env }) } = {}) {
  await mkdir(projectDir, { recursive: true })
  const bomRows = rows || await readBomCsv(bomPath)
  const verifiedRows = []
  for (const row of bomRows) {
    const lookup = row.MPN || row.manufacturerPartNumber ? await lookupService.lookup({ mpn: row.MPN || row.manufacturerPartNumber, manufacturer: row.manufacturer || row.Manufacturer }) : { status: PART_LOOKUP_STATUSES.VERIFY_FAILED, error: 'missing_mpn' }
    const selected = lookup.selected || {}
    verifiedRows.push({
      ...row,
      sourcingStatus: selected.status || lookup.status,
      stockStatus: selected.stockStatus || 'UNKNOWN',
      quantityAvailable: selected.quantityAvailable ?? 0,
      manufacturerMatch: !row.Manufacturer || !selected.manufacturer ? 'UNKNOWN' : String(row.Manufacturer).toLowerCase() === String(selected.manufacturer).toLowerCase() ? 'MATCH' : 'VERIFY',
      matchType: selected.matchType || 'none',
      priceBreaks: selected.priceBreaks || [],
      lifecycleStatus: selected.lifecycleStatus || 'UNKNOWN',
      datasheetUrl: selected.datasheetUrl || '',
      rohsStatus: selected.rohsStatus || 'UNKNOWN',
      risk: classifyRowRisk(row, selected, lookup),
      provider: lookup.provider || 'digikey',
      lookupError: lookup.error || null,
    })
  }
  const readiness = scoreSourcingReadiness(verifiedRows)
  const report = { status: 'BOARD_FORGE_BOM_SOURCING_VERIFIED', projectDir, readiness, rows: verifiedRows, generatedAt: new Date().toISOString(), noFakeStock: true }
  const json = path.join(projectDir, 'BoardForge_BOM_Sourcing_Report.json')
  const md = path.join(projectDir, 'BoardForge_BOM_Sourcing_Report.md')
  await writeFile(json, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(md, renderBomSourcingMarkdown(report), 'utf8')
  const supplierMatrix = await writeSupplierMatrix({ projectDir, rows: verifiedRows })
  const bomRisk = await writeBomRiskReport({ projectDir, rows: verifiedRows })
  return { status: report.status, report, artifactPaths: [json, md, ...supplierMatrix.artifactPaths, ...bomRisk.artifactPaths] }
}

export async function readBomCsv(filePath) {
  try {
    const text = await readFile(filePath, 'utf8')
    const [headerLine, ...lines] = text.trim().split(/\r?\n/)
    const headers = headerLine.split(',').map((item) => item.trim())
    return lines.filter(Boolean).map((line) => Object.fromEntries(line.split(',').map((value, index) => [headers[index], value.trim()])))
  } catch {
    return []
  }
}

function classifyRowRisk(row, selected, lookup) {
  if (!row.MPN && !row.manufacturerPartNumber) return 'missing_mpn'
  if (lookup.status === PART_LOOKUP_STATUSES.NOT_CONFIGURED) return 'supplier_api_not_configured'
  if (lookup.status === PART_LOOKUP_STATUSES.AMBIGUOUS_MATCH || selected.status === PART_LOOKUP_STATUSES.AMBIGUOUS_MATCH) return 'ambiguous_match_requires_review'
  if (selected.stockStatus === 'OUT_OF_STOCK') return 'out_of_stock'
  if (selected.stockStatus === 'LIMITED_STOCK') return 'limited_stock'
  if (/obsolete|not recommended/i.test(selected.lifecycleStatus || '')) return 'lifecycle_risk'
  return 'verified_or_low_risk'
}

function renderBomSourcingMarkdown(report) {
  return [
    '# BoardForge BOM Sourcing Report',
    '',
    `Readiness: ${report.readiness.status} (${report.readiness.score}/100)`,
    '',
    '| MPN | Provider | Match | Stock | Quantity | Lifecycle | Risk |',
    '| --- | --- | --- | --- | ---: | --- | --- |',
    ...report.rows.map((row) => `| ${row.MPN || row.manufacturerPartNumber || ''} | ${row.provider} | ${row.matchType} | ${row.stockStatus} | ${row.quantityAvailable} | ${row.lifecycleStatus} | ${row.risk} |`),
    '',
    'BoardForge does not fake stock. Missing/failed supplier checks remain visible.',
    '',
  ].join('\n')
}

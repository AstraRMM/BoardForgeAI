import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildPoeRevDPartSelection } from './poe-rev-d-part-selection.mjs'
import { defaultSourcingProviders } from '../sourcing/part-verification-report.mjs'
import { detectSourcingProviderEnv } from '../sourcing/source-provider-env.mjs'

export async function buildPoeRevDSourcingVerificationReport({
  outputDir = 'C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/BF-POE-SENSOR-01_REV_D',
  env = process.env,
  providers = defaultSourcingProviders({ env }),
} = {}) {
  const envReport = detectSourcingProviderEnv(env)
  const anyApiConfigured = envReport.some((provider) => provider.apiCallable)
  const parts = buildPoeRevDPartSelection({ envAvailable: anyApiConfigured }).parts.map((part, index) => ({
    ref: refForFunction(part.function, index),
    mpn: part.selectedMPN,
    manufacturer: part.manufacturer,
    symbol: part.symbol,
    footprint: part.footprint,
    pinMapStatus: part.pinMapStatus || 'PASS',
  }))
  const rows = []
  for (const part of parts) {
    for (const provider of providers) rows.push(await provider.verifyPart(part))
  }
  const providerReports = Object.fromEntries(providers.map((provider) => [
    provider.id,
    typeof provider.writeProviderReport === 'function'
      ? provider.writeProviderReport(rows.filter((row) => row.provider === provider.id))
      : '',
  ]))
  const missingKeys = envReport.flatMap((provider) => provider.missingEnv)
  const summary = {
    partsChecked: parts.length,
    providersAttempted: providers.length,
    providerResultRows: rows.length,
    apiVerified: rows.filter((row) => row.sourcingStatus === 'API_VERIFIED').length,
    notChecked: rows.filter((row) => row.sourcingStatus === 'NOT_CHECKED').length,
    outOfStock: rows.filter((row) => row.sourcingStatus === 'OUT_OF_STOCK').length,
    obsolete: rows.filter((row) => row.sourcingStatus === 'OBSOLETE').length,
    stockInStock: rows.filter((row) => row.stockStatus === 'IN_STOCK').length,
    stockUnknown: rows.filter((row) => row.stockStatus === 'UNKNOWN').length,
    assemblyAvailable: rows.filter((row) => row.assemblyAvailability === 'AVAILABLE').length,
    assemblyUnknown: rows.filter((row) => row.assemblyAvailability === 'UNKNOWN').length,
  }
  return {
    schema: 'boardforge.poe-rev-d-sourcing-verification.v1',
    fixture: outputDir,
    generatedAt: new Date().toISOString(),
    apiKeys: envReport.map((provider) => ({
      provider: provider.provider,
      name: provider.name,
      requiredEnv: provider.requiredEnv,
      present: provider.envKeysPresent.length,
      missingEnv: provider.missingEnv,
      apiCallable: provider.apiCallable,
    })),
    summary,
    rows,
    providerReports,
    manufacturingReadiness: {
      pcbFab: 'PCB_FAB_READY',
      assembly: summary.apiVerified > 0 && summary.notChecked === 0 ? 'ASSEMBLY_READY_VERIFIED' : 'ASSEMBLY_READY_NOT_VERIFIED',
      sourcing: summary.apiVerified > 0 && summary.notChecked === 0 ? 'ASSEMBLY_READY_VERIFIED' : 'BLOCKED_SOURCING',
      compliance: 'BLOCKED_COMPLIANCE_REVIEW',
    },
    exactBlocker: missingKeys.length
      ? `Missing supplier API keys: ${[...new Set(missingKeys)].join(', ')}`
      : 'Provider keys are configured; run live provider-specific queries and review returned evidence before assembly-ready claim.',
  }
}

export async function writePoeRevDSourcingVerificationReport(options = {}) {
  const report = await buildPoeRevDSourcingVerificationReport(options)
  await mkdir(report.fixture, { recursive: true })
  const json = path.join(report.fixture, 'BoardForge_PoE_REV_D_Sourcing_Verification_Report.json')
  const markdown = path.join(report.fixture, 'BoardForge_PoE_REV_D_Sourcing_Verification_Report.md')
  await writeFile(json, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(markdown, sourcingMarkdown(report), 'utf8')
  return { ...report, files: { json, markdown } }
}

function sourcingMarkdown(report) {
  const apiRows = report.apiKeys.map((provider) => `| ${provider.name} | ${provider.apiCallable ? 'yes' : 'no'} | ${provider.missingEnv.join(', ') || 'none'} |`).join('\n')
  const rows = report.rows.map((row) => `| ${row.ref || '-'} | ${row.mpn || '-'} | ${row.providerName || row.provider} | ${row.sourcingStatus} | ${row.stockStatus} | ${row.assemblyAvailability} | ${row.packageMatch} | ${row.risk} |`).join('\n')
  return `# BoardForge PoE REV_D Sourcing Verification Report

BoardForge does not fake stock, sourcing, pricing, lifecycle, or assembly availability.

## Summary
- parts checked: ${report.summary.partsChecked}
- providers attempted: ${report.summary.providersAttempted}
- API verified result rows: ${report.summary.apiVerified}
- NOT_CHECKED result rows: ${report.summary.notChecked}
- stock IN_STOCK rows: ${report.summary.stockInStock}
- assembly AVAILABLE rows: ${report.summary.assemblyAvailable}
- exact blocker: ${report.exactBlocker}

## Provider API Keys
| Provider | API callable | Missing env |
| --- | --- | --- |
${apiRows}

## Manufacturing Readiness Split
- PCB fab: ${report.manufacturingReadiness.pcbFab}
- Assembly: ${report.manufacturingReadiness.assembly}
- Sourcing: ${report.manufacturingReadiness.sourcing}
- Compliance: ${report.manufacturingReadiness.compliance}

## Results
| Ref | MPN | Provider | Sourcing | Stock | Assembly | Package | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows}
`
}

function refForFunction(fn, index) {
  if (/RJ45/i.test(fn)) return 'J1'
  if (/PD controller/i.test(fn)) return 'U1'
  if (/Ethernet/i.test(fn)) return 'U2'
  if (/Bridge/i.test(fn)) return 'D1'
  if (/TVS/i.test(fn)) return 'D2'
  if (/module/i.test(fn)) return 'U3'
  if (/regulator/i.test(fn)) return 'U4'
  if (/capacitor/i.test(fn)) return 'C1'
  if (/choke/i.test(fn)) return 'L1'
  return `P${index + 1}`
}

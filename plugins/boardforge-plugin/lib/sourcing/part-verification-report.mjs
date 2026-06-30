import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createDigikeyProvider } from './digikey-provider.mjs'
import { createJlcpcbAssemblyProvider } from './jlcpcb-assembly-provider.mjs'
import { createLcscProvider } from './lcsc-provider.mjs'
import { createMouserProvider } from './mouser-provider.mjs'
import { verifyBomWithProviders } from './part-source-provider.mjs'

export function defaultSourcingProviders(options = {}) {
  return [
    createDigikeyProvider(options),
    createMouserProvider(options),
    createLcscProvider(options),
    createJlcpcbAssemblyProvider(options),
  ]
}

export async function buildPartVerificationReport(parts = [], options = {}) {
  const providers = options.providers || defaultSourcingProviders(options)
  const report = await verifyBomWithProviders(parts, providers, options)
  return {
    ...report,
    providerSummary: providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      available: provider.available,
      requiredEnv: provider.requiredEnv || [],
      capabilities: provider.supportedCapabilities || [],
    })),
    policy: {
      fakeStockAllowed: false,
      fakeAssemblyAvailabilityAllowed: false,
      apiVerifiedRequiresLiveProviderEvidence: true,
    },
  }
}

export async function writePartVerificationReport({ parts = [], outputDir, options = {} } = {}) {
  if (!outputDir) throw new Error('outputDir is required')
  const report = await buildPartVerificationReport(parts, options)
  await mkdir(outputDir, { recursive: true })
  const json = path.join(outputDir, 'BoardForge_Part_Verification_Report.json')
  const markdown = path.join(outputDir, 'BoardForge_Part_Verification_Report.md')
  await writeFile(json, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(markdown, markdownReport(report), 'utf8')
  return { report, files: { json, markdown } }
}

function markdownReport(report) {
  const rows = report.rows.map((row) => (
    `| ${row.ref || '-'} | ${row.mpn || '-'} | ${row.manufacturer || '-'} | ${row.footprint || '-'} | ${row.pinMapStatus} | ${row.sourcingStatus} | ${row.stockStatus} | ${row.assemblyAvailability} | ${row.risk} |`
  )).join('\n')
  const providers = report.providerSummary.map((provider) => (
    `- ${provider.name}: ${provider.available ? 'available' : 'not configured'} (${provider.requiredEnv.join(', ') || 'no env required'})`
  )).join('\n')
  return [
    '# BoardForge Part Verification Report',
    '',
    'BoardForge does not invent sourcing, stock, lifecycle, pricing, or assembly availability.',
    '',
    '## Summary',
    `- total: ${report.summary.total}`,
    `- API verified: ${report.summary.apiVerified}`,
    `- manual candidates: ${report.summary.manualCandidates}`,
    `- placeholders: ${report.summary.placeholders}`,
    `- not checked: ${report.summary.notChecked}`,
    '',
    '## Providers',
    providers || '- none',
    '',
    '## BOM Rows',
    '| Ref | MPN | Manufacturer | Footprint | Pin Map | Sourcing | Stock | Assembly | Risk |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    rows || '| - | - | - | - | - | - | - | - | - |',
    '',
  ].join('\n')
}

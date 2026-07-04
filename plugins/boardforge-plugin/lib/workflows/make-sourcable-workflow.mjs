import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getProviderConfig } from '../config/provider-config.mjs'
import { createPartLookupService } from '../sourcing/part-lookup-service.mjs'
import { verifyBomSourcing } from '../sourcing/bom-sourcing-verifier.mjs'
import { writeQuoteReadinessReport } from '../sourcing/quote-readiness-report.mjs'
import { writeAlternativePartReport } from '../sourcing/alternative-part-report.mjs'

export async function runMakeSourcableWorkflow({ projectDir, rows, env = process.env, lookupService = createPartLookupService({ env }) } = {}) {
  await mkdir(projectDir, { recursive: true })
  const providerConfig = getProviderConfig({ env })
  const sourcing = await verifyBomSourcing({ projectDir, rows, env, lookupService })
  const reportRows = sourcing.report.rows
  const quote = await writeQuoteReadinessReport({ projectDir, rows: reportRows, providerConfigured: providerConfig.providers.digikey.configured })
  const alternatives = await writeAlternativePartReport({ projectDir, rows: reportRows, lookupService })
  const status = chooseStatus({ providerConfig, reportRows, quote: quote.report })
  const substitutionPlan = {
    status: 'BOARD_FORGE_PROPOSED_SUBSTITUTION_PLAN_WRITTEN',
    autoApplied: false,
    requiresApproval: true,
    proposedSubstitutions: alternatives.report.alternatives,
  }
  const planPath = path.join(projectDir, 'BoardForge_Proposed_Substitution_Plan.json')
  await writeFile(planPath, JSON.stringify(substitutionPlan, null, 2), 'utf8')
  const report = { status, providerConfig: { digikey: providerConfig.providers.digikey.status, mouser: providerConfig.providers.mouser.status }, sourcing: sourcing.report.readiness, quote: quote.report.status, autoChangedSchematic: false, autoChangedPcb: false, generatedAt: new Date().toISOString() }
  const json = path.join(projectDir, 'BoardForge_Make_Sourcable_Report.json')
  const md = path.join(projectDir, 'BoardForge_Make_Sourcable_Report.md')
  await writeFile(json, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(md, `# BoardForge Make Sourcable Report\n\n- Status: ${status}\n- DigiKey: ${providerConfig.providers.digikey.status}\n- Mouser: ${providerConfig.providers.mouser.status}\n- Quote readiness: ${quote.report.status}\n\nNo schematic or PCB substitutions were auto-applied.\n`, 'utf8')
  return { status, report, artifactPaths: [json, md, planPath, ...sourcing.artifactPaths, ...quote.artifactPaths, ...alternatives.artifactPaths] }
}

function chooseStatus({ providerConfig, reportRows, quote }) {
  if (!providerConfig.providers.digikey.configured) return 'BLOCKED_SUPPLIER_API'
  if (reportRows.some((row) => !row.MPN && !row.manufacturerPartNumber)) return 'BLOCKED_MISSING_MPN'
  if (quote.status?.startsWith('BLOCKED')) return quote.status === 'BLOCKED_SUPPLIER_API' ? 'BLOCKED_SUPPLIER_API' : 'BLOCKED_UNAVAILABLE_PARTS'
  if (reportRows.some((row) => row.risk && row.risk !== 'verified_or_low_risk')) return 'SOURCABLE_WITH_WARNINGS'
  return 'SOURCABLE'
}

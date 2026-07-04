#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createPartLookupService } from '../lib/sourcing/part-lookup-service.mjs'
import { verifyBomSourcing } from '../lib/sourcing/bom-sourcing-verifier.mjs'
import { writeQuoteReadinessReport } from '../lib/sourcing/quote-readiness-report.mjs'
import { writeAlternativePartReport } from '../lib/sourcing/alternative-part-report.mjs'
import { runMakeSourcableWorkflow } from '../lib/workflows/make-sourcable-workflow.mjs'

const projectDir = value('--project-dir') || 'C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/BF-DIGIKEY-LIVE-SOURCING-PROOF-01_REV_A'
await mkdir(projectDir, { recursive: true })
const rows = [
  { Ref: 'R1', MPN: 'RC0603FR-0710KL', Manufacturer: 'YAGEO', Footprint: '0603', Qty: '4' },
  { Ref: 'C1', MPN: 'CL10B104KB8NNNC', Manufacturer: 'Samsung Electro-Mechanics', Footprint: '0603', Qty: '4' },
  { Ref: 'U1', MPN: 'MCP1700T-3302E/TT', Manufacturer: 'Microchip', Footprint: 'SOT-23', Qty: '1' },
  { Ref: 'U2', MPN: 'SN65HVD230DR', Manufacturer: 'Texas Instruments', Footprint: 'SOIC-8', Qty: '1' },
]
await writeFile(path.join(projectDir, 'BoardForge_BOM.csv'), ['Ref,MPN,Manufacturer,Footprint,Qty', ...rows.map((row) => `${row.Ref},${row.MPN},${row.Manufacturer},${row.Footprint},${row.Qty}`)].join('\n'), 'utf8')

const lookupService = createPartLookupService()
const status = await lookupService.status()
let result
if (status.digikey.authenticated) {
  const sourcing = await verifyBomSourcing({ projectDir, rows, lookupService })
  const quote = await writeQuoteReadinessReport({ projectDir, rows: sourcing.report.rows, providerConfigured: true })
  const alternatives = await writeAlternativePartReport({ projectDir, rows: sourcing.report.rows, lookupService })
  const sourcable = await runMakeSourcableWorkflow({ projectDir, rows, lookupService })
  result = {
    status: 'DIGIKEY_LIVE_SOURCING_PROOF_COMPLETE',
    liveMockStatus: 'LIVE_DIGIKEY_RESULT',
    authenticated: true,
    reports: [...sourcing.artifactPaths, ...quote.artifactPaths, ...alternatives.artifactPaths, ...sourcable.artifactPaths],
  }
} else {
  result = {
    status: 'DIGIKEY_LIVE_OAUTH_REQUIRED',
    liveMockStatus: 'LIVE_BLOCKED_NO_TOKEN',
    authenticated: false,
    blocker: 'DigiKey OAuth token is missing.',
    resumeCommand: 'npm run boardforge:digikey-auth-start && npm run boardforge:digikey-auth-complete -- --code <CODE_FROM_CALLBACK_URL> && npm run boardforge:digikey-live-sourcing-proof',
    reports: [],
  }
  await writeBlockedReports(projectDir, rows, result)
}
await writeFile(path.join(projectDir, 'BoardForge_Live_DigiKey_Evidence_Record.json'), JSON.stringify({ ...result, noSecretsPrinted: true, generatedAt: new Date().toISOString() }, null, 2), 'utf8')
console.log(JSON.stringify({ ...result, projectDir, noSecretsPrinted: true }, null, 2))
process.exitCode = result.authenticated ? 0 : 2

async function writeBlockedReports(projectDir, rows, result) {
  const rowReports = rows.map((row) => ({ ...row, sourcingStatus: 'NOT_CONFIGURED', liveStatus: 'DIGIKEY_OAUTH_REQUIRED' }))
  await writeFile(path.join(projectDir, 'BoardForge_BOM_Sourcing_Report.json'), JSON.stringify({ status: 'DIGIKEY_LIVE_OAUTH_REQUIRED', rows: rowReports, noFakeStock: true }, null, 2), 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_BOM_Sourcing_Report.md'), `# BOM Sourcing Report\n\nStatus: ${result.status}\n\nDigiKey OAuth token is required before live stock can be checked. No fake stock was written.\n`, 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_Supplier_Matrix.json'), JSON.stringify({ digikey: 'OAUTH_REQUIRED', mouser: 'NOT_CONFIGURED' }, null, 2), 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_BOM_Risk_Report.json'), JSON.stringify({ status: 'BLOCKED_SUPPLIER_API', risks: ['digikey_oauth_required'] }, null, 2), 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_BOM_Risk_Report.md'), '# BOM Risk Report\n\n- BLOCKED_SUPPLIER_API: DigiKey OAuth token required.\n', 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_Quote_Readiness_Report.json'), JSON.stringify({ status: 'BLOCKED_SUPPLIER_API' }, null, 2), 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_Quote_Readiness_Report.md'), '# Quote Readiness Report\n\nStatus: BLOCKED_SUPPLIER_API\n', 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_Alternative_Parts_Report.json'), JSON.stringify({ status: 'BLOCKED_SUPPLIER_API', alternatives: [] }, null, 2), 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_Alternative_Parts_Report.md'), '# Alternative Parts Report\n\nStatus: BLOCKED_SUPPLIER_API\n', 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_Make_Sourcable_Report.json'), JSON.stringify({ status: 'BLOCKED_SUPPLIER_API', autoChangedSchematic: false, autoChangedPcb: false }, null, 2), 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_Make_Sourcable_Report.md'), '# Make Sourcable Report\n\nStatus: BLOCKED_SUPPLIER_API\n\nNo schematic or PCB changes were made.\n', 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_Make_Sourcable_Live_Proof.json'), JSON.stringify(result, null, 2), 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_Make_Sourcable_Live_Proof.md'), `# Make Sourcable Live Proof\n\nStatus: ${result.status}\n\nResume: \`${result.resumeCommand}\`\n`, 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_Proposed_Substitution_Plan.json'), JSON.stringify({ status: 'BLOCKED_SUPPLIER_API', proposedSubstitutions: [], requiresApproval: true }, null, 2), 'utf8')
}

function value(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : process.argv[index + 1]
}

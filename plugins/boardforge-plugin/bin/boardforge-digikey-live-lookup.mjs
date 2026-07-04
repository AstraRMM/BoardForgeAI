#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createPartLookupService } from '../lib/sourcing/part-lookup-service.mjs'

const queries = [
  { label: '0603 resistor', mpn: 'RC0603FR-0710KL' },
  { label: '0603 capacitor', mpn: 'CL10B104KB8NNNC' },
  { label: 'USB-C connector', keyword: 'USB-C receptacle 16 pin' },
  { label: '3.3V regulator', mpn: 'MCP1700T-3302E/TT' },
  { label: 'CAN transceiver', mpn: 'SN65HVD230DR' },
]
const service = createPartLookupService()
const status = await service.status()
const results = []
if (status.digikey.authenticated) {
  for (const query of queries) results.push({ label: query.label, resultType: 'LIVE_DIGIKEY_RESULT', ...(await service.lookup(query)) })
}
const report = {
  status: status.digikey.authenticated ? 'BOARD_FORGE_DIGIKEY_LIVE_LOOKUP_COMPLETE' : 'DIGIKEY_LIVE_OAUTH_REQUIRED',
  authenticated: status.digikey.authenticated,
  configured: status.digikey.configured,
  results,
  blocker: status.digikey.authenticated ? null : 'DigiKey OAuth token is missing. Run npm run boardforge:digikey-auth-start, then npm run boardforge:digikey-auth-complete -- --code <CODE_FROM_CALLBACK_URL>.',
  generatedAt: new Date().toISOString(),
  noSecretsPrinted: true,
}
await writeReport(process.cwd(), report)
console.log(JSON.stringify(report, null, 2))
process.exitCode = status.digikey.authenticated ? 0 : 2

async function writeReport(rootDir, report) {
  await mkdir(rootDir, { recursive: true })
  await writeFile(path.join(rootDir, 'BoardForge_DigiKey_Live_Lookup_Report.json'), JSON.stringify(report, null, 2), 'utf8')
  await writeFile(path.join(rootDir, 'BoardForge_DigiKey_Live_Lookup_Report.md'), `# DigiKey Live Lookup Report\n\n- Status: ${report.status}\n- Authenticated: ${report.authenticated}\n- Results: ${report.results.length}\n- Blocker: ${report.blocker || 'none'}\n\nNo mock fallback was used.\n`, 'utf8')
}

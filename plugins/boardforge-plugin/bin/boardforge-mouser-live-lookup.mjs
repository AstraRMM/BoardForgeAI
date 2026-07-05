#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { loadBoardForgeEnv } from '../lib/config/env-loader.mjs'
import { createMouserProvider, getMouserApiKey } from '../lib/sourcing/mouser-provider.mjs'

const queries = [
  { label: '0603 resistor', mpn: 'RC0603FR-0710KL' },
  { label: '0603 capacitor', mpn: 'CL10B104KB8NNNC' },
  { label: '3.3V regulator', mpn: 'MCP1700T-3302E/TT' },
]

const { env, loadedFiles } = loadBoardForgeEnv({ cwd: process.cwd() })
const configured = Boolean(getMouserApiKey(env))
const provider = createMouserProvider({ env, liveLookup: true })
const results = []

if (configured) {
  for (const query of queries) {
    const result = await provider.verifyPart({
      ref: query.label,
      mpn: query.mpn,
    })
    results.push({
      label: query.label,
      mpn: result.mpn,
      provider: result.provider,
      supplierSku: result.supplierSku,
      sourcingStatus: result.sourcingStatus,
      stockStatus: result.stockStatus,
      stockQty: result.stockQty,
      packageMatch: result.packageMatch,
      risk: result.risk,
      totalResults: result.evidence?.totalResults ?? null,
      liveApiEvidence: Boolean(result.evidence?.liveApiEvidence),
    })
  }
}

const verifiedCount = results.filter((result) => result.liveApiEvidence && !['ERROR', 'NOT_CHECKED'].includes(result.sourcingStatus)).length
const report = {
  status: configured ? verifiedCount > 0 ? 'BOARD_FORGE_MOUSER_LIVE_LOOKUP_COMPLETE' : 'MOUSER_LIVE_LOOKUP_NO_VERIFIED_RESULTS' : 'MOUSER_API_KEY_REQUIRED',
  configured,
  loadedEnvFiles: loadedFiles.map((file) => path.basename(file)),
  results,
  blocker: configured ? null : 'Mouser Search API key is missing. Set MOUSER_API_KEY in .env.local.',
  generatedAt: new Date().toISOString(),
  noSecretsPrinted: true,
}

await writeReport(process.cwd(), report)
console.log(JSON.stringify(report, null, 2))
process.exitCode = configured && verifiedCount > 0 ? 0 : 2

async function writeReport(rootDir, report) {
  await mkdir(rootDir, { recursive: true })
  await writeFile(path.join(rootDir, 'BoardForge_Mouser_Live_Lookup_Report.json'), JSON.stringify(report, null, 2), 'utf8')
  await writeFile(path.join(rootDir, 'BoardForge_Mouser_Live_Lookup_Report.md'), [
    '# Mouser Live Lookup Report',
    '',
    `- Status: ${report.status}`,
    `- Configured: ${report.configured}`,
    `- Results: ${report.results.length}`,
    `- Verified live results: ${report.results.filter((result) => result.liveApiEvidence).length}`,
    `- Blocker: ${report.blocker || 'none'}`,
    '',
    'No secrets printed.',
    '',
  ].join('\n'), 'utf8')
}

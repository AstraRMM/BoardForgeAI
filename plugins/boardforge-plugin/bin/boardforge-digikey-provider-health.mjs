#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createPartLookupService } from '../lib/sourcing/part-lookup-service.mjs'

const service = createPartLookupService()
const status = await service.status()
let lookup = null
if (status.digikey.authenticated) lookup = await service.lookup({ mpn: 'RC0603FR-0710KL' })
const report = {
  status: 'BOARD_FORGE_DIGIKEY_PROVIDER_HEALTH',
  digikeyConfigured: status.digikey.configured,
  tokenPresent: status.digikey.tokenPresent,
  authenticated: status.digikey.authenticated,
  enabledApis: status.digikey.enabledApis,
  productInformationV4Reachable: Boolean(lookup?.selected),
  quoteReachable: false,
  supplyChainApiScaffolded: true,
  lastCheckTime: new Date().toISOString(),
  error: lookup?.error || null,
  noSecretsPrinted: true,
}
await writeReport(process.cwd(), report)
console.log(JSON.stringify(report, null, 2))
process.exitCode = report.authenticated ? 0 : 2

async function writeReport(rootDir, report) {
  await mkdir(rootDir, { recursive: true })
  await writeFile(path.join(rootDir, 'BoardForge_DigiKey_Provider_Health_Report.json'), JSON.stringify(report, null, 2), 'utf8')
  await writeFile(path.join(rootDir, 'BoardForge_DigiKey_Provider_Health_Report.md'), `# DigiKey Provider Health\n\n- Configured: ${report.digikeyConfigured}\n- Token present: ${report.tokenPresent}\n- Authenticated: ${report.authenticated}\n- ProductInformation V4 reachable: ${report.productInformationV4Reachable}\n- Quote reachable: ${report.quoteReachable}\n- SupplyChainAPI scaffolded: ${report.supplyChainApiScaffolded}\n\nNo secrets printed.\n`, 'utf8')
}

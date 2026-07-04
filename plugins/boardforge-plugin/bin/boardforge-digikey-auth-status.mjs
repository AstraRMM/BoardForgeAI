#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createDigiKeyAuthClient } from '../lib/sourcing/digikey/digikey-auth-client.mjs'

const auth = createDigiKeyAuthClient()
const health = await auth.healthCheck()
const report = {
  status: 'BOARD_FORGE_DIGIKEY_AUTH_STATUS',
  configured: health.configured,
  tokenPresent: health.tokenPresent,
  authenticated: health.authenticated,
  tokenExpired: health.tokenExpired,
  enabledApis: health.enabledApis,
  callbackUrlConfigured: health.callbackUrlConfigured,
  lastCheckTime: health.lastCheckTime,
  noSecretsPrinted: true,
}
await writeReport(process.cwd(), 'BoardForge_DigiKey_Auth_Status_Report', report)
console.log(JSON.stringify(report, null, 2))

async function writeReport(rootDir, name, report) {
  await mkdir(rootDir, { recursive: true })
  await writeFile(path.join(rootDir, `${name}.json`), JSON.stringify(report, null, 2), 'utf8')
  await writeFile(path.join(rootDir, `${name}.md`), `# DigiKey Auth Status\n\n- Configured: ${report.configured}\n- Token present: ${report.tokenPresent}\n- Authenticated: ${report.authenticated}\n- Token expired: ${report.tokenExpired}\n- Enabled APIs: ${report.enabledApis.join(', ')}\n\nNo secrets printed.\n`, 'utf8')
}

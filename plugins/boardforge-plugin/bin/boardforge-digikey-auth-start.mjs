#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createDigiKeyAuthClient } from '../lib/sourcing/digikey/digikey-auth-client.mjs'
import { normalizeDigiKeyError } from '../lib/sourcing/digikey/digikey-errors.mjs'

const auth = createDigiKeyAuthClient()
const reportPath = process.cwd()
let report
try {
  const clientCredentials = await auth.exchangeClientCredentialsForToken()
  report = { status: 'DIGIKEY_TOKEN_STORED', method: clientCredentials.method, authenticated: true, expiresAt: clientCredentials.expiresAt, noSecretsPrinted: true }
} catch (clientCredentialsError) {
  const authUrl = auth.getAuthorizationUrl({ state: `boardforge-${Date.now()}` })
  openBrowser(authUrl)
  report = {
    status: 'DIGIKEY_BROWSER_OAUTH_REQUIRED',
    authenticated: false,
    clientCredentialsAttempt: normalizeDigiKeyError(clientCredentialsError),
    browserOpened: true,
    resumeCommand: 'npm run boardforge:digikey-auth-complete -- --code <CODE_FROM_DIGIKEY_CALLBACK_URL>',
    callbackInstruction: 'After DigiKey redirects to the callback URL, copy the code query parameter and run the resume command.',
    noSecretsPrinted: true,
  }
}
await writeReport(reportPath, 'BoardForge_DigiKey_OAuth_Start_Report', report)
console.log(JSON.stringify(report, null, 2))
if (!report.authenticated) process.exitCode = 2

function openBrowser(url) {
  if (process.platform === 'win32') execFile('cmd', ['/c', 'start', '', url], { windowsHide: true })
}

async function writeReport(rootDir, name, report) {
  await mkdir(rootDir, { recursive: true })
  await writeFile(path.join(rootDir, `${name}.json`), JSON.stringify(report, null, 2), 'utf8')
  await writeFile(path.join(rootDir, `${name}.md`), `# DigiKey OAuth Start\n\n- Status: ${report.status}\n- Authenticated: ${report.authenticated}\n- Resume command: \`${report.resumeCommand || 'not required'}\`\n\nNo secrets printed.\n`, 'utf8')
}

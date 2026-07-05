#!/usr/bin/env node
import { writeFile } from 'node:fs/promises'
import { createDigiKeyAuthClient } from '../plugins/boardforge-plugin/lib/sourcing/digikey/digikey-auth-client.mjs'
import { createDigiKeyApiClient } from '../plugins/boardforge-plugin/lib/sourcing/digikey/digikey-api-client.mjs'
import { normalizeDigiKeyError } from '../plugins/boardforge-plugin/lib/sourcing/digikey/digikey-errors.mjs'

const authClient = createDigiKeyAuthClient()
const apiClient = createDigiKeyApiClient({ authClient })
const health = await authClient.healthCheck()
const candidates = [
  { method: 'GET', path: '/quotes/v4' },
  { method: 'GET', path: '/quote/v4' },
  { method: 'GET', path: '/SupplyChain/v4/Quote' },
]

const attempts = []
if (health.authenticated) {
  for (const candidate of candidates) {
    try {
      await apiClient.request(candidate.path, { method: candidate.method, timeoutMs: 7000 })
      attempts.push({ ...candidate, reachable: true, status: 'LIVE_RESPONSE_RECEIVED' })
      break
    } catch (error) {
      const normalized = normalizeDigiKeyError(error)
      attempts.push({ ...candidate, reachable: false, status: normalized.status || 'DIGIKEY_QUOTE_PROBE_FAILED', error: normalized })
    }
  }
}

const quoteReachable = attempts.some((item) => item.reachable)
const report = {
  status: quoteReachable ? 'DIGIKEY_QUOTE_API_LIVE_REACHABLE' : health.authenticated ? 'DIGIKEY_QUOTE_API_BLOCKED_OR_NOT_ENABLED' : 'DIGIKEY_QUOTE_API_OAUTH_REQUIRED',
  authenticated: Boolean(health.authenticated),
  enabledApis: health.enabledApis || [],
  quoteReachable,
  attempts,
  blocker: quoteReachable ? null : health.authenticated
    ? 'No safe read-only DigiKey Quote endpoint returned a live success. ProductInformation V4 remains the verified live sourcing path.'
    : 'DigiKey OAuth token is missing or expired. Run npm run boardforge:digikey-auth-start.',
  noFakeQuoteData: true,
  noAutomaticBuying: true,
  generatedAt: new Date().toISOString(),
}

await writeFile('BoardForge_DigiKey_Quote_API_Status_Report.json', JSON.stringify(report, null, 2), 'utf8')
await writeFile('BoardForge_DigiKey_Quote_API_Status_Report.md', [
  '# DigiKey Quote API Status Report',
  '',
  `- Status: ${report.status}`,
  `- Authenticated: ${report.authenticated}`,
  `- Quote reachable: ${report.quoteReachable}`,
  `- Blocker: ${report.blocker || 'none'}`,
  '',
  'No quote data is faked and BoardForge does not place orders automatically.',
  '',
].join('\n'), 'utf8')
console.log(JSON.stringify(report, null, 2))
process.exit(report.status === 'DIGIKEY_QUOTE_API_OAUTH_REQUIRED' ? 2 : 0)

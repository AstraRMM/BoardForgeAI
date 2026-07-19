import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Better Auth Dash config stays server-only and environment-gated', async () => {
  const [auth, template] = await Promise.all([
    readFile(new URL('../../../apps/web/src/lib/auth.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../../.env.example', import.meta.url), 'utf8'),
  ])
  assert.match(auth, /import \{ dash \} from '@better-auth\/infra'/)
  assert.match(auth, /const dashApiKey = process\.env\.BETTER_AUTH_API_KEY/)
  assert.match(auth, /dashApiKey \? \[dash\(\{ apiKey: dashApiKey \}\)\] : \[\]/)
  assert.match(template, /^BETTER_AUTH_API_KEY=/m)
  assert.doesNotMatch(auth, /NEXT_PUBLIC_BETTER_AUTH_API_KEY/)
})

test('browser E2E auth bypass is explicitly development-only', async () => {
  const proxy = await readFile(new URL('../../../proxy.ts', import.meta.url), 'utf8')
  assert.match(proxy, /process\.env\.NODE_ENV === 'development' && process\.env\.BOARDFORGE_E2E_AUTH_BYPASS === '1'/)
  assert.doesNotMatch(proxy, /if \(process\.env\.BOARDFORGE_E2E_AUTH_BYPASS === '1'\)/)
})

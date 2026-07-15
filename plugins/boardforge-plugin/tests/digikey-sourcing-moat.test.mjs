import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { redactSecrets } from '../lib/config/secret-redactor.mjs'
import { getProviderConfig } from '../lib/config/provider-config.mjs'
import { createDigiKeyAuthClient } from '../lib/sourcing/digikey/digikey-auth-client.mjs'
import { loadBoardForgeEnv } from '../lib/config/env-loader.mjs'
import { lookupDigiKeyProductInfoV4 } from '../lib/sourcing/digikey/digikey-product-info-v4.mjs'
import { normalizePartResult } from '../lib/sourcing/normalized-part-result.mjs'
import { verifyBomSourcing } from '../lib/sourcing/bom-sourcing-verifier.mjs'
import { writeBomRiskReport } from '../lib/sourcing/bom-risk-report.mjs'
import { writeSupplierMatrix } from '../lib/sourcing/provider-matrix.mjs'
import { scoreQuoteReadiness } from '../lib/sourcing/quote-readiness-engine.mjs'
import { recommendAlternativeParts } from '../lib/sourcing/alternative-part-recommender.mjs'
import { classifyDropInRisk } from '../lib/sourcing/drop-in-risk-classifier.mjs'
import { scoreVariant } from '../lib/variants/variant-scorer.mjs'
import { runMakeSourcableWorkflow } from '../lib/workflows/make-sourcable-workflow.mjs'
import { createLocalServerRouter } from '../lib/platform/local-server/routes.mjs'

const mockDigikey = {
  Products: [
    {
      ManufacturerProductNumber: 'RC0603FR-0710KL',
      DigiKeyProductNumber: '311-10.0KHRCT-ND',
      Manufacturer: { Name: 'YAGEO' },
      Description: { ProductDescription: 'RES 10K OHM 1% 1/10W 0603' },
      QuantityAvailable: 12000,
      StandardPricing: [{ BreakQuantity: 1, UnitPrice: 0.01 }],
      DatasheetUrl: 'https://example.test/datasheet.pdf',
      RohsStatus: 'ROHS3 Compliant',
      ProductStatus: { Status: 'Active' },
      StandardPackage: '0603',
    },
  ],
}

test('secret redaction removes raw DigiKey credentials from text and objects', () => {
  const secret = 'abc123456789abc123456789abc123'
  const redacted = redactSecrets({ DIGIKEY_CLIENT_SECRET: secret, message: `bad ${secret}` }, { DIGIKEY_CLIENT_SECRET: secret })
  assert.equal(redacted.DIGIKEY_CLIENT_SECRET, '[REDACTED:DIGIKEY_CLIENT_SECRET]')
  assert.match(redacted.message, /REDACTED/)
  assert.doesNotMatch(JSON.stringify(redacted), new RegExp(secret))
})

test('provider config marks DigiKey configured only when id and secret exist and Mouser remains not configured', () => {
  const config = getProviderConfig({ env: { DIGIKEY_CLIENT_ID: 'id', DIGIKEY_CLIENT_SECRET: 'secret' } })
  assert.equal(config.providers.digikey.status, 'CONFIGURED')
  assert.equal(config.providers.mouser.status, 'NOT_CONFIGURED')
})

test('DigiKey auth client reports configured health without exposing secrets', async () => {
  const tokenStore = { read: () => null, write: () => {} }
  const auth = createDigiKeyAuthClient({ env: { DIGIKEY_CLIENT_ID: 'id', DIGIKEY_CLIENT_SECRET: 'secret', DIGIKEY_CALLBACK_URL: 'https://www.boardforge-ai.com/api/integrations/digikey/callback' }, tokenStore })
  const health = await auth.healthCheck()
  assert.equal(health.configured, true)
  assert.equal(health.authenticated, false)
  assert.equal(health.callbackUrlConfigured, true)
  assert.doesNotMatch(JSON.stringify(health), /secret/)
})

test('DigiKey client credentials token flow stores local token without exposing credentials', async () => {
  const stored = []
  const fetchImpl = async (_url, request) => {
    assert.match(String(request.body), /grant_type=client_credentials/)
    assert.match(request.headers.authorization, /^Basic /)
    return {
      ok: true,
      json: async () => ({ access_token: 'token-redacted-in-reports', token_type: 'Bearer', expires_in: 600 }),
    }
  }
  const tokenStore = {
    read: () => stored.at(-1) || null,
    write: (token) => stored.push(token),
  }
  const auth = createDigiKeyAuthClient({ env: { DIGIKEY_CLIENT_ID: 'id', DIGIKEY_CLIENT_SECRET: 'secret' }, fetchImpl, tokenStore })
  const result = await auth.exchangeClientCredentialsForToken()
  assert.equal(result.method, 'client_credentials')
  assert.equal(result.authenticated, true)
  assert.equal(stored[0].accessToken, 'token-redacted-in-reports')
  assert.doesNotMatch(JSON.stringify(result), /secret/)
})

test('runtime environment overrides dotenv supplier defaults', async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'boardforge-env-'))
  await writeFile(path.join(cwd, '.env.local'), 'BOARD_FORGE_ENV_PRECEDENCE=local-default\n')
  const before = process.env.BOARD_FORGE_ENV_PRECEDENCE
  process.env.BOARD_FORGE_ENV_PRECEDENCE = 'runtime-value'
  try { assert.equal(loadBoardForgeEnv({ cwd }).env.BOARD_FORGE_ENV_PRECEDENCE, 'runtime-value') }
  finally {
    if (before === undefined) delete process.env.BOARD_FORGE_ENV_PRECEDENCE
    else process.env.BOARD_FORGE_ENV_PRECEDENCE = before
  }
})

test('DigiKey auth refreshes an expired cached token and preserves rotated refresh state', async () => {
  let stored = { accessToken: 'expired-access', refreshToken: 'refresh-value', expiresAt: new Date(0).toISOString() }
  const tokenStore = { read: () => null, readRaw: () => stored, write: (value) => { stored = value } }
  const fetchImpl = async (_url, request) => {
    assert.equal(request.body.get('grant_type'), 'refresh_token')
    assert.equal(request.body.get('refresh_token'), 'refresh-value')
    return { ok: true, json: async () => ({ access_token: 'new-access', expires_in: 1800 }) }
  }
  const auth = createDigiKeyAuthClient({ env: { DIGIKEY_CLIENT_ID: 'id', DIGIKEY_CLIENT_SECRET: 'secret' }, fetchImpl, tokenStore })
  const token = await auth.getValidAccessToken()
  assert.equal(token.accessToken, 'new-access')
  assert.equal(stored.refreshToken, 'refresh-value')
})

test('DigiKey health distinguishes an expired refreshable token from authenticated state', async () => {
  const expired = { accessToken: 'expired-access', refreshToken: 'refresh-value', expiresAt: new Date(0).toISOString() }
  const auth = createDigiKeyAuthClient({ env: { DIGIKEY_CLIENT_ID: 'id', DIGIKEY_CLIENT_SECRET: 'secret' }, tokenStore: { read: () => null, readRaw: () => expired, write: () => {} } })
  const health = await auth.healthCheck()
  assert.equal(health.authenticated, false)
  assert.equal(health.tokenPresent, true)
  assert.equal(health.tokenExpired, true)
  assert.equal(health.refreshAvailable, true)
})

test('DigiKey ProductInformation V4 lookup normalizes mocked exact MPN response', async () => {
  const result = await lookupDigiKeyProductInfoV4({ query: { mpn: 'RC0603FR-0710KL' }, mockResponse: mockDigikey })
  assert.equal(result.selected.manufacturerPartNumber, 'RC0603FR-0710KL')
  assert.equal(result.selected.stockStatus, 'IN_STOCK')
})

test('part lookup normalization produces stock and price fields', () => {
  const result = normalizePartResult(mockDigikey.Products[0], { query: { mpn: 'RC0603FR-0710KL' } })
  assert.equal(result.quantityAvailable, 12000)
  assert.ok(Array.isArray(result.priceBreaks))
})

test('BOM sourcing verifier, supplier matrix, and BOM risk report write local artifacts', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'bf-sourcing-'))
  const lookupService = { lookup: async () => lookupDigiKeyProductInfoV4({ query: { mpn: 'RC0603FR-0710KL' }, mockResponse: mockDigikey }) }
  const result = await verifyBomSourcing({ projectDir, rows: [{ Ref: 'R1', MPN: 'RC0603FR-0710KL', Manufacturer: 'YAGEO', Footprint: '0603' }], lookupService })
  assert.equal(result.report.rows[0].stockStatus, 'IN_STOCK')
  await writeSupplierMatrix({ projectDir, rows: result.report.rows })
  await writeBomRiskReport({ projectDir, rows: result.report.rows })
  assert.match(await readFile(path.join(projectDir, 'BoardForge_BOM_Sourcing_Report.md'), 'utf8'), /does not fake stock/i)
})

test('quote readiness distinguishes supplier API block from quote-ready BOM rows', () => {
  assert.equal(scoreQuoteReadiness([], { providerConfigured: false }).status, 'BLOCKED_SUPPLIER_API')
  const ready = scoreQuoteReadiness([{ MPN: 'RC0603FR-0710KL', sourcingStatus: 'VERIFIED_IN_STOCK', quantityAvailable: 1000 }], { providerConfigured: true, buildQuantity: 10 })
  assert.equal(ready.status, 'QUOTE_READY')
})

test('alternative recommender and drop-in classifier label candidates conservatively', async () => {
  assert.equal(classifyDropInRisk({ Footprint: '0603' }, { standardPackage: '0603' }), 'MEDIUM_RISK_SAME_FOOTPRINT_VERIFY_SPECS')
  const alternatives = await recommendAlternativeParts({ rows: [{ MPN: 'OLD', risk: 'out_of_stock', Footprint: '0603' }], lookupService: { lookup: async () => ({ matches: [normalizePartResult(mockDigikey.Products[0], {})] }) } })
  assert.equal(alternatives[0].candidates[0].note.includes('engineering review'), true)
})

test('supply-chain-aware variant ranking rewards sourcing and quote readiness', () => {
  const good = scoreVariant({ name: 'sourcable', routeability: 80, manufacturability: 80, sourcingReadiness: 100, quoteReadiness: 100, riskyParts: 0 })
  const bad = scoreVariant({ name: 'risky', routeability: 80, manufacturability: 80, sourcingReadiness: 10, quoteReadiness: 0, riskyParts: 5 })
  assert.ok(good.score > bad.score)
})

test('Make Sourcable workflow writes report and does not auto-change schematic or PCB', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'bf-make-sourcable-'))
  const lookupService = { lookup: async () => lookupDigiKeyProductInfoV4({ query: { mpn: 'RC0603FR-0710KL' }, mockResponse: mockDigikey }) }
  const result = await runMakeSourcableWorkflow({ projectDir, rows: [{ Ref: 'R1', MPN: 'RC0603FR-0710KL', Manufacturer: 'YAGEO' }], env: { DIGIKEY_CLIENT_ID: 'id', DIGIKEY_CLIENT_SECRET: 'secret' }, lookupService })
  assert.equal(result.report.autoChangedSchematic, false)
  assert.ok(result.artifactPaths.some((item) => item.endsWith('BoardForge_Make_Sourcable_Report.json')))
})

test('local engine exposes sourcing and DigiKey routes without leaking secrets', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'bf-local-sourcing-'))
  const route = createLocalServerRouter({ rootDir })
  const status = await route({ method: 'GET', pathname: '/sourcing/status' })
  assert.equal(status.ok, true)
  const lookup = await route({ method: 'POST', pathname: '/integrations/digikey/lookup', payload: { mpn: 'RC0603FR-0710KL' } })
  assert.equal(lookup.ok, true)
  assert.doesNotMatch(JSON.stringify(lookup), /DIGIKEY_CLIENT_SECRET/)
})

test('web sourcing command center components expose BOM, quote, and Make Sourcable surfaces', async () => {
  const component = await readFile(path.resolve('apps/web/src/components/project/SourcingCommandCenter.tsx'), 'utf8')
  assert.match(component, /Run DigiKey Verification/)
  assert.match(component, /Make Sourcable/)
  assert.match(component, /No fake stock/)
})

test('CLI sourcing parity exposes local engine sourcing commands', async () => {
  const client = await readFile(path.resolve('plugins/boardforge-plugin/bin/boardforge-local-client.mjs'), 'utf8')
  for (const command of ['sourcing-status', 'sourcing-lookup', 'sourcing-verify', 'quote-readiness', 'make-sourcable', 'alternatives']) {
    assert.match(client, new RegExp(command))
  }
})

test('KiCad sourcing parity exposes sourcing status and report paths', async () => {
  const actionPlugin = await readFile(path.resolve('kicad-plugin/boardforge_action_plugin.py'), 'utf8')
  const statusBridge = await readFile(path.resolve('kicad-plugin/boardforge_status_bridge.py'), 'utf8')
  assert.match(actionPlugin, /Make Sourcable/)
  assert.match(actionPlugin, /DigiKey lookup/)
  assert.match(statusBridge, /BoardForge_BOM_Sourcing_Report/)
  assert.match(statusBridge, /BoardForge_Quote_Readiness_Report/)
})

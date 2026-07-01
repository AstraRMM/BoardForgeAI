import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { createDigikeyProvider } from '../lib/sourcing/digikey-provider.mjs'
import { createJlcpcbAssemblyProvider } from '../lib/sourcing/jlcpcb-assembly-provider.mjs'
import { createLcscProvider } from '../lib/sourcing/lcsc-provider.mjs'
import { createMouserProvider } from '../lib/sourcing/mouser-provider.mjs'
import { buildPartVerificationReport, writePartVerificationReport } from '../lib/sourcing/part-verification-report.mjs'
import { createManualCandidateProvider, providerAvailability, SOURCING_STATUSES, verifyBomWithProviders } from '../lib/sourcing/part-source-provider.mjs'
import { detectSourcingProviderEnv, writeSourcingApiStatusMarkdown } from '../lib/sourcing/source-provider-env.mjs'

test('sourcing providers disclose unavailable API credentials instead of faking stock', async () => {
  const env = {}
  const providers = [
    createDigikeyProvider({ env }),
    createMouserProvider({ env }),
    createLcscProvider({ env }),
    createJlcpcbAssemblyProvider({ env }),
  ]
  for (const provider of providers) {
    assert.equal(provider.available, false)
    const availability = providerAvailability(provider, env)
    assert.equal(availability.available, false)
    assert.ok(availability.missingEnv.length > 0)
    const row = await provider.verifyPart({ ref: 'U1', mpn: 'STM32G431CBU6', footprint: 'Package_QFN:QFN-48' })
    assert.equal(row.sourcingStatus, SOURCING_STATUSES.NOT_CHECKED)
    assert.equal(row.stockStatus, 'UNKNOWN')
    assert.equal(row.assemblyAvailability, 'UNKNOWN')
    assert.match(row.risk, /not_configured/)
  }
})

test('manual provider marks real parts as manual candidates and placeholders as placeholders', async () => {
  const provider = createManualCandidateProvider()
  const report = await verifyBomWithProviders([
    { ref: 'U1', mpn: 'RP2040', manufacturer: 'Raspberry Pi', symbol: 'MCU:RP2040', footprint: 'QFN-56', pinMapStatus: 'PASS' },
    { ref: 'U2', placeholder: true, symbol: 'BoardForge:PLACEHOLDER_SENSOR', footprint: 'Fixture_QFN', pinMapStatus: 'PLACEHOLDER' },
  ], [provider], { generatedAt: '2026-06-29T00:00:00.000Z' })

  assert.equal(report.schema, 'boardforge.part-verification-report.v1')
  assert.equal(report.summary.manualCandidates, 1)
  assert.equal(report.summary.placeholders, 1)
  assert.equal(report.rows[0].sourcingStatus, SOURCING_STATUSES.MANUAL_CANDIDATE)
  assert.equal(report.rows[1].sourcingStatus, SOURCING_STATUSES.PLACEHOLDER)
})

test('part verification report writes JSON and markdown with required BOM fields', async () => {
  const outputDir = path.join(import.meta.dirname, '..', 'tmp', 'sourcing-report-test')
  fs.rmSync(outputDir, { recursive: true, force: true })
  const { report, files } = await writePartVerificationReport({
    outputDir,
    parts: [
      {
        ref: 'J1',
        mpn: 'USB-C-16PIN-CANDIDATE',
        manufacturer: 'Manual',
        symbol: 'Connector:USB_C_Receptacle_USB2.0',
        footprint: 'Connector_USB:USB_C_Receptacle_USB2.0',
        pinMapStatus: 'MANUAL_CANDIDATE',
      },
    ],
    options: { providers: [createManualCandidateProvider()], generatedAt: '2026-06-29T00:00:00.000Z' },
  })

  assert.equal(fs.existsSync(files.json), true)
  assert.equal(fs.existsSync(files.markdown), true)
  assert.equal(report.policy.fakeStockAllowed, false)
  assert.equal(report.policy.apiVerifiedRequiresLiveProviderEvidence, true)
  const row = report.rows[0]
  for (const field of ['mpn', 'manufacturer', 'symbol', 'footprint', 'pinMapStatus', 'sourcingStatus', 'stockStatus', 'assemblyAvailability', 'risk']) {
    assert.ok(Object.hasOwn(row, field), `${field} should be present`)
  }
  assert.match(fs.readFileSync(files.markdown, 'utf8'), /BoardForge does not invent sourcing/)
})

test('configured provider still does not claim API_VERIFIED before live query evidence exists', async () => {
  const provider = createMouserProvider({ env: { MOUSER_API_KEY: 'test-key' } })
  assert.equal(provider.available, true)
  const row = await provider.verifyPart({ ref: 'R1', mpn: 'RC0603FR-0710KL' })
  assert.equal(row.sourcingStatus, SOURCING_STATUSES.NOT_CHECKED)
  assert.equal(row.stockStatus, 'API_CONFIGURED_LIVE_QUERY_NOT_RUN')
  assert.notEqual(row.sourcingStatus, SOURCING_STATUSES.API_VERIFIED)
})

test('sourcing env detection reports missing API keys without fake stock', () => {
  const report = detectSourcingProviderEnv({})
  assert.equal(report.every((provider) => provider.apiCallable === false), true)
  for (const provider of report) {
    assert.equal(provider.fallbackBehavior.sourcingStatus, SOURCING_STATUSES.NOT_CHECKED)
    assert.equal(provider.fallbackBehavior.stockStatus, 'UNKNOWN')
    assert.equal(provider.fallbackBehavior.assemblyAvailability, 'UNKNOWN')
    assert.equal(provider.fallbackBehavior.fakeStockAllowed, false)
  }
  const markdown = writeSourcingApiStatusMarkdown(report)
  assert.match(markdown, /does not fake stock/)
  assert.match(markdown, /NOT_CHECKED/)
})

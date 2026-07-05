import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { writeReadinessGapAudit } from '../lib/readiness/readiness-gap-auditor.mjs'
import { calculateReadiness99Scorecard } from '../lib/readiness/readiness-99-scorecard.mjs'
import { writeDigiKeyQuoteDepthReport } from '../lib/sourcing/digikey/digikey-quote-normalizer.mjs'
import { writeSupplyChainCapabilityReport } from '../lib/sourcing/supply-chain-capability-report.mjs'
import { writeImportBenchmarkSuiteReport } from '../lib/import/import-benchmark-suite.mjs'
import { writeManufacturingPackageAuthenticityReport } from '../lib/manufacturing/package-authenticator.mjs'
import { writeJlcpcbReadinessReport } from '../lib/manufacturing/jlcpcb-readiness-checker.mjs'
import { writeLibraryCoverageReport } from '../lib/library/library-coverage-auditor.mjs'
import { scoreFootprintConfidence } from '../lib/library/footprint-confidence-score.mjs'
import { writeSecurityPrivacyReport } from '../lib/security/local-privacy-report.mjs'
import { writePerformanceBenchmark } from '../lib/performance/performance-benchmark.mjs'
import { writeProjectNextActionsReport } from '../lib/copilot/project-explanation-generator.mjs'
import { createLocalServerRouter } from '../lib/platform/local-server/routes.mjs'

test('readiness gap audit writes 91 to 99 reports without fake 99', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'bf-99-audit-'))
  const result = await writeReadinessGapAudit({ rootDir })
  assert.equal(result.report.oldScore, 91)
  assert.equal(result.report.status, '99_BLOCKED_BY_EXTERNALS')
  assert.ok(result.report.evidenceBackedScore < 99)
  assert.match(await readFile(result.artifactPaths[1], 'utf8'), /99 is not claimed|External Blockers/)
})

test('readiness 99 scorecard classifies external blockers', () => {
  const scorecard = calculateReadiness99Scorecard({ browserE2E: true, quoteDepth: true, supplyChainCapability: true })
  assert.equal(scorecard.status, '99_BLOCKED_BY_EXTERNALS')
  assert.ok(scorecard.externalBlockers.includes('real PoE compliance/safety review'))
})

test('DigiKey quote depth uses ProductInformation fallback when Quote endpoint is not proven', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'bf-quote-depth-'))
  const result = await writeDigiKeyQuoteDepthReport({ projectDir, productInfoRows: [{ MPN: 'RC0603FR-0710KL', quantityAvailable: 1000 }] })
  assert.equal(result.report.source, 'LIVE_DIGIKEY_PRODUCTINFO_PRICEBREAKS')
  assert.equal(result.report.autoOrdering, false)
})

test('Quote readiness live depth documents blocked direct Quote API without auto ordering', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'bf-quote-blocked-'))
  const result = await writeDigiKeyQuoteDepthReport({ projectDir, error: new Error('permission redacted') })
  assert.equal(result.report.source, 'BLOCKED_BY_API')
  assert.equal(result.report.autoOrdering, false)
})

test('SupplyChain capability is read-only and honest', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'bf-supplychain-'))
  const result = await writeSupplyChainCapabilityReport({ projectDir, enabledApis: ['ProductInformationV4', 'SupplyChainAPI'] })
  assert.equal(result.report.noOrderMutation, true)
  assert.match(result.report.status, /SUPPLYCHAIN_/)
})

test('import benchmark suite reports sandbox safety and honest blockers', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'bf-import-benchmark-'))
  const result = await writeImportBenchmarkSuiteReport({ rootDir })
  assert.equal(result.report.projects.length, 10)
  assert.equal(result.report.sandboxSafetyRate, 100)
  assert.equal(result.report.honestBlockerAccuracy, 100)
})

test('manufacturing package authenticity and JLCPCB readiness reports do not fake assembly', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'bf-mfg-auth-'))
  const auth = await writeManufacturingPackageAuthenticityReport({ projectDir })
  const jlc = await writeJlcpcbReadinessReport({ projectDir, pcbFabReady: true, assemblyVerified: false })
  assert.equal(auth.report.placeholderFilesDetected, false)
  assert.equal(jlc.report.noFakeAssembly, true)
})

test('library coverage auditor and footprint confidence expose review risk', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'bf-library-'))
  const coverage = await writeLibraryCoverageReport({ projectDir, components: [{ ref: 'U1', model3d: 'missing' }] })
  const confidence = scoreFootprintConfidence({ symbolPresent: true, footprintPresent: true, packageMatch: 'unknown' })
  assert.equal(coverage.report.footprintCoverage, 100)
  assert.equal(confidence.status, 'REVIEW_RECOMMENDED')
})

test('security privacy report tracks local-first guarantees', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'bf-security-'))
  const result = await writeSecurityPrivacyReport({ projectDir })
  assert.equal(result.report.noCloudUploadByDefault, true)
  assert.equal(result.report.noSecretsInReports, true)
})

test('performance benchmark writes reliability targets', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'bf-performance-'))
  const result = await writePerformanceBenchmark({ projectDir })
  assert.equal(result.report.cleanShutdown, true)
})

test('engineering copilot uses artifact-only next actions', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'bf-copilot-'))
  const result = await writeProjectNextActionsReport({ projectDir, state: { sourcing: 'SOURCABLE_WITH_WARNINGS' } })
  assert.equal(result.report.hallucinationPolicy, 'artifact_only')
  assert.ok(result.report.actions.length > 0)
})

test('local engine supports new 91-to-99 job types', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'bf-jobs-99-'))
  const route = createLocalServerRouter({ rootDir })
  for (const type of ['digikey_quote_depth', 'digikey_supplychain_capability', 'manufacturing_authenticity', 'library_coverage', 'security_privacy', 'performance_benchmark', 'engineering_copilot']) {
    const response = await route({ method: 'POST', pathname: '/jobs/start', payload: { type, projectId: `P-${type}` } })
    assert.equal(response.ok, true, type)
  }
})

test('web sourcing command center exposes live job buttons and no-secret language', async () => {
  const component = await readFile(path.resolve('apps/web/src/components/project/SourcingCommandCenter.tsx'), 'utf8')
  for (const label of ['Check DigiKey Status', 'Run DigiKey Verification', 'Run Quote Readiness', 'Find Alternative Parts', 'Open Supplier Matrix']) assert.match(component, new RegExp(label))
  assert.match(component, /no browser-exposed supplier secrets/i)
})

test('engineering copilot panel is present on project page', async () => {
  const page = await readFile(path.resolve('apps/web/src/app/projects/[id]/page.tsx'), 'utf8')
  assert.match(page, /EngineeringCopilotPanel/)
})

import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { calculateIsolationCreepage } from '../lib/electrical/isolation-creepage-calculator.mjs'
import { buildPoeRevDPartSelection } from '../lib/poe/poe-rev-d-part-selection.mjs'
import { generatePoeRevDProof } from '../lib/poe/poe-rev-d-workflow.mjs'

test('PoE REV_D part selection uses real candidate MPNs and does not fake stock', () => {
  const selection = buildPoeRevDPartSelection({ envAvailable: false })
  const mpns = new Set(selection.parts.map((part) => part.selectedMPN))
  for (const expected of ['HR911105A', 'TPS2375PW', 'W5500', 'Ag9900M']) assert.ok(mpns.has(expected), `missing ${expected}`)
  assert.equal(selection.parts.length >= 10, true)
  for (const part of selection.parts) {
    assert.equal(part.sourcingStatus, 'NOT_CHECKED')
    assert.equal(part.stockStatus, 'UNKNOWN')
    assert.equal(part.assemblyAvailability, 'UNKNOWN')
    assert.match(part.risk, /API keys missing/)
  }
})

test('isolation creepage calculator passes precheck with review required for adequate PoE boundary', () => {
  const report = calculateIsolationCreepage({
    selectedGapMm: 5.2,
    slotLengthMm: 8,
    copperCrossings: [],
  })
  assert.equal(report.status, 'ISOLATION_PRECHECK_PASS_REVIEW_REQUIRED')
  assert.equal(report.complianceCertified, false)
  assert.equal(report.engineeringReviewRequired, true)
  assert.equal(report.violations.length, 0)
  assert.equal(report.copperKeepout.status, 'PASS')
  assert.ok(report.estimatedClearanceMm >= report.rules.recommendedClearanceMm)
  assert.ok(report.estimatedCreepageMm >= report.rules.recommendedCreepageMm)
})

test('PoE isolation boundary blocks copper crossings', () => {
  const report = calculateIsolationCreepage({
    selectedGapMm: 5.2,
    slotLengthMm: 8,
    copperCrossings: ['ETH_CT_TO_LOGIC_GND'],
  })
  assert.equal(report.status, 'ISOLATION_REVIEW_BLOCKED')
  assert.ok(report.violations.includes('COPPER_CROSSES_ISOLATION_BOUNDARY'))
  assert.equal(report.copperKeepout.status, 'VIOLATION')
})

test('PoE REV_D schematic confidence lifts selected-parts proof while preserving sourcing blocker', async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-poe-rev-d-'))
  const proof = await generatePoeRevDProof({ outputDir, env: {} })
  assert.equal(proof.schematicConfidence.overallConfidence >= 82, true)
  assert.equal(proof.manufacturingState.pcbFab, 'PCB_FAB_READY')
  assert.equal(proof.manufacturingState.assembly, 'ASSEMBLY_READY_NOT_VERIFIED')
  assert.equal(proof.manufacturingState.sourcing, 'BLOCKED_SOURCING')
  assert.equal(proof.manufacturingState.compliance, 'BLOCKED_COMPLIANCE_REVIEW')
  assert.ok(proof.exactApiKeyBlocker.includes('DIGIKEY_CLIENT_ID'))
  assert.ok(proof.readinessBlockers.includes('supplier_api_keys_missing_for_stock_and_assembly_verification'))
})

test('PoE REV_D readiness writes part, sourcing, confidence, and isolation evidence artifacts', async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-poe-rev-d-artifacts-'))
  const proof = await generatePoeRevDProof({ outputDir, env: {} })
  const proofFile = JSON.parse(await readFile(path.join(outputDir, 'BoardForge_PoE_REV_D_Proof.json'), 'utf8'))
  const partReport = JSON.parse(await readFile(path.join(outputDir, 'BoardForge_PoE_REV_D_Part_Selection_Report.json'), 'utf8'))
  const isolationReport = JSON.parse(await readFile(path.join(outputDir, 'BoardForge_PoE_REV_D_Isolation_Creepage_Report.json'), 'utf8'))
  const sourcingMd = await readFile(path.join(outputDir, 'BoardForge_PoE_REV_D_Sourcing_API_Status.md'), 'utf8')
  assert.equal(proofFile.schema, 'boardforge.poe-rev-d-proof.v1')
  assert.equal(proof.drc, 0)
  assert.equal(proof.erc, 0)
  assert.equal(proof.unconnected, 0)
  assert.equal(partReport.parts.some((part) => part.selectedMPN === 'TPS2375PW'), true)
  assert.equal(isolationReport.complianceCertified, false)
  assert.match(sourcingMd, /DIGIKEY_CLIENT_ID/)
})

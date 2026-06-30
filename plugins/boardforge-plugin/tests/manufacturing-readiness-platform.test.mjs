import assert from 'node:assert/strict'
import test from 'node:test'
import { buildManufacturingReadinessReport, canExportManufacturingPackage } from '../lib/manufacturing/manufacturing-readiness-report.mjs'

test('manufacturing readiness blocks ZIP promotion when validation is not clean', () => {
  const result = canExportManufacturingPackage({
    manifest: {
      projectId: 'REV_F_STALLED',
      validation: { shorts: 0, unconnected: 23, forbiddenVias: 0, drcViolations: 8, ercViolations: 0 },
      manufacturing: { zip: 'rev-f.zip' },
    },
    artifacts: {
      gerbers: ['a.gbr'],
      drill: ['a.drl'],
      bom: 'bom.csv',
      cpl: 'cpl.csv',
    },
    partVerification: { summary: { total: 3, apiVerified: 3, placeholders: 0, outOfStock: 0, obsolete: 0, notChecked: 0 } },
  })
  assert.equal(result.allowed, false)
  assert.equal(result.status, 'MANUFACTURING_BLOCKED')
  assert.equal(result.blockers.some((gate) => gate.name === 'unconnected_zero'), true)
  assert.equal(result.blockers.some((gate) => gate.name === 'drc_zero'), true)
})

test('manufacturing readiness blocks unchecked sourcing when no API verified evidence exists', () => {
  const report = buildManufacturingReadinessReport({
    manifest: {
      projectId: 'CLEAN_BUT_UNCHECKED_SOURCING',
      validation: { shorts: 0, unconnected: 0, forbiddenVias: 0, drcViolations: 0, ercViolations: 0 },
      manufacturing: { zip: 'candidate.zip' },
    },
    artifacts: {
      gerbers: ['front.gtl'],
      drill: ['board.drl'],
      bom: 'bom.csv',
      cpl: 'cpl.csv',
    },
    partVerification: { summary: { total: 2, apiVerified: 0, notChecked: 2, placeholders: 0, outOfStock: 0, obsolete: 0 } },
  })
  assert.equal(report.ready, false)
  assert.equal(report.blockers.some((gate) => gate.name === 'critical_part_verification'), true)
})

test('manufacturing readiness passes only with clean validation, artifacts, and critical part checks', () => {
  const report = buildManufacturingReadinessReport({
    manifest: {
      projectId: 'REV_E_CLEAN',
      validation: { shorts: 0, unconnected: 0, forbiddenVias: 0, drcViolations: 0, ercViolations: 0 },
      manufacturing: { zip: 'rev-e.zip' },
    },
    artifacts: {
      gerbers: ['front.gtl', 'back.gbl'],
      drill: ['board.drl'],
      bom: 'bom.csv',
      cpl: 'cpl.csv',
    },
    partVerification: { summary: { total: 4, apiVerified: 4, notChecked: 0, placeholders: 0, outOfStock: 0, obsolete: 0 } },
    options: { generatedAt: '2026-06-29T00:00:00.000Z' },
  })
  assert.equal(report.schema, 'boardforge.manufacturing-readiness-report.v1')
  assert.equal(report.ready, true)
  assert.equal(report.status, 'MANUFACTURING_READY')
  assert.equal(report.blockers.length, 0)
  assert.equal(report.policy.noFakeManufacturingReadiness, true)
})

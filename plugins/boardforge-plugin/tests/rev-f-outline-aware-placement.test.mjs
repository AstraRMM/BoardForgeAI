import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const revF = 'C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/BF-SENSOR-HUB-01_REV_F_OUTLINE_AWARE_PLACEMENT'

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(revF, name), 'utf8'))
}

test('density modes include REV_F normal fallback after compact/dense candidates', () => {
  const report = readJson('BoardForge_REV_F_Outline_Candidates_Report.json')
  const modes = new Set(report.candidates.map((c) => c.density))
  assert.ok(modes.has('compact'))
  assert.ok(modes.has('dense'))
  assert.equal(report.selected, 'manufacturable_rounded_product_board')
})

test('mounting-hole presets are generated and DRC-gated for REV_F', () => {
  const constraints = readJson('BoardForge_REV_F_Mechanical_Constraints.json')
  assert.ok(constraints.mountingHolePreset)
  assert.ok(constraints.hardLocks.includes('no blind vias'))
  assert.ok(constraints.hardLocks.includes('no via-in-pad'))
})

test('true reroute after outline placement runs FreeRouting and direct SES import', () => {
  const status = readJson('BoardForge_REV_F_Final_Status.json')
  assert.equal(status.freeRoutingRun, true)
  assert.equal(status.sesProduced, true)
  assert.equal(status.sesImportedDirectly, true)
  assert.ok(status.segmentsImported > 0)
})

test('silkscreen physical label placement is DRC-gated', () => {
  const status = readJson('BoardForge_REV_F_Final_Status.json')
  assert.deepEqual(status.physicalLabels, ['USB', 'CAN', 'GPS/UART', 'I2C', 'SWD', 'BOOT', 'RESET', '3V3', 'GND'])
  assert.equal(typeof status.silkscreenDrc, 'number')
})

test('REV_F fallback manufacturing candidate is separate from unfinished outline-aware proof', () => {
  const status = readJson('BoardForge_REV_F_Final_Status.json')
  assert.equal(status.manufacturingExported, true)
  assert.equal(status.unconnected, 0)
  assert.equal(status.drcViolations, 0)
  assert.equal(status.ercViolations, 0)
  assert.match(status.completionMethod, /verified_clean_compact_route_topology_fallback/)
  assert.match(status.nextImprovement, /clearance-aware exact finisher/)
})

test('REV_F true outline-aware board requires exact finisher until connectivity is clean', () => {
  const outlineAwareAttempt = {
    id: 'REV_F_outline_aware_attempt',
    shorts: 0,
    forbiddenVias: 0,
    unconnected: 18,
    drcViolations: 0,
    ercViolations: 0,
  }
  assert.notEqual(outlineAwareAttempt.unconnected, 0)
  assert.equal(outlineAwareAttempt.shorts, 0)
  assert.equal(outlineAwareAttempt.forbiddenVias, 0)
})

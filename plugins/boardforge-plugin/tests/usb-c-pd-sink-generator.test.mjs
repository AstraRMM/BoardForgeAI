import test from 'node:test'
import assert from 'node:assert/strict'
import { usbCPdSinkCategoryPcbEvidence as generate } from '../lib/real-board-proof.mjs'

test('Board004 emits the exact twelve-component protected PD power chain', () => {
  const evidence = generate()
  assert.deepEqual(
    evidence.footprints.map((footprint) => footprint.ref).sort(),
    ['C1', 'C2', 'D1', 'F1', 'J1', 'J2', 'L1', 'Q1', 'R_FB_BOTTOM', 'R_FB_TOP', 'U1', 'U2'],
  )
  assert.deepEqual(
    evidence.nets.map((net) => net.name).filter(Boolean),
    ['GND', 'VBUS_RAW', 'VBUS_PROTECTED', 'VBUS_SWITCHED', '5V', 'CC1', 'CC2', 'VBUS_EN_SNK', 'SW', 'FB'],
  )
  assert.ok(evidence.segments.length > 20)
  assert.ok(evidence.vias.length > 10)
})

test('Board004 stock-safe replacements retain canonical values, footprints, and pad identity', () => {
  const footprints = new Map(generate().footprints.map((footprint) => [footprint.ref, footprint]))
  const expected = {
    Q1: ['SI7465DP-T1-GE3', 'Package_SO:PowerPAK_SO-8_Single', [['1', 'VBUS_PROTECTED'], ['2', 'VBUS_PROTECTED'], ['3', 'VBUS_PROTECTED'], ['4', 'VBUS_EN_SNK'], ['5', 'VBUS_SWITCHED'], ['6', 'VBUS_SWITCHED'], ['7', 'VBUS_SWITCHED'], ['8', 'VBUS_SWITCHED']]],
    U2: ['TPS54202DDCR', 'Package_TO_SOT_SMD:SOT-23-6', [['1', 'SW'], ['2', 'GND'], ['3', 'FB'], ['4', 'VBUS_SWITCHED'], ['5', 'VBUS_SWITCHED'], ['6', 'SW']]],
    F1: ['3413.0218.22', 'Resistor_SMD:R_2512_6332Metric', [['1', 'VBUS_RAW'], ['2', 'VBUS_PROTECTED']]],
    C1: ['UWT1H100MCL1GB', 'Capacitor_SMD:CP_Elec_6.3x5.4', [['1', 'VBUS_PROTECTED'], ['2', 'GND']]],
    C2: ['UWT1E220MCL1GB', 'Capacitor_SMD:CP_Elec_6.3x5.4', [['1', '5V'], ['2', 'GND']]],
    R_FB_TOP: ['73.2k', 'Resistor_SMD:R_0603_1608Metric', [['1', '5V'], ['2', 'FB']]],
    R_FB_BOTTOM: ['10k', 'Resistor_SMD:R_0603_1608Metric', [['1', 'FB'], ['2', 'GND']]],
  }
  for (const [ref, [value, footprintName, pads]] of Object.entries(expected)) {
    const footprint = footprints.get(ref)
    assert.ok(footprint, `${ref} must be generated`)
    assert.equal(footprint.value, value, `${ref} value`)
    assert.equal(footprint.footprint, footprintName, `${ref} footprint`)
    assert.deepEqual(footprint.pads.map((pad) => [pad.number, pad.netName]), pads, `${ref} pad identity`)
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TPS25750_BREAKOUT_POLICY,
  buildTps25750BreakoutPlan,
  generateTps25750LocalBreakout,
  generateTps25750LocalBreakoutV3,
  validateDenseControllerPlacement,
  generateTps25750LocalBreakoutV4,
  generateTps25750GlobalHandoff,
  validateDenseFootprintGeometry,
} from '../lib/routing/dense-qfn-power-breakout-planner.mjs'
import { usbCPdSourceCategoryPcbEvidence } from '../lib/real-board-proof.mjs'

test('TPS25750 policy preserves grouped power identities and conservative via arrays', () => {
  assert.deepEqual(TPS25750_BREAKOUT_POLICY.groups.GND, ['11', '12', '14', '31', '39'])
  assert.deepEqual(TPS25750_BREAKOUT_POLICY.groups.DRAIN, ['15', '30', '40'])
  assert.deepEqual(TPS25750_BREAKOUT_POLICY.groups.PPHV, ['20', '21', '22'])
  assert.deepEqual(TPS25750_BREAKOUT_POLICY.groups.VBUS_IN, ['23', '24', '25'])
  assert.deepEqual(TPS25750_BREAKOUT_POLICY.groups.VBUS, ['32', '33'])
  assert.deepEqual(TPS25750_BREAKOUT_POLICY.groups.PP5V, ['34', '35'])
  assert.equal(TPS25750_BREAKOUT_POLICY.minimumPowerGroupVias, 6)
})

test('actual Board005 neighbor geometry fails closed before breakout routing', () => {
  const result = validateDenseControllerPlacement({
    controller: { ref: 'U2', at: { x: 27, y: 10.5 }, body: { w: 7, h: 7 } },
    foreignFootprints: [
      { ref: 'U3', at: { x: 27, y: 18 }, body: { w: 5, h: 5 } },
      { ref: 'C_3V3', at: { x: 20, y: 5.5 }, body: { w: 5.4, h: 6.3 } },
      { ref: 'C_1V5', at: { x: 34, y: 15 }, body: { w: 5.4, h: 6.3 } },
    ],
    requiredHaloMm: 1,
  })
  assert.equal(result.accepted, false)
  assert.deepEqual(result.blockers.sort(), ['C_1V5', 'C_3V3', 'U3'])
})

test('v26 exported placement provides halo and model-routeable actual rail pads', () => {
  const evidence=usbCPdSourceCategoryPcbEvidence(),u2=evidence.footprints.find(f=>f.ref==='U2'),foreign=evidence.footprints.filter(f=>f.ref!=='U2')
  assert.equal(validateDenseControllerPlacement({controller:u2,foreignFootprints:foreign,requiredHaloMm:1}).accepted,true)
  const pads=u2.pads.map(p=>({number:p.number,net:p.netName,x:p.x,y:p.y,widthMm:p.w,heightMm:p.h}))
  const breakout=generateTps25750LocalBreakoutV4({pads})
  const rails=new Set(['GND','DRAIN','VBUS','PP5V','3V3'])
  const endpoints=foreign.flatMap(f=>f.pads.filter(p=>rails.has(p.netName)).map(p=>({net:p.netName,x:f.at.x+p.x-u2.at.x,y:f.at.y+p.y-u2.at.y,widthMm:p.w,heightMm:p.h,diameterMm:Math.max(p.w,p.h),smd:true,ref:f.ref,pad:p.number})))
  const occupancy=foreign.flatMap(f=>f.pads.map(p=>({net:p.netName,x:f.at.x+p.x-u2.at.x,y:f.at.y+p.y-u2.at.y,widthMm:p.w,heightMm:p.h})))
  const global=generateTps25750GlobalHandoff({breakout,externalEndpoints:endpoints,foreignOccupancy:occupancy,stepMm:.25,boardBounds:{minX:-u2.at.x+.75,maxX:62-u2.at.x-.75,minY:-u2.at.y+.75,maxY:32-u2.at.y-.75}})
  assert.equal(global.modelAccepted,true,JSON.stringify(global.failedNets))
  assert.equal(global.accepted,false)
  assert.equal(global.immutableOccupancy.segments,breakout.segments)
})

test('v3 emits complete ready-to-serialize paths for every grouped pad', () => {
  const result = generateTps25750LocalBreakoutV3({ pads: exactTps25750Fixture(), escapeLengthMm: 0.8, clearanceMm: 0.2, stepMm: 0.1 })
  assert.equal(result.modelAccepted, true, JSON.stringify({ failedPads: result.failedPads, collisions: result.collisions.slice(0, 5) }))
  assert.equal(result.accepted, false)
  assert.equal(result.acceptanceBlocker, 'kicad_cli_drc_zero_proof_required')
  assert.equal(result.invariants.allPowerPadsConnected, true)
  assert.equal(result.invariants.callerSegmentsRequired, false)
  assert.ok(result.segments.every((segment) => segment.kind === 'validated_staged_escape'))
  assert.deepEqual(new Set(result.segments.map((segment) => segment.fromPad)), new Set(['1', '11', '12', '14', '15', '23', '24', '25', '30', '31', '32', '33', '34', '35', '38', '39', '40']))
})

test('v3 cannot claim acceptance without a zero-error zero-warning KiCad gate', () => {
  const pads = exactTps25750Fixture()
  assert.equal(generateTps25750LocalBreakoutV3({ pads, kicadDrc: { ran: true, errors: 1, warnings: 0, unconnected: 0 } }).accepted, false)
  assert.equal(generateTps25750LocalBreakoutV3({ pads, kicadDrc: { ran: true, errors: 0, warnings: 0, unconnected: 0 } }).accepted, true)
})

function exactTps25750Fixture() {
  const net = { 1: '3V3', 11: 'GND', 12: 'GND', 14: 'GND', 15: 'DRAIN', 20: 'NC', 21: 'NC', 22: 'NC', 23: 'VBUS', 24: 'VBUS', 25: 'VBUS', 30: 'DRAIN', 31: 'GND', 32: 'VBUS', 33: 'VBUS', 34: 'PP5V', 35: 'PP5V', 38: '3V3', 39: 'GND', 40: 'DRAIN' }
  const pads = []
  for (let pin = 1; pin <= 10; pin += 1) pads.push({ number: pin, net: net[pin] ?? `S${pin}`, x: -3.2, y: -1.8 + (pin - 1) * 0.4, widthMm: 0.35, heightMm: 0.18 })
  for (let pin = 11; pin <= 19; pin += 1) pads.push({ number: pin, net: net[pin] ?? `S${pin}`, x: -1.6 + (pin - 11) * 0.4, y: 2.2, widthMm: 0.18, heightMm: 0.35 })
  for (let pin = 20; pin <= 29; pin += 1) pads.push({ number: pin, net: net[pin] ?? `S${pin}`, x: 3.2, y: 1.8 - (pin - 20) * 0.4, widthMm: 0.35, heightMm: 0.18 })
  for (let pin = 30; pin <= 38; pin += 1) pads.push({ number: pin, net: net[pin] ?? `S${pin}`, x: 1.6 - (pin - 30) * 0.4, y: -2.2, widthMm: 0.18, heightMm: 0.35 })
  pads.push({ number: 39, net: 'GND', x: -0.7, y: 0, widthMm: 1, heightMm: 1 }, { number: 40, net: 'DRAIN', x: 0.7, y: 0, widthMm: 1, heightMm: 1 })
  return pads
}

test('exact TPS25750 fixture emits collision-free used vias and router endpoints', () => {
  const result = generateTps25750LocalBreakout({ pads: exactTps25750Fixture(), escapeLengthMm: 0.6, clearanceMm: 0.1 })
  assert.equal(result.accepted, true, JSON.stringify(result.collisions))
  assert.equal(result.invariants.crossNetCollisions, 0)
  assert.equal(result.invariants.allViasUsed, true)
  assert.equal(result.escapeEndpoints.length, result.vias.length)
  assert.equal(result.vias.length, 5)
  assert.deepEqual(result.excludedPads, ['20', '21', '22'])
  assert.ok(result.escapeEndpoints.some((endpoint) => endpoint.net === 'PP5V'))
  assert.ok(result.localCopperGroups.find((group) => group.net === 'GND').links.some((link) => link.fromPad === '11' && link.toPad === '12'))
  assert.equal(result.localCopperGroups.find((group) => group.net === 'VBUS').links.length, 3)
  assert.equal(result.localCopperGroups.some((group) => group.net === 'NC'), false)
})

test('local breakout reports a foreign-pad collision instead of emitting a false-safe plan', () => {
  const pads = [
    { number: 34, net: 'PP5V', x: 1, y: 0, diameterMm: 0.2 },
    { number: 9, net: 'I2C_SCL', x: 1.3, y: 0, diameterMm: 0.2 },
  ]
  const result = generateTps25750LocalBreakout({ pads, escapeLengthMm: 0.8, foreignOccupancy: [
    { id: 'translated-track-via', net: 'I2C_SCL', x: 0.8, y: -0.9, diameterMm: 0.4 },
  ] })
  assert.equal(result.accepted, false)
  assert.equal(result.collisions[0].foreignPad, 'translated-track-via')
  assert.equal(result.collisions[0].kind, 'via_to_foreign_occupancy')
})

test('exact fixture via disks clear every foreign pad and each other', () => {
  const pads = exactTps25750Fixture()
  const result = generateTps25750LocalBreakout({ pads, escapeLengthMm: 0.8 })
  for (const item of result.vias) {
    for (const pad of pads.filter((candidate) => candidate.net !== item.net)) {
      const padRadius = Math.max(pad.widthMm, pad.heightMm) / 2
      assert.ok(Math.hypot(item.at.x - pad.x, item.at.y - pad.y) - item.diameterMm / 2 - padRadius >= 0.2)
    }
  }
  for (let left = 0; left < result.vias.length; left += 1) for (let right = left + 1; right < result.vias.length; right += 1) {
    assert.ok(Math.hypot(result.vias[left].at.x - result.vias[right].at.x, result.vias[left].at.y - result.vias[right].at.y) - result.vias[left].diameterMm >= 0.2)
  }
})

test('rejects the hand-authored dense-pad geometry pattern before routing', () => {
  const geometry = validateDenseFootprintGeometry({ pads: [
    { number: 2, net: 'ADCIN1', x: 0, y: 0, diameterMm: 0.35 },
    { number: 38, net: 'VIN_3V3', x: 0.4019, y: 0, diameterMm: 0.35 },
  ] })
  assert.equal(geometry.valid, false)
  assert.ok(Math.abs(geometry.conflicts[0].gapMm - 0.0519) < 1e-9)
})

test('fails closed for non-canonical footprint and inadequate edge inset', () => {
  const plan = buildTps25750BreakoutPlan({ footprint: 'Generated:TPS25750', edgeInsetMm: 0.5 })
  assert.equal(plan.accepted, false)
  assert.deepEqual(plan.errors, ['unverified_dense_footprint', 'insufficient_board_copper_inset'])
})

test('accepts verified footprint metadata with clearance-safe supplied geometry', () => {
  const plan = buildTps25750BreakoutPlan({
    footprint: TPS25750_BREAKOUT_POLICY.footprint,
    pads: [
      { number: 1, net: 'A', x: 0, y: 0, diameterMm: 0.2 },
      { number: 2, net: 'B', x: 0.4, y: 0, diameterMm: 0.2 },
    ],
  })
  assert.equal(plan.accepted, true)
  assert.equal(plan.stages.at(-1), 'run_clearance_edge_and_courtyard_validation')
})

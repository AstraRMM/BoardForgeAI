import test from 'node:test'
import assert from 'node:assert/strict'
import { approvedAssetFor } from '../lib/components/approved-production-assets.mjs'
import { resolveAuthoritativeKiCadFootprint } from '../lib/components/authoritative-kicad-footprint-resolver.mjs'
import { resolveAuthoritativeKiCadSymbol } from '../lib/components/authoritative-kicad-symbol-resolver.mjs'
import { W5500_CONNECTED_CT_REFERENCE, validateW5500ConnectedCtTopology } from '../lib/phase2c/w5500-connected-ct-reference.mjs'
import { ethernetControllerCategoryPcbEvidence } from '../lib/real-board-proof.mjs'
import { w5500ConnectedCentreTapFixedCorridors } from '../lib/routing/authoritative-pad-routing.mjs'

const referenceInput = () => ({
  nets: Object.entries(W5500_CONNECTED_CT_REFERENCE.nets).map(([net, endpoints]) => ({
    net, endpoints: endpoints.map(item => {
      const [ref, pad] = item.split(':')
      return { ref, pad, x: 0, y: 0 }
    }),
  })),
})

test('Board010 connected-centre-tap topology preserves WIZnet matching branches instead of inventing direct pair trees', () => {
  const gate = validateW5500ConnectedCtTopology(referenceInput())
  assert.equal(gate.valid, true, gate.errors.join('; '))
  assert.equal(W5500_CONNECTED_CT_REFERENCE.magJack.mpn, '7499010121A')
  assert.equal(W5500_CONNECTED_CT_REFERENCE.magJack.nonPoe, true)
  assert.ok(W5500_CONNECTED_CT_REFERENCE.sourceEvidence.some(url => /wiznet/i.test(url)))
  assert.deepEqual(W5500_CONNECTED_CT_REFERENCE.nets.ETH_TXP, ['U2:2', 'J1:1', 'R_TXP:1'])
  assert.deepEqual(W5500_CONNECTED_CT_REFERENCE.nets.ETH_RXP_PHY, ['U2:6', 'R_RXP:1', 'C_RXP:1'])
  assert.deepEqual(W5500_CONNECTED_CT_REFERENCE.nets.ETH_RXP_MAG, ['C_RXP:2', 'J1:4'])
})

test('Board010 reference gate rejects direct RX wiring and phantom cable-side ESD on an integrated MagJack', () => {
  const invalid = referenceInput()
  invalid.nets = invalid.nets.filter(row => !['ETH_RXP_PHY', 'ETH_RXN_PHY', 'ETH_RXP_MAG', 'ETH_RXN_MAG'].includes(row.net))
  invalid.nets.push(
    { net: 'ETH_RXP', endpoints: [{ ref: 'U2', pad: '6' }, { ref: 'J1', pad: '4' }, { ref: 'D_ETH', pad: '4' }] },
    { net: 'ETH_RXN', endpoints: [{ ref: 'U2', pad: '5' }, { ref: 'J1', pad: '6' }, { ref: 'D_ETH', pad: '5' }] },
  )
  const gate = validateW5500ConnectedCtTopology(invalid)
  assert.equal(gate.valid, false)
  assert.ok(gate.errors.some(error => error.startsWith('ETH_RXP_PHY:')))
  assert.ok(gate.errors.some(error => error.includes('unsupported cable-side protection branch D_ETH')))
})

test('connected-centre-tap gate is inapplicable to non-Ethernet authoritative routing', () => {
  const gate = validateW5500ConnectedCtTopology({
    nets: [{ net: 'GND', endpoints: [{ ref: 'U1', pad: '1' }, { ref: 'J1', pad: '2' }] }],
  })
  assert.equal(gate.applicable, false)
  assert.equal(gate.valid, true)
})

test('Board010 emitted canonical pad map satisfies the connected-centre-tap topology gate', () => {
  const evidence = ethernetControllerCategoryPcbEvidence()
  const nets = Object.entries(W5500_CONNECTED_CT_REFERENCE.nets).map(([net, endpoints]) => ({
    net,
    endpoints: endpoints.map(endpoint => {
      const [ref, pad] = endpoint.split(':')
      const footprint = evidence.footprints.find(item => item.ref === ref)
      const physical = footprint?.pads.find(item => String(item.number) === pad)
      assert.equal(physical?.netName, net, `${endpoint} must be projected onto ${net}`)
      return { ref, pad, x: 0, y: 0 }
    }),
  }))
  const gate = validateW5500ConnectedCtTopology({ nets })
  assert.equal(gate.valid, true, gate.errors.join('; '))
})

test('Board010 reserves independent authoritative copper lanes for the transformer-side reference branches', () => {
  const evidence = ethernetControllerCategoryPcbEvidence()
  const input = {
    bounds: { maxX: 43, maxY: 27 },
    nets: evidence.nets.filter(item => item.name).map(item => ({
      net: item.name,
      endpoints: evidence.footprints.flatMap(footprint => footprint.pads
        .filter(pad => pad.netName === item.name)
        .map(pad => ({ ref: footprint.ref, pad: pad.number, x: ({ U2: 6.588, J1: 26.04, R_TX_CT: 1.925, C_RXP: 3.525, C_RXN: 3.525 })[footprint.ref] || 4, y: ({ 'U2:2': 4.25, 'U2:1': 3.75, 'J1:2': 15.27, 'J1:4': 17.81, 'J1:6': 20.35, 'R_TX_CT:1': 1.5, 'C_RXP:2': 4, 'C_RXN:2': 6.5 })[`${footprint.ref}:${pad.number}`] || 4 }))),
    })),
  }
  const route = w5500ConnectedCentreTapFixedCorridors(input)
  assert.deepEqual(route.completedNets, [])
  assert.deepEqual(route.partialNets.sort(), ['ETH_RXN_PHY', 'ETH_RXP_PHY'])
  assert.equal(route.denseRoutingStrategy, 'w5500-connected-centre-tap-v1')
  assert.ok(route.tracks.some(track => track.layer === 'In1.Cu'))
  assert.ok(route.tracks.some(track => track.layer === 'In2.Cu'))
})

test('Board010 reference-only parts have installed KiCad symbols and footprints', () => {
  for (const mpn of ['RC0603FR-0710RL', 'CC0603KRX7R9BB682']) {
    const asset = approvedAssetFor(mpn)
    assert.ok(asset, mpn)
    assert.ok(resolveAuthoritativeKiCadSymbol(asset.symbol.libId).pins.length, `${mpn} symbol`)
    assert.ok(resolveAuthoritativeKiCadFootprint(asset.footprint.libId).pads.length, `${mpn} footprint`)
  }
})

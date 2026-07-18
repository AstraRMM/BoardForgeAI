import test from 'node:test'
import assert from 'node:assert/strict'
import { approvedAssetFor } from '../lib/components/approved-production-assets.mjs'
import { resolveAuthoritativeKiCadFootprint } from '../lib/components/authoritative-kicad-footprint-resolver.mjs'
import { resolveAuthoritativeKiCadSymbol } from '../lib/components/authoritative-kicad-symbol-resolver.mjs'
import { W5500_CONNECTED_CT_REFERENCE, validateW5500ConnectedCtTopology } from '../lib/phase2c/w5500-connected-ct-reference.mjs'

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

test('Board010 reference-only parts have installed KiCad symbols and footprints', () => {
  for (const mpn of ['RC0603FR-0710RL', 'CC0603KRX7R9BB682']) {
    const asset = approvedAssetFor(mpn)
    assert.ok(asset, mpn)
    assert.ok(resolveAuthoritativeKiCadSymbol(asset.symbol.libId).pins.length, `${mpn} symbol`)
    assert.ok(resolveAuthoritativeKiCadFootprint(asset.footprint.libId).pads.length, `${mpn} footprint`)
  }
})

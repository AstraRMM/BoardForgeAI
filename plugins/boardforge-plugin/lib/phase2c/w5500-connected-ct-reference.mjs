import { approvedAssetFor } from '../components/approved-production-assets.mjs'

/**
 * The exact connected-centre-tap network published by WIZnet.  This is a
 * topology specification for a real schematic, not a routing shortcut:
 * W5500's reference deliberately has matching branches and RX series caps,
 * so it must never be reduced to four direct U2-to-MagJack net trees.
 */
export const W5500_CONNECTED_CT_REFERENCE = Object.freeze({
  schema: 'boardforge.w5500-connected-centre-tap-reference.v1',
  sourceEvidence: Object.freeze([
    'https://docs.wiznet.io/Product/Chip/Ethernet/W5500/ref-schematic',
    'https://docs.wiznet.io/assets/images/w5500_schematic-connected-cts_003-cd3d18a8736283ecf62d7e27997ccde3.jpg',
    'https://www.we-online.com/components/products/datasheet/7499010121A.pdf',
  ]),
  magJack: Object.freeze({ mpn: '7499010121A', connectedCentreTap: true, nonPoe: true }),
  parts: Object.freeze([
    Object.freeze({ ref: 'R_TXP', mpn: 'RC0603FR-0749R9L', value: '49.9 Ohm 1% TXP AVDD matching' }),
    Object.freeze({ ref: 'R_TXN', mpn: 'RC0603FR-0749R9L', value: '49.9 Ohm 1% TXN AVDD matching' }),
    Object.freeze({ ref: 'R_RXP', mpn: 'RC0603FR-0749R9L', value: '49.9 Ohm 1% RXP bias matching' }),
    Object.freeze({ ref: 'R_RXN', mpn: 'RC0603FR-0749R9L', value: '49.9 Ohm 1% RXN bias matching' }),
    Object.freeze({ ref: 'R_TX_CT', mpn: 'RC0603FR-0710RL', value: '10 Ohm 1% TX centre-tap feed' }),
    Object.freeze({ ref: 'C_RXP', mpn: 'CC0603KRX7R9BB682', value: '6.8 nF RX+ series isolation' }),
    Object.freeze({ ref: 'C_RXN', mpn: 'CC0603KRX7R9BB682', value: '6.8 nF RX- series isolation' }),
    Object.freeze({ ref: 'C_RX_MATCH', mpn: 'CC0603KRX7R9BB103', value: '10 nF RX matching-node bypass' }),
    Object.freeze({ ref: 'C_AVDD_REF', mpn: 'CL10B104KB8NNNC', value: '100 nF AVDD bypass' }),
  ]),
  nets: Object.freeze({
    ETH_TXP: Object.freeze(['U2:2', 'J1:1', 'R_TXP:1']),
    ETH_TXN: Object.freeze(['U2:1', 'J1:3', 'R_TXN:1']),
    ETH_TX_CT: Object.freeze(['J1:2', 'R_TX_CT:1']),
    ETH_RXP_PHY: Object.freeze(['U2:6', 'R_RXP:1', 'C_RXP:1']),
    ETH_RXN_PHY: Object.freeze(['U2:5', 'R_RXN:1', 'C_RXN:1']),
    ETH_RXP_MAG: Object.freeze(['C_RXP:2', 'J1:4']),
    ETH_RXN_MAG: Object.freeze(['C_RXN:2', 'J1:6']),
    ETH_RX_MATCH: Object.freeze(['R_RXP:2', 'R_RXN:2', 'C_RX_MATCH:1']),
    '3V3A': Object.freeze(['R_TXP:2', 'R_TXN:2', 'R_TX_CT:2', 'C_AVDD_REF:1']),
    GND: Object.freeze(['C_RX_MATCH:2', 'C_AVDD_REF:2']),
  }),
  routingPolicy: Object.freeze({
    copperLayers: 4,
    differentialSections: Object.freeze([
      Object.freeze({ positive: 'ETH_TXP', negative: 'ETH_TXN', endpoints: Object.freeze(['U2', 'J1']) }),
      Object.freeze({ positive: 'ETH_RXP_PHY', negative: 'ETH_RXN_PHY', endpoints: Object.freeze(['U2', 'C_RXP/C_RXN']) }),
      Object.freeze({ positive: 'ETH_RXP_MAG', negative: 'ETH_RXN_MAG', endpoints: Object.freeze(['C_RXP/C_RXN', 'J1']) }),
    ]),
    forbiddenBranches: Object.freeze(['D_ETH']),
    note: '7499010121A exposes only transformer-side pins; cable-side TVS cannot be claimed without a separately source-backed magnetic/cable protection architecture.',
  }),
})

function endpointSet(endpoints = []) {
  return [...new Set(endpoints.map(endpoint => `${endpoint.ref}:${endpoint.pad}`))].sort()
}

/** Validate a placed KiCad topology against the WIZnet reference, including
 * all intentional three-terminal matching trees. */
export function validateW5500ConnectedCtTopology(input = {}, reference = W5500_CONNECTED_CT_REFERENCE) {
  const byNet = new Map((input.nets || []).map(row => [row.net, endpointSet(row.endpoints)]))
  // GND and 3V3A are intentionally shared names across unrelated boards.  A
  // connected-centre-tap rule is relevant only when an actual W5500/MagJack
  // PHY-side signature is present; otherwise it must remain transparent to
  // every other authoritative router.
  const phyMagJackSignature = [
    ['ETH_TXP', 'U2', 'J1'], ['ETH_TXN', 'U2', 'J1'],
    ['ETH_RXP_PHY', 'U2', 'C_RXP'], ['ETH_RXN_PHY', 'U2', 'C_RXN'],
    ['ETH_RXP_MAG', 'C_RXP', 'J1'], ['ETH_RXN_MAG', 'C_RXN', 'J1'],
  ]
  const applicable = phyMagJackSignature.some(([net, first, second]) => {
    const endpoints = byNet.get(net) || []
    return endpoints.some(endpoint => endpoint.startsWith(`${first}:`)) && endpoints.some(endpoint => endpoint.startsWith(`${second}:`))
  })
  if (!applicable) return {
    schema: 'boardforge.w5500-connected-centre-tap-topology-gate.v1',
    applicable: false, valid: true, errors: [], requiredPartCount: reference.parts.length,
    sourceEvidence: reference.sourceEvidence,
  }
  const errors = []
  for (const [net, expected] of Object.entries(reference.nets)) {
    const actual = byNet.get(net) || []
    const wanted = [...expected].sort()
    // The reference's two supply nets are local branches of larger board
    // rails.  Require every source-backed branch endpoint there, while pair
    // and matching networks remain exact (and thus reject phantom branches).
    const isSharedSupply = net === '3V3A' || net === 'GND'
    const matches = isSharedSupply
      ? wanted.every(endpoint => actual.includes(endpoint))
      : JSON.stringify(actual) === JSON.stringify(wanted)
    if (!matches) {
      errors.push(`${net}: expected ${wanted.join(', ') || 'no endpoints'}, got ${actual.join(', ') || 'no endpoints'}`)
    }
  }
  for (const pair of reference.routingPolicy.differentialSections) {
    if (!(byNet.get(pair.positive) || []).length || !(byNet.get(pair.negative) || []).length) {
      errors.push(`differential section missing: ${pair.positive}/${pair.negative}`)
    }
  }
  for (const forbiddenRef of reference.routingPolicy.forbiddenBranches) {
    if ([...byNet.values()].some(endpoints => endpoints.some(endpoint => endpoint.startsWith(`${forbiddenRef}:`)))) {
      errors.push(`unsupported cable-side protection branch ${forbiddenRef}`)
    }
  }
  const missingAssets = reference.parts.filter(part => !approvedAssetFor(part.mpn)).map(part => part.mpn)
  if (missingAssets.length) errors.push(`approved production assets missing: ${[...new Set(missingAssets)].join(', ')}`)
  return {
    schema: 'boardforge.w5500-connected-centre-tap-topology-gate.v1',
    applicable,
    valid: errors.length === 0,
    errors,
    requiredPartCount: reference.parts.length,
    sourceEvidence: reference.sourceEvidence,
  }
}

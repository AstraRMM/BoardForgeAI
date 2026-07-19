import test from 'node:test'
import assert from 'node:assert/strict'
import { buildKiCadRules } from '../lib/kicad-rules-writer.mjs'

test('KiCad rules infer compact W5500 Ethernet differential pair names', () => {
  const rules = buildKiCadRules(
    { name: 'W5500 Ethernet controller' },
    [{ name: 'ETH_TXP' }, { name: 'ETH_TXN' }, { name: 'ETH_RXP' }, { name: 'ETH_RXN' }],
    { minTraceWidthMm: .15, minClearanceMm: .15, minViaDiameterMm: .45, minViaDrillMm: .2 },
  )
  assert.deepEqual(rules.differentialPairs, [
    { positive: 'ETH_TXP', negative: 'ETH_TXN', className: 'ETHERNET_DIFF' },
    { positive: 'ETH_RXP', negative: 'ETH_RXN', className: 'ETHERNET_DIFF' },
  ])
  assert.match(rules.rulesText, /ETH_TXP ETH_TXN differential pair/)
  assert.match(rules.rulesText, /ETH_RXP ETH_RXN differential pair/)
})

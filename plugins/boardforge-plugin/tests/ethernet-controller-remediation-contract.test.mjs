import test from 'node:test'
import assert from 'node:assert/strict'
import manifest from '../../../fixtures/phase2c/50-board-challenge-manifest.mjs'
import {catalogDefinition,validateCatalogSemanticTopology} from '../lib/phase2c/catalog-production-engine.mjs'
import {ethernetControllerProductionProposal,validateEthernetControllerProposal} from '../lib/phase2c/templates/ethernet-controller.mjs'

test('Board010 legacy RP2040 USB instrument fails closed as Ethernet',()=>{
  const definition=catalogDefinition(manifest.boards[9],9),gate=validateCatalogSemanticTopology(definition)
  assert.equal(definition.topologyId,'rp2040-instrument')
  assert.equal(gate.ok,false)
  for(const code of ['ethernet-mac-controller-missing','ethernet-phy-missing','ethernet-rj45-connector-missing','ethernet-magnetics-missing','ethernet-reference-clock-missing','ethernet-phy-reset-network-missing','ethernet-phy-strap-network-missing','ethernet-line-protection-missing','ethernet-line-termination-missing','ethernet-phy-decoupling-missing','ethernet-phy-power-missing'])assert.ok(gate.errors.includes(code),code)
})

test('Board010 remediation proposal uses only approved exact core assets and blocks every unresolved support asset',()=>{
  const gate=validateEthernetControllerProposal(ethernetControllerProductionProposal)
  assert.equal(gate.ok,false)
  assert.equal(gate.areaMm2<=1250,true)
  assert.ok(gate.errors.includes('ethernet-exact-assets-unapproved'))
  assert.deepEqual(gate.blockedRefs,['R_RST','R_MODE','R_TERM','C_XTAL','D_ETH','FB_AVDD'])
  for(const ref of ['U1','U2','Y1','J1','U3','U4','C_DEC'])assert.equal(ethernetControllerProductionProposal.bom.find(x=>x.ref===ref)?.status,'APPROVED_EXACT_ASSET',ref)
})

test('Board010 proposal records the exact non-PoE MagJack limitation and purposeful area-bounded notch',()=>{
  assert.ok(ethernetControllerProductionProposal.limitations.some(x=>/7499010121A.*non-PoE/i.test(x)))
  assert.ok(ethernetControllerProductionProposal.limitations.some(x=>/Adding PoE requires/i.test(x)))
  assert.equal(ethernetControllerProductionProposal.outline.family,'magnetics-notch-ethernet-controller')
  assert.ok(ethernetControllerProductionProposal.outline.purposefulFeatures.rj45Notch)
  assert.equal(validateEthernetControllerProposal({...ethernetControllerProductionProposal,limitations:[]}).errors.includes('ethernet-non-poe-limitation-missing'),true)
})

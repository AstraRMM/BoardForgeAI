import test from 'node:test'
import assert from 'node:assert/strict'
import manifest from '../../../fixtures/phase2c/50-board-challenge-manifest.mjs'
import {catalogDefinition,validateCatalogSemanticTopology} from '../lib/phase2c/catalog-production-engine.mjs'
import {ethernetControllerProductionProposal,validateEthernetControllerProposal} from '../lib/phase2c/templates/ethernet-controller.mjs'
import {approvedAssetFor} from '../lib/components/approved-production-assets.mjs'
import {resolveAuthoritativeKiCadSymbol} from '../lib/components/authoritative-kicad-symbol-resolver.mjs'
import {resolveAuthoritativeKiCadFootprint} from '../lib/components/authoritative-kicad-footprint-resolver.mjs'

test('Board010 legacy RP2040 USB instrument fails closed as Ethernet',()=>{
  const definition=catalogDefinition(manifest.boards[9],9),gate=validateCatalogSemanticTopology(definition)
  assert.equal(definition.topologyId,'rp2040-instrument')
  assert.equal(gate.ok,false)
  for(const code of ['ethernet-mac-controller-missing','ethernet-phy-missing','ethernet-rj45-connector-missing','ethernet-magnetics-missing','ethernet-reference-clock-missing','ethernet-phy-reset-network-missing','ethernet-phy-strap-network-missing','ethernet-line-protection-missing','ethernet-line-termination-missing','ethernet-phy-decoupling-missing','ethernet-phy-power-missing'])assert.ok(gate.errors.includes(code),code)
})

test('Board010 remediation proposal uses approved exact core and support assets but remains evidence blocked',()=>{
  const gate=validateEthernetControllerProposal(ethernetControllerProductionProposal)
  assert.equal(gate.ok,false)
  assert.equal(gate.areaMm2<=1250,true)
  assert.ok(!gate.errors.includes('ethernet-exact-assets-unapproved'))
  assert.deepEqual(gate.blockedRefs,[])
  for(const row of ethernetControllerProductionProposal.bom){assert.equal(row.status,'APPROVED_EXACT_ASSET',row.ref);assert.ok(approvedAssetFor(row.mpn),row.mpn)}
})

test('Board010 support assets resolve to authoritative installed KiCad identities',()=>{for(const mpn of ['RC0603FR-0712K4L','RC0603FR-0749R9L','GRM1885C1H120JA01D','GRM188R71H103KA01D','GRM188R60J475KE19D','MPZ1608S601ATA00','TPD4E05U06DQAR']){const a=approvedAssetFor(mpn);assert.ok(resolveAuthoritativeKiCadSymbol(a.symbol.libId).pins.length,mpn);assert.ok(resolveAuthoritativeKiCadFootprint(a.footprint.libId).pads.length,mpn)}const esd=approvedAssetFor('TPD4E05U06DQAR');assert.equal(esd.symbol.libId,'Power_Protection:TPD4E05U06DQA');assert.equal(esd.footprint.libId,'Package_SON:USON-10_2.5x1.0mm_P0.5mm');assert.deepEqual(esd.symbolPinMap,{1:'ETH_TXP_CABLE',2:'ETH_TXN_CABLE',3:'CHASSIS',4:'ETH_RXP_CABLE',5:'ETH_RXN_CABLE',8:'CHASSIS'})})

test('Board010 source values and crystal-load calculation are frozen without claiming board evidence',()=>{const s=ethernetControllerProductionProposal.supportDesign;assert.equal(s.exres.resistanceOhm,12400);assert.equal(s.lineTermination.resistanceOhm,49.9);assert.equal(s.crystalLoad.crystalLoadPf,8);assert.equal((s.crystalLoad.capacitorEachPf/2)+s.crystalLoad.assumedTotalParasiticPf,8);assert.equal(s.esd.channelCapacitancePf,0.5);assert.equal(s.analogSupply.ratedCurrentA,1);assert.match(ethernetControllerProductionProposal.status,/BLOCKED/);assert.ok(validateEthernetControllerProposal(ethernetControllerProductionProposal).errors.some(x=>/ethernet-evidence-/.test(x)))})

test('Board010 proposal records the exact non-PoE MagJack limitation and purposeful area-bounded notch',()=>{
  assert.ok(ethernetControllerProductionProposal.limitations.some(x=>/7499010121A.*non-PoE/i.test(x)))
  assert.ok(ethernetControllerProductionProposal.limitations.some(x=>/Adding PoE requires/i.test(x)))
  assert.equal(ethernetControllerProductionProposal.outline.family,'magnetics-notch-ethernet-controller')
  assert.ok(ethernetControllerProductionProposal.outline.purposefulFeatures.rj45Notch)
  assert.equal(validateEthernetControllerProposal({...ethernetControllerProductionProposal,limitations:[]}).errors.includes('ethernet-non-poe-limitation-missing'),true)
})

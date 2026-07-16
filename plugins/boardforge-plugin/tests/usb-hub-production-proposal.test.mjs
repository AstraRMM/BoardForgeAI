import test from 'node:test'
import assert from 'node:assert/strict'
import manifest from '../../../fixtures/phase2c/50-board-challenge-manifest.mjs'
import {catalogDefinition,validateCatalogSemanticTopology} from '../lib/phase2c/catalog-production-engine.mjs'
import {usbHubProductionProposal,validateUsbHubProductionProposal} from '../lib/phase2c/templates/usb-hub.mjs'

test('Board011 legacy RP2040 instrument cannot pass as a four-port hub',()=>{const d=catalogDefinition(manifest.boards[10],10),g=validateCatalogSemanticTopology(d);assert.equal(d.topologyId,'rp2040-instrument');assert.equal(g.ok,false);for(const code of ['usb-hub-controller-missing','usb-hub-upstream-port-missing','usb-hub-four-downstream-ports-missing','usb-hub-port-power-control-missing','usb-hub-overcurrent-evidence-missing','usb-hub-clock-evidence-missing','usb-hub-category-mapped-to-mcu-instrument'])assert.ok(g.errors.includes(code),code)})

test('USB2514B installed identity freezes the authoritative 36-QFN plus exposed-pad map',()=>{const h=usbHubProductionProposal.hubIdentity;assert.equal(h.symbol,'Interface_USB:USB2514B_Bi');assert.equal(h.footprint,'Package_DFN_QFN:QFN-36-1EP_6x6mm_P0.5mm_EP3.7x3.7mm');assert.equal(Object.keys(h.pinMap).length,37);assert.equal(h.pinMap[12],'PORT_PWR1');assert.equal(h.pinMap[21],'OVERCURRENT4_N');assert.equal(h.pinMap[37],'GND');assert.equal(h.status,'BLOCKED_NOT_IN_APPROVED_PRODUCTION_REGISTRY')})

test('Board011 proposal has exactly one upstream and four downstream ports and fails on unresolved exact assets',()=>{const g=validateUsbHubProductionProposal(usbHubProductionProposal);assert.equal(g.ok,false);assert.ok(g.errors.includes('usb-hub-exact-assets-unapproved'));assert.deepEqual(g.blockedRefs,['U1','Y1','U_PWR','R_CFG','R_CC_UP','R_CC_DN','U_5V']);assert.equal(usbHubProductionProposal.bom.find(x=>x.ref==='J_UP').quantity,1);assert.equal(usbHubProductionProposal.bom.find(x=>x.ref==='J_DN').quantity,4)})

test('Board011 four-scallop outline remains within the 1600 mm2 manifest limit',()=>{const g=validateUsbHubProductionProposal(usbHubProductionProposal);assert.equal(g.areaMm2,1408);assert.ok(g.areaMm2<=1600);assert.equal(usbHubProductionProposal.outline.purposefulFeatures.downstreamPortScallops,4)})

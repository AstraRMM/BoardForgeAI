import test from 'node:test'
import assert from 'node:assert/strict'
import manifest from '../../../fixtures/phase2c/50-board-challenge-manifest.mjs'
import {catalogDefinition,validateCatalogSemanticTopology} from '../lib/phase2c/catalog-production-engine.mjs'
import {usbIsolatorProductionProposal,validateUsbIsolatorProductionProposal} from '../lib/phase2c/templates/usb-isolator.mjs'

test('Board012 legacy ESP32 shell cannot pass as a USB isolator',()=>{const d=catalogDefinition(manifest.boards[11],11),g=validateCatalogSemanticTopology(d);assert.equal(d.topologyId,'usb-c-esp32-sensor');assert.equal(g.ok,false);for(const code of ['usb-isolator-device-missing','usb-isolator-isolated-power-missing','usb-isolator-upstream-connector-missing','usb-isolator-downstream-connector-missing','usb-isolator-upstream-esd-missing','usb-isolator-downstream-esd-missing','usb-isolator-category-mapped-to-esp32-sensor'])assert.ok(g.errors.includes(code),code)})

test('Board012 freezes exact source-backed data isolation and isolated-power candidates without pretending approval',()=>{const p=usbIsolatorProductionProposal,g=validateUsbIsolatorProductionProposal(p);assert.equal(p.bom.find(x=>x.ref==='U1').mpn,'ADUM3165BRSZ');assert.equal(p.bom.find(x=>x.ref==='U1').footprint,'Package_SO:SSOP-20_5.3x7.2mm_P0.65mm');assert.equal(p.bom.find(x=>x.ref==='U2').mpn,'NXE1S0505MC-R7');assert.equal(p.bom.find(x=>x.ref==='U2').footprint,null);assert.equal(g.ok,false);assert.ok(g.errors.includes('usb-isolator-exact-assets-unapproved'));assert.deepEqual(g.blockedRefs,['U1','U2'])})

test('Board012 requires both-side connectors ESD and exact decoupling in separate ground domains',()=>{const p=usbIsolatorProductionProposal;for(const ref of ['J_UP','J_DN','D_UP','D_DN','C_UP','C_DN'])assert.ok(p.bom.some(x=>x.ref===ref),ref);assert.notEqual(p.domains.upstream.ground,p.domains.downstream.ground);assert.deepEqual(p.domains.directCopperCrossings,[]);const broken=structuredClone(p);broken.domains.downstream.ground='GND_UP';assert.ok(validateUsbIsolatorProductionProposal(broken).errors.includes('usb-isolator-ground-domain-separation-invalid'))})

test('Board012 purposeful isolation waist is within the 1950 mm2 manifest limit',()=>{const g=validateUsbIsolatorProductionProposal(usbIsolatorProductionProposal);assert.equal(g.areaMm2,1704);assert.ok(g.areaMm2<=1950);assert.equal(usbIsolatorProductionProposal.outline.purposefulFeatures.opposedIsolationNotches,2);assert.equal(usbIsolatorProductionProposal.outline.purposefulFeatures.allLayerCopperKeepoutWidthMm,5)})

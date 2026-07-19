import test from'node:test'
import assert from'node:assert/strict'
import manifest from'../../../fixtures/phase2c/50-board-challenge-manifest.mjs'
import{catalogDefinition,validateCatalogSemanticTopology}from'../lib/phase2c/catalog-production-engine.mjs'
import{BOARD009_EXACT_COURTYARD_AREA_PROOF as areaProof,BOARD009_COMPACT_POE_AUDIT as packing}from'../lib/phase2c/board009-isolation-waist-contract.mjs'
import{poeSensorProductionProposal as p,validatePoeSensorArchitecture}from'../lib/phase2c/templates/poe-sensor.mjs'

test('Board009 impossible 42x20 exact packing cannot pass the production gate',()=>{
 const definition=catalogDefinition(manifest.boards[8],8),gate=validateCatalogSemanticTopology(definition)
 assert.equal(definition.widthMm,42);assert.equal(definition.heightMm,20);assert.equal(areaProof.geometricallyPossible,false);assert.equal(packing.geometricallyPossible,false);assert.equal(gate.ok,false)
 for(const code of['poe-sensor-cable-protection-missing','poe-sensor-isolation-barrier-missing','poe-sensor-classification-power-unverified','poe-sensor-isolation-safety-unverified','poe-sensor-signal-integrity-unverified'])assert.ok(gate.errors.includes(code),code)
})

test('Board009 has no exportable acceptance claim while exact packing is impossible',()=>{
 assert.match(p.status,/^BLOCKED_/);assert.equal(packing.geometricallyPossible,false);assert.ok(!('acceptance'in p));assert.ok(!('manufacturingEvidence'in p))
})

test('Board009 semantic architecture requires all exact system evidence',()=>{
 const roles=['ethernet MAC PHY controller','PoE MagJack ethernet magnetics','PoE PD controller','isolated PoE converter','ethernet cable surge ESD protection','25 MHz ethernet clock crystal','ethernet PHY strap network','ethernet MAC PHY decoupling','environmental temperature humidity sensor','primary secondary isolation barrier']
 const bom=roles.map((role,i)=>({ref:`X${i}`,role})),empty=validatePoeSensorArchitecture({topologyId:'poe-sensor',bom,semanticEvidence:{poeSensor:{}}})
 assert.equal(empty.ok,false);for(const code of['poe-sensor-exact-assets-unapproved','poe-sensor-magjack-pin-map-unverified','poe-sensor-classification-power-unverified','poe-sensor-isolation-safety-unverified','poe-sensor-production-test-unverified'])assert.ok(empty.errors.includes(code),code)
})

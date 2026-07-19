import test from'node:test'
import assert from'node:assert/strict'
import manifest from'../../../fixtures/phase2c/50-board-challenge-manifest.mjs'
import{catalogDefinition,validateCatalogSemanticTopology}from'../lib/phase2c/catalog-production-engine.mjs'
import{poeSensorProductionProposal,validatePoeSensorArchitecture}from'../lib/phase2c/templates/poe-sensor.mjs'

test('Board009 proposal is source-backed and explicitly blocked pending exact assets',()=>{
 assert.equal(poeSensorProductionProposal.boardId,'009_POE_SENSOR')
 assert.equal(poeSensorProductionProposal.maximumAreaMm2,900)
 assert.match(poeSensorProductionProposal.status,/^BLOCKED_/)
 assert.ok(poeSensorProductionProposal.candidates.some(x=>x.exactMpn==='W5500'))
 assert.ok(poeSensorProductionProposal.candidates.some(x=>x.exactMpn==='Ag9905LP'))
 assert.ok(poeSensorProductionProposal.candidates.some(x=>x.exactMpn==='7499010121A'&&/PROHIBITED_AS_POE/.test(x.status)))
 assert.ok(poeSensorProductionProposal.candidates.some(x=>x.exactMpn==='Q22FA2380184517'))
})

test('Board009 generic sensor shell fails the PoE architecture gate before generation',()=>{
 const d=catalogDefinition(manifest.boards[8],8),gate=validateCatalogSemanticTopology(d)
 assert.equal(gate.ok,false)
 assert.equal(d.topologyId,'poe-sensor')
 for(const code of['poe-sensor-cable-protection-missing','poe-sensor-straps-missing','poe-sensor-decoupling-missing','poe-sensor-isolation-barrier-missing','poe-sensor-classification-power-unverified','poe-sensor-isolation-safety-unverified'])assert.ok(gate.errors.includes(code),code)
})

test('PoE sensor gate requires evidence even when decorative roles are present',()=>{
 const bom=['ethernet MAC PHY controller','PoE MagJack ethernet magnetics','PoE PD controller','isolated PoE converter','ethernet cable surge ESD protection','25 MHz ethernet clock crystal','ethernet PHY strap network','ethernet MAC PHY decoupling','environmental temperature humidity sensor','primary secondary isolation barrier'].map((role,i)=>({ref:`X${i}`,role}))
 const r=validatePoeSensorArchitecture({topologyId:'poe-sensor',bom,semanticEvidence:{poeSensor:{}}})
 assert.equal(r.ok,false);assert.ok(r.errors.includes('poe-sensor-exact-assets-unapproved'));assert.ok(r.errors.includes('poe-sensor-isolation-safety-unverified'))
})

test('PoE sensor semantic contract passes only with complete architecture and evidence',()=>{
 const bom=['ethernet MAC PHY controller','PoE MagJack ethernet magnetics','PoE PD controller','isolated PoE converter','ethernet cable surge ESD protection','25 MHz ethernet clock crystal','ethernet PHY strap network','ethernet MAC PHY decoupling','environmental temperature humidity sensor','primary secondary isolation barrier'].map((role,i)=>({ref:`X${i}`,role}))
 const evidence=Object.fromEntries(['exactAssetsApproved','magjackPinMapVerified','poeClassificationPowerVerified','isolationSafetyVerified','ethernetSignalIntegrityVerified','powerThermalVerified','sensorEnvironmentVerified','productionTestVerified'].map(k=>[k,true]))
 assert.deepEqual(validatePoeSensorArchitecture({topologyId:'poe-sensor',bom,semanticEvidence:{poeSensor:evidence}}).errors,[])
})

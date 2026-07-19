import test from'node:test'
import assert from'node:assert/strict'
import{BOARD009_ISOLATION_WAIST_CONTRACT as contract,BOARD009_EXACT_COURTYARD_AREA_PROOF as areaProof,BOARD009_COMPACT_POE_AUDIT as packing,createBoard009IsolationWaistFixture,validateBoard009IsolationWaistFixture as validate}from'../lib/phase2c/board009-isolation-waist-contract.mjs'

test('Board009 decorative 42x20 isolation waist is mechanically coherent but not packable',()=>{
 const fixture=createBoard009IsolationWaistFixture(),geometry=validate(fixture)
 assert.equal(geometry.ok,true,geometry.errors.join('; '));assert.deepEqual(geometry.bounds,{minX:0,maxX:42,minY:0,maxY:20,width:42,height:20});assert.equal(geometry.areaMm2,804)
 assert.equal(areaProof.geometricallyPossible,false);assert.ok(areaProof.minimumAreaMm2>contract.maximumAreaMm2)
})

test('Board009 unavoidable through-hole PoE pair exceeds the envelope before isolation',()=>{
 const best=packing.magjackCandidates[0]
 assert.equal(best.status,'BEST_STOCKED_AUTHORITATIVE');assert.equal(best.throughHole,true);assert.equal(packing.isolatedPd.throughHole,true)
 assert.equal(best.pairWidthMm,45.2);assert.ok(best.pairWidthMm>packing.envelopeMm.width);assert.equal(packing.geometricallyPossible,false);assert.match(packing.reason,/before the 6 mm isolation waist/)
})

test('Board009 barrier and mounting violations fail closed',()=>{
 const fixture=createBoard009IsolationWaistFixture();fixture.isolationBarrier.allLayersKeepout=false;fixture.holes[0].x=21;fixture.slots.pop()
 const errors=validate(fixture).errors;for(const code of['board009-primary-secondary-barrier-unverified','board009-mount-bridges-isolation','board009-isolation-slots-unverified'])assert.ok(errors.includes(code),code)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {createConnectorEarMechanicalFixture,validateConnectorEarMechanicalFixture} from '../lib/phase2c/connector-ear-mechanical-contract.mjs'
import {catalogDefinition} from '../lib/phase2c/catalog-production-engine.mjs'
import manifest from '../../../fixtures/phase2c/50-board-challenge-manifest.mjs'

test('connector-ear fixture has one coherent sub-3000mm2 envelope and exactly four holes',()=>{
  const fixture=createConnectorEarMechanicalFixture(),result=validateConnectorEarMechanicalFixture(fixture)
  assert.equal(result.ok,true)
  assert.deepEqual(result.bounds,{minX:0,maxX:62,minY:0,maxY:38,width:62,height:38})
  assert.ok(result.areaMm2<3000)
  assert.equal(fixture.holes.length,4)
})

test('connector-ear contract rejects envelope drift and missing holes',()=>{
  const fixture=createConnectorEarMechanicalFixture();fixture.widthMm=60;fixture.holes.pop()
  const result=validateConnectorEarMechanicalFixture(fixture)
  assert.equal(result.ok,false)
  assert.ok(result.errors.includes('connector-ear-declared-envelope-incoherent'))
  assert.ok(result.errors.includes('connector-ear-mount-count-invalid'))
})

test('Board007 catalog definition uses the authoritative connector-ear fixture',()=>{
  const board=manifest.boards[6],definition=catalogDefinition(board,6),fixture=createConnectorEarMechanicalFixture()
  assert.deepEqual(definition.outlinePoints,fixture.outline)
  assert.deepEqual(definition.holes,fixture.holes)
  assert.equal(definition.widthMm,fixture.widthMm)
  assert.equal(definition.heightMm,fixture.heightMm)
})

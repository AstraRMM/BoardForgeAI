import assert from 'node:assert/strict';import test from 'node:test'
// @ts-expect-error test-only TS extension under Node 24
import {diffSchematic,fixtureFromJson,moveSelection,rotateSelection,sampleSchematic} from '../apps/web/src/lib/schematic-editor/model.ts'
test('fixture loader returns an independent typed document',()=>{const loaded=fixtureFromJson(JSON.stringify(sampleSchematic));loaded.title='Changed';assert.notEqual(loaded.title,sampleSchematic.title)})
test('move and rotation are immutable and diffed',()=>{const ids=new Set(['sym-u1']);const moved=rotateSelection(moveSelection(sampleSchematic,ids,{x:2,y:-1}),ids);assert.equal(sampleSchematic.symbols[1].x,42);assert.equal(moved.symbols[1].x,44);assert.equal(moved.symbols[1].rotation,90);assert.deepEqual(diffSchematic(sampleSchematic,moved).map(x=>x.id),['sym-u1'])})
test('invalid fixture is rejected',()=>assert.throws(()=>fixtureFromJson('{"format":"other"}'),/Unsupported/))

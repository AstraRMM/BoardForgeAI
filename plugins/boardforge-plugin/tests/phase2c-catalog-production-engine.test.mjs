import test from 'node:test'
import assert from 'node:assert/strict'
import manifest from '../../../fixtures/phase2c/50-board-challenge-manifest.mjs'
import { catalogDefinition } from '../lib/phase2c/catalog-production-engine.mjs'
import { validateChallengeManifest } from '../lib/challenge/phase2c-challenge.mjs'

test('all 50 campaign specifications retain unique custom outline intent',()=>{const result=validateChallengeManifest(manifest);assert.equal(result.ok,true,result.errors.join('; '));assert.equal(result.customOutlineCount,50);assert.equal(new Set(manifest.boards.map(b=>b.outline.family)).size,50)})
test('catalog definitions 007-050 are real electrical topology requests with closed manufacturable polygons',()=>{for(let i=6;i<manifest.boards.length;i++){const d=catalogDefinition(manifest.boards[i],i);assert.ok(d.bom.length>=6,d.id);assert.ok(d.outlinePoints.length>=7,d.id);assert.equal(d.topologyId.length>0,true);assert.match(d.prompt,new RegExp(manifest.boards[i].purpose.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))}})

test('CAN/fieldbus catalog boards select the CAN-capable STM32 production topology',()=>{
  const d=catalogDefinition(manifest.boards[6],6)
  assert.equal(d.topologyId,'stm32-controller')
  assert.ok(d.bom.some(row=>row.mpn==='SN65HVD230DR'))
  assert.doesNotThrow(()=>d.bom.map(row=>row.ref))
})

test('catalog definition rejects missing board input with an actionable contract error',()=>{
  assert.throws(()=>catalogDefinition(undefined,6),/Catalog board specification is required/)
})

test('dual-bus CAN gateway has two independently named CAN physical channels',()=>{
  const d=catalogDefinition(manifest.boards[7],7)
  assert.equal(d.topologyId,'can-gateway')
  assert.equal(d.bom.filter(row=>row.mpn==='SN65HVD230DR').length,2)
  assert.ok(d.bom.some(row=>row.ref==='J3'))
  assert.ok(d.bom.some(row=>row.ref==='R2'))
})

test('catalog mechanics preserve clearance around every topology placement envelope',()=>{for(let i=6;i<manifest.boards.length;i++){const d=catalogDefinition(manifest.boards[i],i),xs=d.outlinePoints.map(p=>p[0]),ys=d.outlinePoints.map(p=>p[1]);assert.ok(Math.min(...xs)<=-.75,`${d.id}: left clearance`);assert.ok(Math.min(...ys)<=-.75,`${d.id}: top clearance`);assert.ok(Math.max(...xs)>=d.widthMm+.75,`${d.id}: right clearance`);assert.ok(Math.max(...ys)>=d.heightMm+.75,`${d.id}: bottom clearance`)}})

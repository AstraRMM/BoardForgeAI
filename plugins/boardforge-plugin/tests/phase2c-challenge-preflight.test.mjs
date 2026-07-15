import test from 'node:test'
import assert from 'node:assert/strict'
import { manifest } from '../../../fixtures/phase2c/50-board-challenge-manifest.mjs'
import { evaluateChallengePreflight } from '../lib/phase2c/challenge-preflight.mjs'
import { runMouserRuntimeProbe } from '../lib/phase2c/provider-runtime-preflight.mjs'

const ready={manifest,digikey:{configured:true,authenticated:true},mouser:{configured:true,liveReachable:true},kicad:{available:true,version:'10'},rust:{available:true,version:'1'},outputRoot:'synthetic-safe-root'}
test('preflight permits generation only with all real capabilities',()=>assert.equal(evaluateChallengePreflight(ready).status,'READY_TO_GENERATE'))
test('missing supplier auth blocks before any board attempt',()=>{const result=evaluateChallengePreflight({...ready,digikey:{configured:false,authenticated:false}});assert.equal(result.status,'BLOCKED_PREFLIGHT');assert.equal(result.attemptedBoards,0);assert.ok(result.blockers.some(x=>x.id==='DIGIKEY_LIVE_AUTH'))})
test('configured Mouser without proven reachability is blocked',()=>assert.equal(evaluateChallengePreflight({...ready,mouser:{configured:true,liveReachable:false}}).status,'BLOCKED_PREFLIGHT'))
test('runtime provider status is consumed without requiring credential detail',()=>{
  const runtimeReady={provider:'digikey',status:'LIVE_VERIFIED',ready:true}
  const runtimeMouser={provider:'mouser',status:'LIVE_VERIFIED',ready:true}
  const result=evaluateChallengePreflight({...ready,digikey:runtimeReady,mouser:runtimeMouser})
  assert.equal(result.status,'READY_TO_GENERATE')
  assert.equal(result.checks.find(row=>row.id==='DIGIKEY_LIVE_AUTH').detail,'LIVE_VERIFIED')
})
test('exact challenge runtime proves Mouser only from a fresh live response',async()=>{
  const fetchImpl=async()=>({ok:true,status:200,text:async()=>JSON.stringify({SearchResults:{NumberOfResult:1,Parts:[{ManufacturerPartNumber:'RC0603FR-0710KL',MouserPartNumber:'603-R',AvailabilityInStock:25}]}})})
  const result=await runMouserRuntimeProbe({env:{MOUSER_API_KEY:'test-only'},fetchImpl})
  assert.equal(result.request.ok,true)
  assert.equal(result.request.evidenceKind,'mouser_search_api_response')
  assert.ok(result.request.observedAt)
})
test('verification-shaped flag cannot replace Mouser credentials or request',async()=>{
  const result=await runMouserRuntimeProbe({env:{BOARDFORGE_MOUSER_LIVE_VERIFIED:'1'},fetchImpl:async()=>{throw new Error('must not run')}})
  assert.deepEqual(result,{configured:false,authenticated:false,request:null})
})

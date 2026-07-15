import test from 'node:test'
import assert from 'node:assert/strict'
import { manifest } from '../../../fixtures/phase2c/50-board-challenge-manifest.mjs'
import { evaluateChallengePreflight } from '../lib/phase2c/challenge-preflight.mjs'

const ready={manifest,digikey:{configured:true,authenticated:true},mouser:{configured:true,liveReachable:true},kicad:{available:true,version:'10'},rust:{available:true,version:'1'},outputRoot:'synthetic-safe-root'}
test('preflight permits generation only with all real capabilities',()=>assert.equal(evaluateChallengePreflight(ready).status,'READY_TO_GENERATE'))
test('missing supplier auth blocks before any board attempt',()=>{const result=evaluateChallengePreflight({...ready,digikey:{configured:false,authenticated:false}});assert.equal(result.status,'BLOCKED_PREFLIGHT');assert.equal(result.attemptedBoards,0);assert.ok(result.blockers.some(x=>x.id==='DIGIKEY_LIVE_AUTH'))})
test('configured Mouser without proven reachability is blocked',()=>assert.equal(evaluateChallengePreflight({...ready,mouser:{configured:true,liveReachable:false}}).status,'BLOCKED_PREFLIGHT'))

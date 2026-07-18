import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { authenticAccepted, loadCheckpoint, runAutonomousChallenge } from '../lib/phase2c/autonomous-challenge-runner.mjs'

const manifest={boards:[{id:'pilot'},{id:'second'},{id:'third'}]}
const accepted=async()=>{const root=await mkdtemp(path.join(os.tmpdir(),'bf-authentic-output-')),artifacts=[];for(let i=0;i<5;i++){const file=path.join(root,`f${i}`),data=Buffer.from(`authentic-${i}`);await writeFile(file,data);artifacts.push({path:file,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')})}return {acceptance:{accepted:true,status:'BOARD_ACCEPTED',evidenceDigest:'a'.repeat(64)},manufacturingEvidence:{status:'MANUFACTURING_ACCEPTED',sourceProtection:{unchanged:true},artifacts}}}
const rejected=()=>({acceptance:{accepted:false,status:'BOARD_REJECTED',evidenceDigest:'c'.repeat(64)},failure:{code:'DRC_NOT_ZERO'}})
async function checkpoint(){return path.join(await mkdtemp(path.join(os.tmpdir(),'bf-phase2c-runner-')),'checkpoint.json')}

test('no board generation occurs before authentic pilot acceptance',async()=>{
  let generated=0;const file=await checkpoint()
  const result=await runAutonomousChallenge({manifest,checkpointPath:file,executePilot:async()=>rejected(),executeBoard:async()=>{generated++;return accepted()}})
  assert.equal(result.status,'PILOT_REJECTED_ENGINE_IMPROVEMENT_REQUIRED');assert.equal(generated,0);assert.equal(result.state.nextBoardIndex,0)
})
test('pilot watchdog writes blocked checkpoint instead of escaping the runner',async()=>{
  const file=await checkpoint(),result=await runAutonomousChallenge({manifest,checkpointPath:file,watchdogMs:5,executePilot:async()=>new Promise(()=>{}),executeBoard:async()=>{throw Error('must not run')}})
  assert.equal(result.status,'PILOT_REJECTED_ENGINE_IMPROVEMENT_REQUIRED');assert.equal(result.state.blocker,'WATCHDOG_TIMEOUT')
  assert.equal((await loadCheckpoint(file)).phase,'pilot_rejected')
})
test('batch checkpoint resumes at exact next index without replay',async()=>{
  const file=await checkpoint(),seen=[]
  const executeBoard=async board=>{seen.push(board.id);return accepted()}
  const first=await runAutonomousChallenge({manifest,checkpointPath:file,batchSize:1,executePilot:async()=>accepted(),executeBoard})
  assert.equal(first.status,'BATCH_CHECKPOINT_WRITTEN');assert.deepEqual(seen,['second']);assert.equal(first.state.accepted[0].pilot,true);assert.match(first.resumeCommand,/--checkpoint/)
  const second=await runAutonomousChallenge({manifest,checkpointPath:file,resume:true,batchSize:2,executePilot:async()=>{throw Error('pilot replayed')},executeBoard})
  assert.equal(second.status,'CHALLENGE_COMPLETE');assert.deepEqual(seen,['second','third'])
})
test('rejection checkpoints same board and requires engine improvement before retry',async()=>{
  const file=await checkpoint(),result=await runAutonomousChallenge({manifest,checkpointPath:file,executePilot:async()=>accepted(),executeBoard:async()=>rejected()})
  assert.equal(result.status,'BOARD_REJECTED_ENGINE_IMPROVEMENT_REQUIRED');assert.equal(result.state.nextBoardIndex,1);assert.equal(result.state.retries['1'],1)
  assert.equal((await loadCheckpoint(file)).lastFailure.code,'DRC_NOT_ZERO')
})
test('watchdog produces a resumable bounded failure at exact board',async()=>{
  const file=await checkpoint(),pilot=await accepted(),result=await runAutonomousChallenge({manifest,checkpointPath:file,watchdogMs:10,executePilot:async()=>pilot,executeBoard:async()=>new Promise(()=>{})})
  assert.equal(result.state.lastFailure.code,'WATCHDOG_TIMEOUT');assert.equal(result.state.nextBoardIndex,1)
})
test('acceptance claim without authentic artifact hashes is rejected',async()=>{
  const row=await accepted();row.manufacturingEvidence.artifacts[0].sha256='not-a-hash'
  assert.equal(authenticAccepted(row),false)
})
test('resume skips an independently accepted later board without duplicating or regenerating it',async()=>{
  const file=await checkpoint(),seen=[]
  const first=await runAutonomousChallenge({manifest,checkpointPath:file,batchSize:1,executePilot:async()=>accepted(),executeBoard:async board=>{seen.push(board.id);return accepted()}})
  const state=await loadCheckpoint(file);state.accepted.push({index:2,boardId:'third',evidenceDigest:'b'.repeat(64),acceptedAt:new Date().toISOString()});await writeFile(file,JSON.stringify(state))
  const second=await runAutonomousChallenge({manifest,checkpointPath:file,resume:true,batchSize:2,executePilot:async()=>{throw Error('pilot replayed')},executeBoard:async board=>{seen.push(board.id);return accepted()}})
  assert.equal(second.status,'CHALLENGE_COMPLETE');assert.deepEqual(seen,['second']);assert.equal(second.state.accepted.filter(row=>row.index===2).length,1)
})
test('manifest digest changes require an explicit runner-recorded migration',async()=>{
  const file=await checkpoint(),old={boards:[{id:'pilot'},{id:'second'}]},next={boards:[{id:'pilot'},{id:'second',replacement:'fixed-source'}]}
  await runAutonomousChallenge({manifest:old,checkpointPath:file,batchSize:1,executePilot:accepted,executeBoard:accepted})
  const state=await loadCheckpoint(file),to=createHash('sha256').update(JSON.stringify(next)).digest('hex')
  await assert.rejects(runAutonomousChallenge({manifest:next,checkpointPath:file,resume:true,executePilot:accepted,executeBoard:accepted}),/manifest digest/)
  const result=await runAutonomousChallenge({manifest:next,checkpointPath:file,resume:true,executePilot:accepted,executeBoard:accepted,manifestMigration:{fromDigest:state.manifestDigest,toDigest:to,reason:'TEST_EXPLICIT_REPLACEMENT'}})
  assert.equal(result.state.manifestMigrations.at(-1).reason,'TEST_EXPLICIT_REPLACEMENT')
})

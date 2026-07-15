import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createPhase2cChallengeDriver, verifyStm32ProductionContract } from '../../../scripts/phase2c-challenge-driver.mjs'
import { stm32ControllerTemplate } from '../lib/phase2c/templates/stm32-controller.mjs'
import { runAutonomousChallenge } from '../lib/phase2c/autonomous-challenge-runner.mjs'

const stm32={id:'STM32_CONTROLLER',slug:'stm32-controller',architectureClass:'real-time-mcu'}
const accepted={acceptance:{status:'BOARD_ACCEPTED',accepted:true,evidenceDigest:'a'.repeat(64)},manufacturingEvidence:{status:'MANUFACTURING_ACCEPTED',sourceProtection:{unchanged:true},artifacts:[]}}
test('board002 invokes STM32 production generator with validated contract and exact index',async()=>{
  let invocation
  const driver=createPhase2cChallengeDriver({root:'safe-synthetic-root',generateStm32:async input=>{invocation=input;return accepted}})
  const result=await driver.executeBoard(stm32,{index:1})
  assert.equal(result.acceptance.accepted,true);assert.equal(invocation.template.id,'002_STM32_CONTROLLER');assert.equal(invocation.context.index,1)
  assert.ok(invocation.template.requirements.some(row=>row.role==='MCU'))
})
test('pilot cannot be replayed through board execution',async()=>{
  let called=false;const driver=createPhase2cChallengeDriver({generateStm32:async()=>{called=true;return accepted}})
  const result=await driver.executeBoard({id:'ESP32_SENSOR_HUB',slug:'esp32-sensor-hub'},{index:0})
  assert.equal(result.acceptance.accepted,false);assert.equal(result.failure.code,'PILOT_INDEX_REPLAY_FORBIDDEN');assert.equal(called,false)
})
test('board002 cannot advance on generator output without strict manufacturing acceptance',async()=>{
  const driver=createPhase2cChallengeDriver({generateStm32:async()=>({acceptance:{status:'BOARD_ACCEPTED',accepted:true}})})
  const result=await driver.executeBoard(stm32,{index:1})
  assert.equal(result.failure.code,'STRICT_MANUFACTURING_ACCEPTANCE_FAILED')
})
test('STM32 generated output must match layer count and every exact template MPN',()=>{
  const sourcing={rows:stm32ControllerTemplate.requirements.map(row=>({mpn:row.mpn}))}
  assert.equal(verifyStm32ProductionContract({template:stm32ControllerTemplate,definition:{layers:4},sourcing}).ok,true)
  const mismatch=verifyStm32ProductionContract({template:stm32ControllerTemplate,definition:{layers:2},sourcing:{rows:sourcing.rows.slice(1)}})
  assert.equal(mismatch.ok,false);assert.ok(mismatch.errors.some(row=>row.startsWith('layer-count:')));assert.ok(mismatch.errors.some(row=>row.startsWith('missing-exact-mpn:')))
})
test('accepted pilot remains index0 and authentic STM32 board002 advances checkpoint to index2',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'bf-stm32-driver-')),pilot=await authenticResult(root,'pilot'),stm32Result=await authenticResult(root,'stm32')
  const driver=createPhase2cChallengeDriver({root,generateStm32:async()=>stm32Result})
  driver.executePilot=async()=>pilot
  const result=await runAutonomousChallenge({manifest:{boards:[{id:'ESP32_SENSOR_HUB',slug:'esp32-sensor-hub'},stm32]},checkpointPath:path.join(root,'checkpoint.json'),executePilot:driver.executePilot,executeBoard:driver.executeBoard,batchSize:1})
  assert.equal(result.status,'CHALLENGE_COMPLETE');assert.equal(result.state.nextBoardIndex,2)
  assert.deepEqual(result.state.accepted.map(row=>[row.index,Boolean(row.pilot)]),[[0,true],[1,false]])
})

async function authenticResult(root,name){const artifacts=[];for(let i=0;i<5;i++){const data=Buffer.from(`${name}-artifact-${i}`),file=path.join(root,`${name}-${i}.dat`);await writeFile(file,data);artifacts.push({path:file,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')})}return {acceptance:{status:'BOARD_ACCEPTED',accepted:true,evidenceDigest:createHash('sha256').update(name).digest('hex')},manufacturingEvidence:{status:'MANUFACTURING_ACCEPTED',sourceProtection:{unchanged:true},artifacts}}}

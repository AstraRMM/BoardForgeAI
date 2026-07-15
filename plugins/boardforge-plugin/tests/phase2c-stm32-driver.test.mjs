import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createPhase2cChallengeDriver, verifyRp2040ProductionContract, verifyStm32ProductionContract } from '../../../scripts/phase2c-challenge-driver.mjs'
import { stm32ControllerTemplate } from '../lib/phase2c/templates/stm32-controller.mjs'
import { rp2040InstrumentTemplate } from '../lib/phase2c/templates/rp2040-instrument.mjs'
import { runAutonomousChallenge } from '../lib/phase2c/autonomous-challenge-runner.mjs'

const stm32={id:'STM32_CONTROLLER',slug:'stm32-controller',architectureClass:'real-time-mcu'}
const rp2040={id:'RP2040_INSTRUMENT',slug:'rp2040-instrument',architectureClass:'usb-mcu'}
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
test('board003 invokes RP2040 generator only at index2 with its validated production template',async()=>{
  let invocation;const driver=createPhase2cChallengeDriver({generateRp2040:async input=>{invocation=input;return accepted}})
  const result=await driver.executeBoard(rp2040,{index:2})
  assert.equal(result.acceptance.accepted,true);assert.equal(invocation.template.id,'003_RP2040_INSTRUMENT');assert.equal(invocation.context.index,2)
})
test('RP2040 output contract requires four layers and every exact BOM MPN',()=>{
  const rows=rp2040InstrumentTemplate.requirements.map(row=>({mpn:row.mpn}))
  assert.equal(verifyRp2040ProductionContract({template:rp2040InstrumentTemplate,actualLayers:4,sourcing:{rows}}).ok,true)
  const removed=rp2040InstrumentTemplate.requirements[0].mpn
  const failed=verifyRp2040ProductionContract({template:rp2040InstrumentTemplate,actualLayers:2,sourcing:{rows:rows.slice(1)}})
  assert.ok(failed.errors.some(x=>x.startsWith('layer-count:')));assert.ok(failed.errors.includes(`missing-exact-mpn:${removed}`))
})
test('RP2040 canonical orderable MPN passes while a different supplier packaging identifier remains review-required',()=>{
  const canonical=rp2040InstrumentTemplate.requirements.find(row=>row.role==='MCU').mpn
  assert.equal(canonical,'SC0914(13)')
  for(const supplierMpn of ['SC0914','SC0914470K']) {
    const rows=rp2040InstrumentTemplate.requirements.filter(row=>row.role!=='MCU').map(row=>({mpn:row.mpn})).concat({mpn:supplierMpn})
    const result=verifyRp2040ProductionContract({template:rp2040InstrumentTemplate,actualLayers:4,sourcing:{rows}})
    assert.equal(result.ok,false);assert.ok(result.errors.includes(`missing-exact-mpn:${canonical}`))
  }
})
test('authentic board003 advances checkpoint without replacing accepted indices zero and one',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'bf-rp2040-driver-')),pilot=await authenticResult(root,'pilot'),stm=await authenticResult(root,'stm'),rp=await authenticResult(root,'rp')
  const driver=createPhase2cChallengeDriver({root,generateStm32:async()=>stm,generateRp2040:async()=>rp});driver.executePilot=async()=>pilot
  const result=await runAutonomousChallenge({manifest:{boards:[{id:'ESP32_SENSOR_HUB',slug:'esp32-sensor-hub'},stm32,rp2040]},checkpointPath:path.join(root,'checkpoint.json'),executePilot:driver.executePilot,executeBoard:driver.executeBoard,batchSize:2})
  assert.equal(result.status,'CHALLENGE_COMPLETE');assert.equal(result.state.nextBoardIndex,3)
  assert.deepEqual(result.state.accepted.map(row=>row.index),[0,1,2]);assert.equal(result.state.accepted[0].pilot,true)
})

async function authenticResult(root,name){const artifacts=[];for(let i=0;i<5;i++){const data=Buffer.from(`${name}-artifact-${i}`),file=path.join(root,`${name}-${i}.dat`);await writeFile(file,data);artifacts.push({path:file,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')})}return {acceptance:{status:'BOARD_ACCEPTED',accepted:true,evidenceDigest:createHash('sha256').update(name).digest('hex')},manufacturingEvidence:{status:'MANUFACTURING_ACCEPTED',sourceProtection:{unchanged:true},artifacts}}}

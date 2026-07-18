import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createPhase2cChallengeDriver, verifyRp2040ProductionContract, verifyStm32ProductionContract, verifyUsbCPdSinkProductionContract, verifyUsbCPdSourceProductionContract } from '../../../scripts/phase2c-challenge-driver.mjs'
import { stm32ControllerTemplate } from '../lib/phase2c/templates/stm32-controller.mjs'
import { rp2040InstrumentTemplate } from '../lib/phase2c/templates/rp2040-instrument.mjs'
import { usbCPdSinkTemplate } from '../lib/phase2c/templates/usb-c-pd-sink.mjs'
import { usbCPdSourceTemplate } from '../lib/phase2c/templates/usb-c-pd-source.mjs'
import { runAutonomousChallenge } from '../lib/phase2c/autonomous-challenge-runner.mjs'

const stm32={id:'STM32_CONTROLLER',slug:'stm32-controller',architectureClass:'real-time-mcu'}
const rp2040={id:'RP2040_INSTRUMENT',slug:'rp2040-instrument',architectureClass:'usb-mcu'}
const pdSink={id:'USB_C_PD_SINK',slug:'usb-c-pd-sink',architectureClass:'usb-c-power'}
const pdSource={id:'USB_C_PD_SOURCE',slug:'usb-c-pd-source',architectureClass:'usb-c-power'}
const accepted={acceptance:{status:'BOARD_ACCEPTED',accepted:true,evidenceDigest:'a'.repeat(64)},manufacturingEvidence:{status:'MANUFACTURING_ACCEPTED',sourceProtection:{unchanged:true},artifacts:[]}}
test('board002 invokes STM32 production generator with validated contract and exact index',async()=>{
  let invocation
  const driver=createPhase2cChallengeDriver({root:'safe-synthetic-root',generateStm32:async input=>{invocation=input;return accepted}})
  const result=await driver.executeBoard(stm32,{index:1})
  assert.equal(result.acceptance.accepted,true);assert.equal(invocation.template.id,'002_STM32_CONTROLLER');assert.equal(invocation.context.index,1)
  assert.ok(invocation.template.requirements.some(row=>row.role==='MCU'))
})
test('board002 reuses contained hardened manufacturing evidence without regenerating or replacing it',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'bf-stm32-existing-')),project=path.join(root,stm32.id,stm32.slug),evidenceDir=path.join(project,'Evidence'),manufacturing=path.join(project,'Manufacturing')
  await mkdir(evidenceDir,{recursive:true});await mkdir(manufacturing,{recursive:true})
  const artifacts=[]
  for(let i=0;i<5;i++){const data=Buffer.from(`existing-${i}`),file=path.join(manufacturing,`artifact-${i}.dat`);await writeFile(file,data);artifacts.push({path:file,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')})}
  const zip=path.join(manufacturing,'stm32-controller_Manufacturing.zip');await writeFile(zip,'zip')
  const digest=createHash('sha256').update('existing-stm32').digest('hex'),evidence={schema:'boardforge.phase2c.manufacturing-evidence.v1',status:'MANUFACTURING_ACCEPTED',sourceProtection:{unchanged:true},artifacts,packaging:{zip},acceptance:{status:'BOARD_ACCEPTED',accepted:true,evidenceDigest:digest}}
  await writeFile(path.join(evidenceDir,'BoardForge_Manufacturing_Evidence.json'),JSON.stringify(evidence))
  let generated=false;const driver=createPhase2cChallengeDriver({root,generateStm32:async()=>{generated=true;throw Error('must not regenerate')}}),result=await driver.executeBoard(stm32,{index:1})
  assert.equal(generated,false);assert.equal(result.acceptance.evidenceDigest,digest);assert.equal(result.production.generator,'existing-hardened-manufacturing-evidence')
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
test('board004 invokes only the injected PD sink generator at manifest index3',async()=>{
  let invocation;const driver=createPhase2cChallengeDriver({generateUsbCPdSink:async input=>{invocation=input;return accepted}})
  const result=await driver.executeBoard(pdSink,{index:3})
  assert.equal(result.acceptance.accepted,true);assert.equal(invocation.template.id,'004_USB_C_PD_SINK');assert.equal(invocation.context.index,3)
})
test('PD sink output contract requires exact full MPN set and template layer count',()=>{
  const rows=usbCPdSinkTemplate.requirements.map(row=>({mpn:row.mpn}))
  assert.equal(verifyUsbCPdSinkProductionContract({template:usbCPdSinkTemplate,actualLayers:usbCPdSinkTemplate.electrical.layers,sourcing:{rows}}).ok,true)
  const removed=usbCPdSinkTemplate.requirements[0].mpn
  const failed=verifyUsbCPdSinkProductionContract({template:usbCPdSinkTemplate,actualLayers:2,sourcing:{rows:rows.slice(1)}})
  assert.ok(failed.errors.some(x=>x.startsWith('layer-count:')));assert.ok(failed.errors.includes(`missing-exact-mpn:${removed}`))
})
test('PD sink contract requires the complete current fourteen-reference stock-safe power stage',()=>{
  const exact={Q1:'SI7465DP-T1-GE3',U2:'TPS54202DDCR',F1:'3413.0218.22',C1:'UWT1H100MCL1GB',C2:'UWT1E220MCL1GB',R_FB_TOP:'RC0603FR-0773K2L',R_FB_BOTTOM:'RC0603FR-0710KL'}
  assert.equal(usbCPdSinkTemplate.requirements.length,14)
  for(const [ref,mpn] of Object.entries(exact)) assert.equal(usbCPdSinkTemplate.requirements.find(row=>row.ref===ref).mpn,mpn)
  const stale=new Set([exact.Q1,exact.U2,exact.C1,exact.C2])
  const rows=usbCPdSinkTemplate.requirements.map(row=>({mpn:row.mpn})).filter(row=>!stale.has(row.mpn)).concat({mpn:'AO3401A'},{mpn:'OLD-U2'},{mpn:'OLD-C1'},{mpn:'OLD-C2'})
  const result=verifyUsbCPdSinkProductionContract({template:usbCPdSinkTemplate,actualLayers:usbCPdSinkTemplate.electrical.layers,sourcing:{rows}})
  assert.equal(result.ok,false)
  for(const mpn of stale) assert.ok(result.errors.includes(`missing-exact-mpn:${mpn}`))
})
test('board004 cannot advance checkpoint without authentic manufacturing hashes',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'bf-pd-sink-driver-')),pilot=await authenticResult(root,'pilot'),stm=await authenticResult(root,'stm'),rp=await authenticResult(root,'rp')
  const counterfeit={acceptance:{status:'BOARD_ACCEPTED',accepted:true,evidenceDigest:'a'.repeat(64)},manufacturingEvidence:{status:'MANUFACTURING_ACCEPTED',sourceProtection:{unchanged:true},artifacts:[{path:'missing',bytes:99,sha256:'b'.repeat(64)}]}}
  const driver=createPhase2cChallengeDriver({root,generateStm32:async()=>stm,generateRp2040:async()=>rp,generateUsbCPdSink:async()=>counterfeit});driver.executePilot=async()=>pilot
  const result=await runAutonomousChallenge({manifest:{boards:[{id:'ESP32_SENSOR_HUB',slug:'esp32-sensor-hub'},stm32,rp2040,pdSink]},checkpointPath:path.join(root,'checkpoint.json'),executePilot:driver.executePilot,executeBoard:driver.executeBoard,batchSize:3})
  assert.equal(result.status,'BOARD_REJECTED_ENGINE_IMPROVEMENT_REQUIRED');assert.equal(result.state.nextBoardIndex,3);assert.deepEqual(result.state.accepted.map(row=>row.index),[0,1,2])
})
test('authentic board004 preserves accepted indices zero through two and advances to four',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'bf-pd-sink-accepted-')),pilot=await authenticResult(root,'pilot'),stm=await authenticResult(root,'stm'),rp=await authenticResult(root,'rp'),pd=await authenticResult(root,'pd')
  const driver=createPhase2cChallengeDriver({root,generateStm32:async()=>stm,generateRp2040:async()=>rp,generateUsbCPdSink:async()=>pd});driver.executePilot=async()=>pilot
  const result=await runAutonomousChallenge({manifest:{boards:[{id:'ESP32_SENSOR_HUB',slug:'esp32-sensor-hub'},stm32,rp2040,pdSink]},checkpointPath:path.join(root,'checkpoint.json'),executePilot:driver.executePilot,executeBoard:driver.executeBoard,batchSize:3})
  assert.equal(result.status,'CHALLENGE_COMPLETE');assert.equal(result.state.nextBoardIndex,4);assert.deepEqual(result.state.accepted.map(row=>row.index),[0,1,2,3])
})
test('board005 invokes only injected PD source generator at exact manifest index4',async()=>{let invocation;const driver=createPhase2cChallengeDriver({generateUsbCPdSource:async input=>{invocation=input;return withPdConfig(accepted)}});const result=await driver.executeBoard(pdSource,{index:4});assert.equal(result.acceptance.accepted,true);assert.equal(invocation.template.id,'005_USB_C_PD_SOURCE');assert.equal(invocation.context.index,4)})
test('PD source output contract requires full exact MPN set and production layer count',()=>{const rows=usbCPdSourceTemplate.requirements.map(row=>({mpn:row.mpn}));assert.equal(verifyUsbCPdSourceProductionContract({template:usbCPdSourceTemplate,actualLayers:usbCPdSourceTemplate.electrical.layers,sourcing:{rows}}).ok,true);const removed=usbCPdSourceTemplate.requirements[0].mpn,failed=verifyUsbCPdSourceProductionContract({template:usbCPdSourceTemplate,actualLayers:2,sourcing:{rows:rows.slice(1)}});assert.ok(failed.errors.some(x=>x.startsWith('layer-count:')));assert.ok(failed.errors.includes(`missing-exact-mpn:${removed}`))})
test('board005 counterfeit evidence stops at index4 and preserves accepted zero through three',async()=>{const root=await mkdtemp(path.join(os.tmpdir(),'bf-pd-source-blocked-')),pilot=await authenticResult(root,'pilot'),stm=await authenticResult(root,'stm'),rp=await authenticResult(root,'rp'),sink=await authenticResult(root,'sink'),fake={acceptance:{status:'BOARD_ACCEPTED',accepted:true,evidenceDigest:'a'.repeat(64)},manufacturingEvidence:{status:'MANUFACTURING_ACCEPTED',sourceProtection:{unchanged:true},artifacts:[]}},driver=createPhase2cChallengeDriver({root,generateStm32:async()=>stm,generateRp2040:async()=>rp,generateUsbCPdSink:async()=>sink,generateUsbCPdSource:async()=>fake});driver.executePilot=async()=>pilot;const result=await runAutonomousChallenge({manifest:{boards:[{id:'ESP32_SENSOR_HUB',slug:'esp32-sensor-hub'},stm32,rp2040,pdSink,pdSource]},checkpointPath:path.join(root,'checkpoint.json'),executePilot:driver.executePilot,executeBoard:driver.executeBoard,batchSize:4});assert.equal(result.state.nextBoardIndex,4);assert.deepEqual(result.state.accepted.map(row=>row.index),[0,1,2,3])})
test('authentic board005 advances checkpoint to5 without replacing prior acceptance',async()=>{const root=await mkdtemp(path.join(os.tmpdir(),'bf-pd-source-ok-')),pilot=await authenticResult(root,'pilot'),stm=await authenticResult(root,'stm'),rp=await authenticResult(root,'rp'),sink=await authenticResult(root,'sink'),source=withPdConfig(await authenticResult(root,'source')),driver=createPhase2cChallengeDriver({root,generateStm32:async()=>stm,generateRp2040:async()=>rp,generateUsbCPdSink:async()=>sink,generateUsbCPdSource:async()=>source});driver.executePilot=async()=>pilot;const result=await runAutonomousChallenge({manifest:{boards:[{id:'ESP32_SENSOR_HUB',slug:'esp32-sensor-hub'},stm32,rp2040,pdSink,pdSource]},checkpointPath:path.join(root,'checkpoint.json'),executePilot:driver.executePilot,executeBoard:driver.executeBoard,batchSize:4});assert.equal(result.status,'CHALLENGE_COMPLETE');assert.equal(result.state.nextBoardIndex,5);assert.deepEqual(result.state.accepted.map(row=>row.index),[0,1,2,3,4])})
test('board005 rejects manufacturing acceptance without immutable EEPROM image and readback proof',async()=>{const driver=createPhase2cChallengeDriver({generateUsbCPdSource:async()=>accepted}),result=await driver.executeBoard(pdSource,{index:4});assert.equal(result.acceptance.accepted,false);assert.equal(result.failure.code,'PD_SOURCE_EEPROM_CONFIGURATION_PROOF_MISSING');assert.deepEqual(result.requirements.questions.map(question=>question.id).slice(0,4),['pd_role','pdo_profile','vbus_current_limit_a','dead_battery_behavior']);assert.equal(result.requirements.status,'REQUIREMENTS_INPUT_REQUIRED')})
test('training-mode Board005 generates a complete internal Design Intent Package without relaxing its strict configuration gate',async()=>{const driver=createPhase2cChallengeDriver({generateUsbCPdSource:async()=>accepted}),result=await driver.executeBoard({...pdSource,purpose:'protected programmable power output',outline:{family:'thermal tab',purpose:'thermal access'},maximumAreaMm2:1600,architectureClass:'usb-c-power'},{index:4,trainingMode:true});assert.equal(result.failure.code,'PD_SOURCE_EEPROM_CONFIGURATION_PROOF_MISSING');assert.equal(result.designIntent.mode,'autonomous_training_benchmark');assert.ok(result.designIntent.decisions.length>=15)})

async function authenticResult(root,name){const artifacts=[];for(let i=0;i<5;i++){const data=Buffer.from(`${name}-artifact-${i}`),file=path.join(root,`${name}-${i}.dat`);await writeFile(file,data);artifacts.push({path:file,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')})}return {acceptance:{status:'BOARD_ACCEPTED',accepted:true,evidenceDigest:createHash('sha256').update(name).digest('hex')},manufacturingEvidence:{status:'MANUFACTURING_ACCEPTED',sourceProtection:{unchanged:true},artifacts}}}
function withPdConfig(result){return {...result,productionConfig:{eepromImageVerified:true,readbackVerified:true,noUnadvertisedPdo:true,immutableSha256:'c'.repeat(64)}}}

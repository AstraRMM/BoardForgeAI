import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const RUNNER_SCHEMA='boardforge.phase2c.autonomous-runner.v1'

export async function runAutonomousChallenge(options) {
  const {manifest,checkpointPath,executePilot,executeBoard,batchSize=5,maxRetries=2,watchdogMs=90_000,executionContext={}}=options
  if (!manifest?.boards?.length) throw new Error('A non-empty challenge manifest is required')
  let state=options.resume ? await loadCheckpoint(checkpointPath) : freshState(manifest,options.driverModule)
  assertManifest(state,manifest)
  if (state.phase==='complete') return outcome('CHALLENGE_COMPLETE',state,checkpointPath)

  if (state.phase==='awaiting_pilot') {
    let pilot
    try { pilot=await watched(()=>executePilot(manifest.boards[0],state),watchdogMs) }
    catch(error) { pilot={acceptance:{accepted:false,status:'BOARD_REJECTED'},failure:{code:error.code||'PILOT_EXECUTION_FAILURE',message:error.message}} }
    const pilotAuthentic=await verifyAuthenticAccepted(pilot)
    state.pilot={attemptedAt:new Date().toISOString(),result:summary(pilot,pilotAuthentic)}
    if (!pilotAuthentic) {
      state.phase='pilot_rejected'; state.blocker=pilot.failure?.code||'PILOT_STRICT_ACCEPTANCE_NOT_PROVEN'
      await saveCheckpoint(checkpointPath,state)
      return outcome('PILOT_REJECTED_ENGINE_IMPROVEMENT_REQUIRED',state,checkpointPath)
    }
    state.phase='board_batches'; state.pilot.accepted=true
    // The accepted pilot is manifest board index 0. Persist it exactly once and
    // continue at board 002; never regenerate or silently replace the pilot.
    if(!state.accepted.some(row=>row.index===0)) state.accepted.push({index:0,boardId:manifest.boards[0].id||'0',evidenceDigest:pilot.acceptance.evidenceDigest,acceptedAt:new Date().toISOString(),pilot:true})
    state.nextBoardIndex=Math.max(state.nextBoardIndex,1)
    await saveCheckpoint(checkpointPath,state)
  }
  if (state.phase==='pilot_rejected') return outcome('PILOT_REJECTED_ENGINE_IMPROVEMENT_REQUIRED',state,checkpointPath)

  let processed=0
  while(state.nextBoardIndex<manifest.boards.length && processed<batchSize) {
    const index=state.nextBoardIndex,board=manifest.boards[index]
    // A board may be independently completed while earlier boards remain
    // blocked. Preserve that durable acceptance and skip it when the
    // sequential runner eventually reaches the same manifest index.
    if(state.accepted.some(row=>row.index===index)){
      state.nextBoardIndex++;state.engineImprovementRequired=false;state.lastFailure=null;processed++
      await saveCheckpoint(checkpointPath,state);continue
    }
    const prior=state.retries[String(index)]||0
    let result
    try { result=await watched(()=>executeBoard(board,{...state,...executionContext,index}),watchdogMs) }
    catch(error) { result={acceptance:{accepted:false},failure:{code:error.code||'WATCHDOG_OR_EXECUTION_FAILURE',message:error.message}} }
    if (!await verifyAuthenticAccepted(result)) {
      state.retries[String(index)]=prior+1
      state.lastFailure={boardId:board.id||String(index),index,...(result.failure||{code:'OUTPUT_AUTHENTICITY_OR_ACCEPTANCE_FAILED'})}
      state.engineImprovementRequired=true
      await saveCheckpoint(checkpointPath,state)
      if (state.retries[String(index)]>maxRetries) return outcome('RETRY_LIMIT_ENGINE_IMPROVEMENT_REQUIRED',state,checkpointPath)
      return outcome('BOARD_REJECTED_ENGINE_IMPROVEMENT_REQUIRED',state,checkpointPath)
    }
    state.accepted.push({index,boardId:board.id||String(index),evidenceDigest:result.acceptance.evidenceDigest,acceptedAt:new Date().toISOString()})
    state.nextBoardIndex++; state.engineImprovementRequired=false; state.lastFailure=null; processed++
    await saveCheckpoint(checkpointPath,state)
  }
  if(state.nextBoardIndex===manifest.boards.length){state.phase='complete';await saveCheckpoint(checkpointPath,state);return outcome('CHALLENGE_COMPLETE',state,checkpointPath)}
  return outcome('BATCH_CHECKPOINT_WRITTEN',state,checkpointPath)
}

export function authenticAccepted(result) {
  const acceptance=result?.acceptance, evidence=result?.manufacturingEvidence
  if (acceptance?.accepted!==true || acceptance.status!=='BOARD_ACCEPTED' || !sha(acceptance.evidenceDigest)) return false
  if (evidence?.status!=='MANUFACTURING_ACCEPTED' || evidence?.sourceProtection?.unchanged!==true) return false
  const artifacts=evidence?.artifacts
  return Array.isArray(artifacts) && artifacts.length>=5 && artifacts.every(row=>row.bytes>0 && sha(row.sha256) && typeof row.path==='string' && row.path.length>0)
}

export async function verifyAuthenticAccepted(result) {
  if (!authenticAccepted(result)) return false
  try {
    for(const artifact of result.manufacturingEvidence.artifacts){
      const bytes=await readFile(artifact.path)
      if(bytes.length!==artifact.bytes || createHash('sha256').update(bytes).digest('hex')!==artifact.sha256) return false
    }
    return true
  } catch { return false }
}

export async function saveCheckpoint(file,state){
  await mkdir(path.dirname(file),{recursive:true});const tmp=`${file}.${process.pid}.tmp`
  await writeFile(tmp,JSON.stringify({...state,updatedAt:new Date().toISOString()},null,2)+'\n','utf8');await rename(tmp,file)
}
export async function loadCheckpoint(file){const state=JSON.parse(await readFile(file,'utf8'));if(state.schema!==RUNNER_SCHEMA)throw new Error('Unsupported Phase2C checkpoint schema');return state}
export function exactResumeCommand(checkpointPath,driverModule){return `npm run boardforge:phase2c-resume -- --checkpoint "${checkpointPath}"${driverModule?` --driver "${driverModule}"`:''}`}

function freshState(manifest,driverModule){return {schema:RUNNER_SCHEMA,manifestDigest:digest(manifest),driverModule:driverModule||null,phase:'awaiting_pilot',nextBoardIndex:0,pilot:null,accepted:[],retries:{},engineImprovementRequired:false,lastFailure:null,createdAt:new Date().toISOString()}}
function assertManifest(state,manifest){if(state.manifestDigest!==digest(manifest))throw new Error('Checkpoint manifest digest does not match current challenge manifest')}
function outcome(status,state,checkpointPath){return {status,state,checkpointPath,resumeCommand:status==='CHALLENGE_COMPLETE'?null:exactResumeCommand(checkpointPath,state.driverModule)}}
function summary(result,accepted){return {accepted,status:result?.acceptance?.status||'MISSING_ACCEPTANCE',evidenceDigest:result?.acceptance?.evidenceDigest||null,blockers:result?.acceptance?.blockers||[]}}
function digest(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex')}
function sha(value){return /^[a-f0-9]{64}$/i.test(value||'')}
async function watched(task,ms){let timer;try{return await Promise.race([task(),new Promise((_,reject)=>{timer=setTimeout(()=>{const e=new Error(`Stage exceeded watchdog limit ${ms}ms`);e.code='WATCHDOG_TIMEOUT';reject(e)},ms)})])}finally{clearTimeout(timer)}}

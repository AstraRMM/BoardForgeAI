#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { copyFile, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

const args=new Map(process.argv.slice(2).reduce((rows,value,index,all)=>value.startsWith('--')?[...rows,[value,all[index+1]?.startsWith('--')?true:all[index+1]]]:rows,[]))
const checkpoint=path.resolve(String(args.get('--checkpoint')||''))
const reason=String(args.get('--reason')||'HARDENED_PROJECTION_GATE_INTRODUCED')
if(!checkpoint || checkpoint===path.resolve('.'))throw new Error('--checkpoint is required')
const before=JSON.parse(await readFile(checkpoint,'utf8'))
if(before.schema!=='boardforge.phase2c.autonomous-runner.v1')throw new Error('Unsupported checkpoint schema')
const accepted=Array.isArray(before.accepted)?before.accepted:[]
for(let index=0;index<accepted.length;index++)if(accepted[index]?.index!==index)throw new Error(`Accepted prefix is not contiguous at row ${index}`)
const migratedAt=new Date().toISOString(),beforeDigest=digest(before)
const historical=accepted.map(row=>({...row,invalidatedAt:migratedAt,invalidationReason:reason,priorCheckpointDigest:beforeDigest}))
const after={...before,phase:'awaiting_pilot',nextBoardIndex:0,pilot:null,accepted:[],historicalAcceptances:[...(before.historicalAcceptances||[]),...historical],invalidatedAcceptances:historical,retries:{},engineImprovementRequired:false,lastFailure:null,checkpointMigration:{schema:'boardforge.phase2c.checkpoint-migration.v1',reason,migratedAt,beforeDigest,invalidatedCount:historical.length,rebuildOrder:'001-006,007,008-050',canaryRequired:'007_HARDENED_CANONICAL_CANARY',canaryEvidence:'007_HARDENED_CANONICAL_CANARY/usb-c-esp32-sensor/Evidence/BoardForge_Manufacturing_Evidence.json'}}
const preview={checkpoint,beforeDigest,invalidatedCount:historical.length,nextBoardIndex:after.nextBoardIndex,accepted:after.accepted.length,reason,apply:args.has('--apply')}
if(args.has('--apply')){
  const backup=`${checkpoint}.pre-hardened-${migratedAt.replace(/[:.]/g,'-')}.json`,tmp=`${checkpoint}.${process.pid}.tmp`
  await copyFile(checkpoint,backup);after.checkpointMigration.backup=backup
  await writeFile(tmp,JSON.stringify(after,null,2)+'\n','utf8');await rename(tmp,checkpoint);preview.backup=backup
}
console.log(JSON.stringify(preview,null,2))
function digest(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex')}

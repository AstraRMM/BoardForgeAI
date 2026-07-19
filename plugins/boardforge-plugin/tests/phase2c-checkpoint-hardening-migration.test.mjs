import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile as callback } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import os from 'node:os'
import path from 'node:path'
const execFile=promisify(callback),script=path.resolve(import.meta.dirname,'../../../scripts/migrate-phase2c-hardened-checkpoint.mjs')

test('hardened checkpoint migration preserves and invalidates every historical row before resetting the authoritative prefix',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'bf-checkpoint-migration-')),file=path.join(root,'checkpoint.json')
  const state={schema:'boardforge.phase2c.autonomous-runner.v1',manifestDigest:'a'.repeat(64),phase:'board_batches',nextBoardIndex:2,pilot:{accepted:true},accepted:[{index:0,boardId:'001_A',evidenceDigest:'b'.repeat(64)},{index:1,boardId:'002_B',evidenceDigest:'c'.repeat(64)}],retries:{'1':2},engineImprovementRequired:true,lastFailure:{code:'OLD'}}
  await writeFile(file,JSON.stringify(state))
  await execFile(process.execPath,[script,'--checkpoint',file,'--apply'])
  const migrated=JSON.parse(await readFile(file,'utf8'))
  assert.equal(migrated.phase,'awaiting_pilot');assert.equal(migrated.nextBoardIndex,0);assert.deepEqual(migrated.accepted,[])
  assert.deepEqual(migrated.historicalAcceptances.map(row=>row.boardId),['001_A','002_B'])
  assert.ok(migrated.historicalAcceptances.every(row=>row.invalidationReason==='HARDENED_PROJECTION_GATE_INTRODUCED'))
  assert.equal(migrated.checkpointMigration.invalidatedCount,2);assert.match(migrated.checkpointMigration.backup,/pre-hardened/)
})

test('migration refuses a noncontiguous accepted prefix',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'bf-checkpoint-migration-bad-')),file=path.join(root,'checkpoint.json')
  await writeFile(file,JSON.stringify({schema:'boardforge.phase2c.autonomous-runner.v1',accepted:[{index:1,boardId:'002_B'}]}))
  await assert.rejects(execFile(process.execPath,[script,'--checkpoint',file,'--apply']),/not contiguous/)
})

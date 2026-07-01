import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { buildDirtyRepairTasks, DIRTY_REPAIR_FOLDER, runDirtyRepairProof } from '../lib/repair/drc-repair-supervisor.mjs'

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')

test('dirty repair fixture generation creates isolated synthetic project', async () => {
  const result = await runDirtyRepairProof()
  assert.equal(result.status, 'dirty_repair_manufacturing_candidate_generated')
  assert.equal(result.fixtureFolder, DIRTY_REPAIR_FOLDER)
  assert.equal(fs.existsSync(result.startingBoard), true)
  assert.equal(fs.existsSync(result.finalBoard), true)
  assert.equal(result.before.drc > 0, true)
  assert.equal(result.after.drc, 0)
  assert.equal(result.after.erc, 0)
  assert.equal(result.after.unconnected, 0)
  assert.equal(result.manufacturing.ready, true)
  assert.equal(fs.existsSync(result.manufacturing.zip), true)
})

test('DRC repair task list covers transactional issue families', () => {
  const tasks = buildDirtyRepairTasks({ violations: [{ type: 'tracks_crossing', severity: 'error', items: [] }] })
  const families = new Set(tasks.map((task) => task.type))
  for (const family of ['track_crossing', 'shorting_item', 'solder_mask_bridge', 'dangling_track', 'trace_width']) {
    assert.equal(families.has(family), true)
  }
})

test('dirty-to-clean repair proof emits product artifacts and replay command', () => {
  const output = JSON.parse(execFileSync(process.execPath, [
    path.join(repoRoot, 'plugins', 'boardforge-plugin', 'bin', 'boardforge-dirty-repair-proof.mjs'),
  ], { cwd: repoRoot, stdio: 'pipe', timeout: 120000 }).toString())
  assert.equal(output.status, 'dirty_repair_manufacturing_candidate_generated')
  const manifest = JSON.parse(fs.readFileSync(path.join(DIRTY_REPAIR_FOLDER, 'BoardForge_Project_Manifest.json'), 'utf8'))
  const actionLog = JSON.parse(fs.readFileSync(path.join(DIRTY_REPAIR_FOLDER, 'BoardForge_KiCad_Plugin_Action_Log.json'), 'utf8'))
  const replay = fs.readFileSync(path.join(DIRTY_REPAIR_FOLDER, 'BoardForge_CLI_Replay_Command.txt'), 'utf8')
  assert.equal(manifest.validation.drcViolations, 0)
  assert.equal(actionLog.latestStatus.manufacturingReady, true)
  assert.match(replay, /boardforge:dirty-repair-proof/)
})

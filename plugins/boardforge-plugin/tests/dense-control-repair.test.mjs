import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  buildRepairTasks,
  denseControlRepairRecipes,
  runDenseControlDrcRepair,
} from '../lib/routing/dense-control-repair-workflow.mjs'
import {
  createBoardMutationTransaction,
  loadBoardObjects,
  rerouteNetSegment,
  rollbackMutation,
  validateMutation,
} from '../lib/kicad/kicad-board-mutator.mjs'
import { runPhysicalLocalShoveRouter } from '../lib/routing/local-shove-router.mjs'

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
const denseFolder = 'C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/BF-DENSE-CONTROL-01_REV_A'

test('KiCad board mutator loads and transactionally reroutes generated segments', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boardforge-mutator-'))
  const boardPath = path.join(tmp, 'demo.kicad_pcb')
  fs.writeFileSync(boardPath, `(kicad_pcb (version 20240108)
  (segment (start 0 0) (end 1 1) (width 0.22) (layer "F.Cu") (net "N1") (uuid "11111111-1111-4111-8111-111111111111"))
)`)
  const board = loadBoardObjects(boardPath)
  assert.equal(board.segments.length, 1)
  const tx = createBoardMutationTransaction(boardPath)
  const result = rerouteNetSegment(tx, 'N1', [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }])
  assert.equal(result.addedSegments, 2)
  assert.equal(loadBoardObjects(boardPath).segments.length, 2)
  rollbackMutation(tx)
  assert.equal(loadBoardObjects(boardPath).segments.length, 1)
})

test('local shove router can physically mutate a board under score gate', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boardforge-shove-'))
  const boardPath = path.join(tmp, 'demo.kicad_pcb')
  fs.writeFileSync(boardPath, `(kicad_pcb (version 20240108)
  (segment (start 0 0) (end 1 1) (width 0.22) (layer "F.Cu") (net "I2C") (uuid "11111111-1111-4111-8111-111111111111"))
)`)
  const result = runPhysicalLocalShoveRouter(boardPath, [{
    type: 'reroute_net_segment',
    net: 'I2C',
    points: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }],
  }], {
    before: { drcTotal: 2, shorts: 0, unconnected: 0, forbiddenVias: 0, erc: 0 },
    after: { drcTotal: 1, shorts: 0, unconnected: 0, forbiddenVias: 0, erc: 0 },
  })
  assert.equal(result.status, 'COMMITTED_IMPROVED')
  assert.equal(loadBoardObjects(boardPath).segments.length, 2)
})

test('mutation score gate rejects equal or worse DRC', () => {
  const gate = validateMutation(
    { drcTotal: 2, shorts: 0, unconnected: 0, forbiddenVias: 0, erc: 0 },
    { drcTotal: 2, shorts: 0, unconnected: 0, forbiddenVias: 0, erc: 0 },
  )
  assert.equal(gate.accepted, false)
})

test('dense-control DRC parser creates exact repair tasks', () => {
  const report = JSON.parse(fs.readFileSync(path.join(denseFolder, 'reports', 'drc.json'), 'utf8'))
  const tasks = buildRepairTasks(report)
  assert.ok(tasks.length >= 6)
  assert.ok(tasks.some((task) => task.drcType === 'shorting_items' && task.requiresCopperMutation))
  assert.ok(tasks.some((task) => task.drcType === 'silk_overlap' && task.requiresSilkMutation))
})

test('dense-control repair recipes cover every copper DRC family', () => {
  const recipes = denseControlRepairRecipes()
  assert.ok(recipes.some((recipe) => recipe.net === 'I2C_SCL'))
  assert.ok(recipes.some((recipe) => recipe.net === 'REG_3V3'))
  assert.ok(recipes.some((recipe) => recipe.net === 'USB_DP'))
  assert.ok(recipes.some((recipe) => recipe.net === 'CAN_TX'))
  assert.ok(recipes.some((recipe) => recipe.net === 'GPS_TX'))
})

test('dense-control repair CLI is wired', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'plugins/boardforge-plugin/package.json'), 'utf8'))
  assert.match(packageJson.scripts['boardforge:dense-control-repair'], /boardforge-dense-control-repair\.mjs/)
})

test('dense-control repair run creates candidate, reports, and clean manufacturing gate when KiCad validates', { timeout: 180000 }, async () => {
  execFileSync(process.execPath, [
    path.join(repoRoot, 'plugins/boardforge-plugin/bin/boardforge-fixture-runner.mjs'),
    '--run',
    '--fixture',
    'dense-control',
  ], { cwd: repoRoot, stdio: 'pipe', timeout: 180000 })

  const result = await runDenseControlDrcRepair({ fixtureFolder: denseFolder })
  assert.equal(result.status, 'dense_control_manufacturing_candidate_generated')
  assert.equal(result.after.drc, 0)
  assert.equal(result.after.erc, 0)
  assert.equal(result.after.unconnected, 0)
  assert.equal(result.after.shorts, 0)
  assert.ok(fs.existsSync(result.latestBoard))
  assert.ok(fs.existsSync(result.repairTaskList))
  assert.equal(fs.existsSync(result.manufacturing.zip), true)
})

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { runPlacementRepairLoop } from '../lib/placement/placement-repair-loop.mjs'
import { runLocalShoveRouter } from '../lib/routing/local-shove-router.mjs'
import { scoreBoardRouteability } from '../lib/routeability/routeability-scorer.mjs'

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')

test('web dashboard pages consume BoardForge manifest data instead of fake cloud actions', () => {
  const pages = [
    'apps/web/src/app/page.tsx',
    'apps/web/src/app/dashboard/page.tsx',
    'apps/web/src/app/projects/page.tsx',
    'apps/web/src/app/downloads/page.tsx',
    'apps/web/src/app/new-board/page.tsx',
    'apps/web/src/app/upload-kicad/page.tsx',
    'apps/web/src/app/reports/page.tsx',
    'apps/web/src/app/settings/page.tsx',
    'apps/web/src/app/docs/page.tsx',
    'apps/web/src/app/pricing/page.tsx',
  ]
  for (const page of pages) assert.equal(fs.existsSync(path.join(repoRoot, page)), true, `${page} should exist`)
  const dashboard = fs.readFileSync(path.join(repoRoot, 'apps/web/src/app/dashboard/page.tsx'), 'utf8')
  const newBoard = fs.readFileSync(path.join(repoRoot, 'apps/web/src/app/new-board/page.tsx'), 'utf8')
  assert.match(dashboard, /project-dashboard\.json/)
  assert.match(dashboard, /Manufacturing Ready/)
  assert.match(newBoard, /Cloud execution is not enabled/)
})

test('routeability scorer rejects tight corridor candidates before routing', () => {
  const score = scoreBoardRouteability({
    id: 'dense_bad_corridor',
    outline: { widthMm: 58, heightMm: 36, features: ['notch'] },
    corridors: [{ id: 'mcu-usb', widthMm: 0.6, congestion: 0.9 }],
    placements: { U1: { x: 30, y: 18 }, J1: { x: 4, y: 18 }, J2: { x: 54, y: 18 } },
    connectors: [{ ref: 'J1', x: 6, y: 18 }, { ref: 'J2', x: 52, y: 18 }],
    nets: [{ from: { ref: 'J1' }, to: { ref: 'U1' } }, { from: { ref: 'J2' }, to: { ref: 'U1' } }],
  })
  assert.equal(score.recommendation, 'repair_placement_before_routing')
  assert.ok(score.corridor.blockedCorridors.length > 0)
})

test('placement repair loop moves components away from blocked corridors', () => {
  const result = runPlacementRepairLoop([{
    id: 'dense_control_candidate_a',
    outline: { widthMm: 58, heightMm: 36 },
    corridors: [{ id: 'center-corridor', widthMm: 0.5, congestion: 0.85, refs: ['U2'], centerX: 20, centerY: 18 }],
    placements: { U1: { x: 30, y: 18 }, U2: { x: 20, y: 18 }, J1: { x: 5, y: 18 } },
    nets: [{ from: { ref: 'J1' }, to: { ref: 'U1' } }],
  }])
  assert.ok(result.candidatesAnalyzed > 1)
  assert.ok(result.selected)
  assert.equal(result.schema, 'boardforge.placement-repair-loop.v1')
})

test('local shove router commits only when exact connectivity improves and safety gates pass', () => {
  const ratsnest = {
    id: 'RN1',
    net: 'I2C_SCL',
    source: { ref: 'U1', pad: '1', x: 10, y: 10 },
    target: { ref: 'J4', pad: '1', x: 20, y: 10 },
  }
  const objects = [
    { id: 'seg1', generated: true, net: 'CAN_TX', x: 15, y: 10, preferredDirection: 'down' },
  ]
  const committed = runLocalShoveRouter(ratsnest, objects, { simulateResult: { shorts: 0, forbiddenVias: 0, connectivityImproved: true } })
  assert.equal(committed.status, 'COMMITTED_IMPROVED')
  assert.equal(committed.committed, true)
  const unsafe = runLocalShoveRouter(ratsnest, objects, { simulateResult: { shorts: 1, forbiddenVias: 0, connectivityImproved: true } })
  assert.equal(unsafe.status, 'ROLLED_BACK_UNSAFE')
  assert.equal(unsafe.rolledBack, true)
})

test('dense-control fixture is listed and emits platform artifacts when run', () => {
  const list = JSON.parse(execFileSync(process.execPath, [
    path.join(repoRoot, 'plugins/boardforge-plugin/bin/boardforge-fixture-runner.mjs'),
    '--list',
  ], { cwd: repoRoot, stdio: 'pipe' }).toString())
  assert.ok(list.fixtures.includes('dense-control'))

  const output = JSON.parse(execFileSync(process.execPath, [
    path.join(repoRoot, 'plugins/boardforge-plugin/bin/boardforge-fixture-runner.mjs'),
    '--run',
    '--fixture',
    'dense-control',
  ], { cwd: repoRoot, stdio: 'pipe', timeout: 120000 }).toString())
  assert.equal(output.status, 'FIXTURE_RUN_COMPLETED')
  const projectRoot = 'C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/BF-DENSE-CONTROL-01_REV_A'
  assert.equal(fs.existsSync(path.join(projectRoot, 'BF-DENSE-CONTROL-01_REV_A.kicad_pcb')), true)
  assert.equal(fs.existsSync(path.join(projectRoot, 'BoardForge_Project_Manifest.json')), true)
  const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'BoardForge_Project_Manifest.json'), 'utf8'))
  assert.equal(manifest.projectId, 'BF-DENSE-CONTROL-01_REV_A')
})

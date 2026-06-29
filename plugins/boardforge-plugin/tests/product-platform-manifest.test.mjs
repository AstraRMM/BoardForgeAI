import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import test from 'node:test'
import { createDashboardManifest, createEnginePlan, ENGINE_WORKFLOW_STEPS, selectBestBoardCandidate } from '../lib/engine/boardforge-engine.mjs'
import { isManufacturingReadyManifest } from '../lib/platform/project-manifest.mjs'
import { writeAiSessionReport } from '../lib/platform/ai-session-report.mjs'
import { buildProjectDashboardData, buildProjectDashboardCard } from '../lib/platform/project-dashboard-data.mjs'

test('local engine exposes required workflow API names', () => {
  const plan = createEnginePlan({ name: 'demo' })
  assert.deepEqual(plan.steps, [...ENGINE_WORKFLOW_STEPS])
  assert.ok(plan.hardGates.includes('manufacturing_requires_clean_validation'))
})

test('project manifest gates manufacturing readiness from validation evidence', () => {
  const manifest = createDashboardManifest({ name: 'REV_F' }, {
    status: 'manufacturing_candidate',
    shorts: 0,
    unconnected: 0,
    forbiddenVias: 0,
    drcViolations: 0,
    ercViolations: 0,
    manufacturingReady: true,
    manufacturingZip: 'rev-f.zip',
  })
  assert.equal(isManufacturingReadyManifest(manifest), true)
})

test('dashboard sample manifest is product-readable and honest about blocked fixtures', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'apps', 'web', 'src', 'sample-manifests', 'rev-f.json'), 'utf8'))
  assert.equal(manifest.schema, 'boardforge.project-manifest.v1')
  assert.equal(manifest.validation.shorts, 0)
  assert.ok(manifest.validation.unconnected > 0)
  assert.equal(manifest.manufacturing.ready, false)
  const dashboard = JSON.parse(fs.readFileSync(path.join(repoRoot, 'apps', 'web', 'src', 'sample-manifests', 'project-dashboard.json'), 'utf8'))
  assert.equal(dashboard.schema, 'boardforge.project-dashboard-data.v1')
  assert.equal(dashboard.summary.totalProjects, 2)
  assert.equal(dashboard.summary.manufacturingReady, 1)
  assert.equal(dashboard.summary.blocked, 1)
  assert.equal(dashboard.projects.some((project) => project.projectId === 'BF-ODD-SHAPE-ROBOT-01_REV_A' && project.readiness === 'ready'), true)
  assert.equal(dashboard.projects.some((project) => project.projectId === 'BF-SENSOR-HUB-01_REV_F' && project.readiness === 'blocked'), true)
})

test('manifest-driven dashboard data normalizes real fixture evidence', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
  const oddShapeManifestPath = 'C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/BF-ODD-SHAPE-ROBOT-01_REV_A/boardforge-project-manifest.json'
  const oddShape = JSON.parse(fs.readFileSync(oddShapeManifestPath, 'utf8'))
  const revF = JSON.parse(fs.readFileSync(path.join(repoRoot, 'apps', 'web', 'src', 'sample-manifests', 'rev-f.json'), 'utf8'))
  const card = buildProjectDashboardCard(oddShape, { sourceManifest: oddShapeManifestPath })
  assert.equal(card.schema, 'boardforge.project-dashboard-card.v1')
  assert.equal(card.readiness, 'ready')
  assert.equal(card.validation.drcViolations, 0)
  assert.equal(card.validation.ercViolations, 0)
  assert.equal(card.validation.schematicGraphStatus, 'real_symbol_graph_generated')
  assert.equal(card.nextAction, 'human_manufacturing_review')
  const dashboard = buildProjectDashboardData([revF, oddShape], { generatedAt: '2026-06-28T00:00:00.000Z' })
  assert.equal(dashboard.schema, 'boardforge.project-dashboard-data.v1')
  assert.equal(dashboard.summary.totalProjects, 2)
  assert.equal(dashboard.summary.manufacturingReady, 1)
  assert.equal(dashboard.summary.blocked, 1)
  assert.equal(dashboard.projects.some((project) => project.readiness === 'ready'), true)
  assert.equal(dashboard.projects.some((project) => project.readiness === 'blocked'), true)
})

test('AI session report is model-agnostic and preserves protected rejections', () => {
  const report = writeAiSessionReport([
    { type: 'route_project', projectPath: 'C:/Users/luifi/Desktop/FN-ESC1/board.kicad_pcb' },
  ], { modelAdapter: 'codex' })
  assert.equal(report.modelAdapter, 'codex')
  assert.equal(report.protectedRejections, 1)
})

test('engine candidate selector reuses routeability promotion gate', () => {
  const result = selectBestBoardCandidate([
    { id: 'pretty', unconnected: 4, drcViolations: 0 },
    { id: 'clean', unconnected: 0, drcViolations: 0, shorts: 0, forbiddenVias: 0 },
  ])
  assert.equal(result.best.id, 'clean')
})

test('odd-shape robot fixture declares non-rectangular routeability risks', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
  const fixture = JSON.parse(fs.readFileSync(path.join(repoRoot, 'fixtures', 'boards', 'odd-shape-robot', 'fixture.json'), 'utf8'))
  assert.equal(fixture.id, 'odd-shape-robot')
  assert.match(fixture.outline.shape, /odd/)
  assert.ok(fixture.knownRisks.some((risk) => /narrow corridors/.test(risk)))
})

test('fixture runner creates odd-shape preroute KiCad artifacts without fake manufacturing', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
  execFileSync(process.execPath, [
    path.join(repoRoot, 'plugins', 'boardforge-plugin', 'bin', 'boardforge-fixture-runner.mjs'),
    '--run',
    '--fixture',
    'odd-shape-robot',
  ], { cwd: repoRoot, stdio: 'pipe' })

  const projectRoot = 'C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/BF-ODD-SHAPE-ROBOT-01_REV_A'
  const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'boardforge-project-manifest.json'), 'utf8'))
  const routeability = JSON.parse(fs.readFileSync(path.join(projectRoot, 'BoardForge_Odd_Shape_Routeability_Report.json'), 'utf8'))
  const schematic = fs.readFileSync(path.join(projectRoot, 'BF-ODD-SHAPE-ROBOT-01_REV_A.kicad_sch'), 'utf8')
  assert.equal(fs.existsSync(path.join(projectRoot, 'BF-ODD-SHAPE-ROBOT-01_REV_A.kicad_pcb')), true)
  assert.equal(fs.existsSync(path.join(projectRoot, 'BF-ODD-SHAPE-ROBOT-01_REV_A.kicad_sch')), true)
  assert.equal(manifest.status, 'routed_fixture_validated')
  assert.equal(manifest.validation.drcErrors, 0)
  assert.equal(manifest.validation.ercErrors, 0)
  assert.equal(manifest.validation.unconnected, 0)
  assert.ok(manifest.validation.namedNets > 0)
  assert.ok(manifest.validation.routedSegments > 0)
  assert.ok(manifest.validation.nettedPads > 0)
  assert.equal(manifest.validation.schematicGraphStatus, 'real_symbol_graph_generated')
  assert.ok(manifest.validation.schematicSymbols >= 10)
  assert.ok(manifest.validation.schematicGlobalLabels >= 10)
  assert.ok(manifest.validation.schematicWires >= 10)
  assert.match(schematic, /\(lib_symbols/)
  assert.match(schematic, /\(symbol \(lib_id "BoardForge:FIXTURE_8PIN"/)
  assert.match(schematic, /\(global_label "USB_DP"/)
  assert.match(schematic, /\(global_label "REG_3V3"/)
  assert.match(schematic, /\(global_label "CAN_TX"/)
  assert.equal(manifest.manufacturing.ready, true)
  assert.equal(manifest.manufacturing.blockedReason, null)
  assert.equal(fs.existsSync(manifest.manufacturing.zip), true)
  assert.equal(routeability.schema, 'boardforge.routeability-report.v1')
  assert.equal(routeability.validation.schematicGraph.schematicSymbols, manifest.validation.schematicSymbols)
  assert.equal(routeability.manufacturing.ready, true)
  assert.equal(fs.existsSync(path.join(projectRoot, 'reports', 'drc.json')), true)
  assert.equal(fs.existsSync(path.join(projectRoot, 'reports', 'erc.json')), true)
})

test('report 90 quick mode runs bounded fixture subset', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
  const output = execFileSync(process.execPath, [
    path.join(repoRoot, 'plugins', 'boardforge-plugin', 'bin', 'boardforge-regression.mjs'),
    '--workspace',
    path.join(repoRoot, 'plugins', 'boardforge-plugin', 'tmp', 'quick-regression-test'),
    '--target',
    '90',
    '--quick',
    '--fresh',
  ], { cwd: repoRoot, stdio: 'pipe', timeout: 60000 })
  const result = JSON.parse(output.toString())
  assert.equal(result.quickMode, true)
  assert.deepEqual(result.selectedFixtureIds, [
    'dense_difficult_honest_failure',
    'odd_shaped_outline',
    'rounded_rectangle_outline_only',
    'missing_library_footprint',
    'arbitrary_prompt_too_small',
  ])
  assert.equal(typeof result.readiness, 'number')
  assert.ok(result.reportFiles.jsonFile)
})

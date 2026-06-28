import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { createDashboardManifest, createEnginePlan, ENGINE_WORKFLOW_STEPS, selectBestBoardCandidate } from '../lib/engine/boardforge-engine.mjs'
import { isManufacturingReadyManifest } from '../lib/platform/project-manifest.mjs'
import { writeAiSessionReport } from '../lib/platform/ai-session-report.mjs'

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

test('dashboard sample manifest is product-readable and clean', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'apps', 'web', 'src', 'sample-manifests', 'rev-f.json'), 'utf8'))
  assert.equal(manifest.schema, 'boardforge.project-manifest.v1')
  assert.equal(manifest.validation.unconnected, 0)
  assert.equal(manifest.manufacturing.ready, true)
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

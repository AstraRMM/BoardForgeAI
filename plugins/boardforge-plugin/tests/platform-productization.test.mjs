import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { buildAiSessionReport, planAiCommand } from '../lib/platform/ai-command-runner.mjs'
import { normalizeAiCommand, validateAiCommand } from '../lib/platform/ai-command-schema.mjs'
import { buildBoardForgeProductManifest, validateProductManifest } from '../lib/platform/product-manifest.mjs'
import { choosePromotionCandidate, scoreRouteabilityCandidate } from '../lib/routing/routeability-optimizer.mjs'

test('product manifest covers BoardForge platform surfaces and capabilities', () => {
  const manifest = buildBoardForgeProductManifest({ generatedAt: '2026-06-28T00:00:00.000Z' })
  const validation = validateProductManifest(manifest)
  assert.equal(validation.valid, true)
  assert.ok(manifest.surfaces.includes('web_dashboard'))
  assert.ok(manifest.surfaces.includes('kicad_plugin'))
  assert.ok(manifest.capabilities.includes('manufacturing_readiness_gate'))
})

test('AI command runner rejects protected ESC and FC paths', () => {
  const esc = planAiCommand({ type: 'route_project', projectPath: 'C:/Users/luifi/Desktop/FN-ESC1/some-board.kicad_pcb' })
  const fc = planAiCommand({ type: 'route_project', projectPath: 'C:/Users/luifi/Desktop/my-flight-controller/project.kicad_pcb' })
  assert.equal(esc.accepted, false)
  assert.equal(fc.accepted, false)
  assert.equal(esc.reason, 'protected_user_project')
})

test('AI session report counts protected-path rejections', () => {
  const report = buildAiSessionReport([
    { type: 'route_project', projectPath: 'C:/Users/luifi/Desktop/FN-ESC1/board.kicad_pcb' },
    { type: 'create_project', projectPath: 'C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/new-board' },
  ])
  assert.equal(report.accepted, 1)
  assert.equal(report.protectedRejections, 1)
})

test('AI command layer normalizes aliases and maps to canonical CLI verbs', () => {
  const routed = planAiCommand({
    type: 'route_project',
    projectPath: 'C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/demo-board',
    dryRun: true,
  }, { workspace: 'C:/Users/luifi/Desktop/BoardForge_Dev/boardforge-ai/boardforge-workspace' })
  assert.equal(routed.accepted, true)
  assert.equal(routed.command.type, 'run_routing')
  assert.equal(routed.command.originalType, 'route_project')
  assert.equal(routed.cli.verb, 'route')
  assert.match(routed.cli.commandLine, /boardforge:route/)
  assert.equal(routed.engineJob.type, 'autoroute_and_apply')

  const validation = validateAiCommand({ type: 'continue_from_checkpoint', projectPath: 'C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/demo-board' })
  assert.equal(validation.valid, true)
  assert.equal(normalizeAiCommand({ type: 'run_drc_erc', projectPath: 'safe' }).type, 'validate_project')
})

test('routeability scoring promotes clean fallback over prettier incomplete outline', () => {
  const outlineAware = scoreRouteabilityCandidate({
    id: 'REV_F_outline_aware_attempt',
    unconnected: 23,
    shorts: 0,
    forbiddenVias: 0,
    drcViolations: 8,
    connectorGeometryPenalty: 0,
    areaMm2: 2100,
  })
  const fallback = scoreRouteabilityCandidate({
    id: 'REV_F_verified_compact_fallback',
    unconnected: 0,
    shorts: 0,
    forbiddenVias: 0,
    drcViolations: 0,
    connectorGeometryPenalty: 30,
    areaMm2: 2291.21,
  })
  assert.equal(outlineAware.manufacturable, false)
  assert.equal(fallback.manufacturable, true)
  assert.ok(fallback.score > outlineAware.score)
})

test('promotion candidate chooses verified manufacturing candidate when outline-aware route stalls', () => {
  const result = choosePromotionCandidate([
    { id: 'REV_F_outline_aware_attempt', unconnected: 23, drcViolations: 8, shorts: 0, forbiddenVias: 0 },
    { id: 'REV_F_completed_manufacturing_candidate', unconnected: 0, drcViolations: 0, shorts: 0, forbiddenVias: 0, completionMethod: 'verified_clean_compact_route_topology_fallback' },
  ])
  assert.equal(result.best.id, 'REV_F_completed_manufacturing_candidate')
  assert.equal(result.reason, 'selected_clean_manufacturing_candidate')
})

test('KiCad plugin scaffold refuses protected paths and hands off to CLI', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
  const pluginPath = path.join(repoRoot, 'kicad-plugin', 'boardforge_action_plugin.py')
  const source = fs.readFileSync(pluginPath, 'utf8')
  assert.match(source, /def is_protected_path/)
  assert.match(source, /FN-ESC1/)
  assert.match(source, /import_sandbox/)
  assert.match(source, /boardforge:import-sandbox/)
  assert.match(source, /Route\/Cleanup disabled on active project/)
  assert.match(source, /boardforge:route-finish/)
  assert.match(source, /refused protected project path/i)
})

test('web upload page presents sandbox import without source mutation', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
  const pagePath = path.join(repoRoot, 'apps', 'web', 'src', 'app', 'upload-kicad', 'page.tsx')
  const helperPath = path.join(repoRoot, 'apps', 'web', 'src', 'lib', 'import-sandbox.ts')
  const page = fs.readFileSync(pagePath, 'utf8')
  const helper = fs.readFileSync(helperPath, 'utf8')
  assert.match(page, /Original project is never modified/)
  assert.match(page, /boardforge:import-sandbox/)
  assert.match(page, /Protected paths are refused/)
  assert.match(helper, /previewImportSandbox/)
  assert.match(helper, /originalMutationPolicy/)
  assert.match(helper, /BLOCKED_PROTECTED_USER_PROJECT/)
})

test('readiness evidence dashboard exposes score, gaps, and proof counts', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
  const pagePath = path.join(repoRoot, 'apps', 'web', 'src', 'app', 'readiness', 'page.tsx')
  const evidencePath = path.join(repoRoot, 'apps', 'web', 'src', 'sample-manifests', 'readiness-evidence.json')
  const page = fs.readFileSync(pagePath, 'utf8')
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'))
  assert.equal(evidence.readiness >= 73, true)
  assert.equal(evidence.evidence.cleanFixtures >= 8, true)
  assert.equal(evidence.evidence.dirtyToCleanRepairs >= 1, true)
  assert.match(page, /Readiness/)
  assert.match(page, /Known gaps/)
  assert.match(page, /Latest proof tests/)
})

test('canonical BoardForge CLI maps product commands to guarded engine jobs', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
  const cli = path.join(repoRoot, 'plugins', 'boardforge-plugin', 'bin', 'boardforge-cli.mjs')
  const project = path.join(repoRoot, 'plugins', 'boardforge-plugin', 'tmp', 'cli-safe-project')
  const validate = JSON.parse(execFileSync(process.execPath, [
    cli,
    'validate',
    '--project',
    project,
    '--workspace',
    path.join(repoRoot, 'plugins', 'boardforge-plugin', 'tmp', 'cli-workspace'),
    '--dry-run',
  ], { cwd: repoRoot, stdio: 'pipe' }).toString())
  assert.equal(validate.status, 'BOARD_FORGE_CLI_DRY_RUN')
  assert.equal(validate.job.type, 'run_project_preflight')

  const report = JSON.parse(execFileSync(process.execPath, [
    cli,
    'report',
    '--manifest',
    path.join(repoRoot, 'apps', 'web', 'src', 'sample-manifests', 'rev-f.json'),
    '--output',
    path.join(repoRoot, 'plugins', 'boardforge-plugin', 'tmp', 'cli-dashboard.json'),
    '--dry-run',
  ], { cwd: repoRoot, stdio: 'pipe' }).toString())
  assert.equal(report.kind, 'dashboard-data')
  assert.equal(report.dashboard.manifestPaths.length, 1)

  const blocked = spawnSync(process.execPath, [
    cli,
    'route',
    '--project',
    'C:/Users/luifi/Desktop/FN-ESC1/protected.kicad_pcb',
    '--dry-run',
  ], { cwd: repoRoot, encoding: 'utf8' })
  assert.notEqual(blocked.status, 0)
  assert.match(blocked.stderr, /protected_user_project/)
})

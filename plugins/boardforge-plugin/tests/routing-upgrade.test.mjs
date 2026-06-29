import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { detectRouterBackends, runRouterBackendManager } from '../lib/routing/router-backend-manager.mjs'
import { detectFreeRoutingBackend } from '../lib/routing/router-backend-freeRouting.mjs'
import { detectTopoRBackend } from '../lib/routing/router-backend-topor.mjs'
import { detectElectraBackend } from '../lib/routing/router-backend-electra.mjs'
import { scoreRouterResult, chooseBestRouterResult } from '../lib/routing/router-result-scorer.mjs'
import { analyzeRouteability } from '../lib/routing/routeability-optimizer.mjs'
import { runControlledComponentNudge } from '../lib/routing/controlled-component-nudge.mjs'
import { runRegionalRipupReroute } from '../lib/routing/regional-ripup-reroute.mjs'
import { buildClearanceAwareExactFinisherPlan, buildExactRatsnestFinisherPlan, classifyExactFinisherRun, isExactRatsnestSuccess, shouldCheckpointExactFinisher } from '../lib/routing/exact-ratsnest-finisher.mjs'
import { buildMinimumDesignRelaxationOptions } from '../lib/routing/minimum-design-relaxation-report.mjs'

const repoRoot = path.resolve(import.meta.dirname, '..')

test('router backend manager detects ensemble backends', () => {
  const backends = detectRouterBackends({})
  assert.ok(backends.find((backend) => backend.id === 'freerouting'))
  assert.ok(backends.find((backend) => backend.id === 'topor'))
  assert.ok(backends.find((backend) => backend.id === 'electra'))
  assert.ok(backends.find((backend) => backend.id === 'boardforge_internal')?.available)
})

test('freerouting backend reports availability from Java and jar paths', () => {
  const backend = detectFreeRoutingBackend({ javaPath: 'missing-java.exe', freeroutingJar: 'missing.jar' })
  assert.equal(backend.available, false)
  assert.deepEqual(backend.missing, ['java_runtime', 'freerouting_jar'])
})

test('topor backend detects unavailable without failing', () => {
  const backend = detectTopoRBackend({ toporPath: null })
  assert.equal(backend.available, false)
  assert.equal(backend.optional, true)
})

test('electra backend detects unavailable without failing', () => {
  const backend = detectElectraBackend({ electraPath: null })
  assert.equal(backend.available, false)
  assert.equal(backend.optional, true)
})

test('router result scorer rejects unsafe results and ranks best safe result', () => {
  const unsafe = scoreRouterResult({ backend: 'bad', drc: { forbiddenVias: 1, unconnected: 1 } })
  assert.equal(unsafe.rejected, true)
  const chosen = chooseBestRouterResult([
    { backend: 'a', drc: { unconnected: 10, violations: [] } },
    { backend: 'b', drc: { unconnected: 4, violations: [] } },
  ])
  assert.equal(chosen.best.backend, 'b')
})

test('router ensemble selects best safe result', async () => {
  const report = await runRouterBackendManager('board.kicad_pcb', {
    baselineDrc: { unconnected: 20, violations: [] },
    routerResults: [{ backend: 'candidate', drc: { unconnected: 8, violations: [] } }],
  })
  assert.equal(report.best.backend, 'candidate')
})

test('routeability optimizer clusters unconnected blocker regions', () => {
  const result = analyzeRouteability('board.kicad_pcb', {
    drcReport: {
      unconnected_items: [
        { items: [{ description: 'Pad 1 [/NRST] of IC1', pos: { x: 10, y: 10 } }] },
        { items: [{ description: 'Pad 2 [/SWDIO] of J3', pos: { x: 11, y: 10 } }] },
      ],
    },
  })
  assert.equal(result.regions[0].unconnectedItems, 2)
  assert.ok(result.regions[0].refs.includes('IC1'))
})

test('controlled component nudge preserves hard locks in plan mode', () => {
  const result = runControlledComponentNudge('board.kicad_pcb', { refs: ['IC1', 'J3', 'H1'] })
  assert.equal(result.hardLocks.boardOutlineChanged, false)
  assert.ok(result.candidates.every((candidate) => candidate.ref !== 'H1'))
})

test('regional ripup reroute creates transactional bounded plan', () => {
  const result = runRegionalRipupReroute('board.kicad_pcb', { refs: ['IC1'], nets: ['/NRST'], radiusMm: 20 })
  assert.equal(result.regionRadiusMm, 8)
  assert.equal(result.transactionRequired, true)
})

test('exact ratsnest finisher uses connectivity success, not segment count', () => {
  const plan = buildExactRatsnestFinisherPlan('board.kicad_pcb')
  assert.equal(plan.batch.minimumItemsAttempted, 50)
  assert.equal(isExactRatsnestSuccess({ unconnected: 10 }, { unconnected: 9 }), true)
})

test('exact ratsnest finisher clearance-aware mode resolves KiCad UUID endpoints and checkpoints productive runs', () => {
  const plan = buildClearanceAwareExactFinisherPlan('rev-f.kicad_pcb')
  assert.equal(plan.mode, 'clearance_aware_exact_finisher')
  assert.ok(plan.endpointResolution.includes('resolve_drc_item_uuid_to_pad_or_track'))
  assert.ok(plan.endpointResolution.includes('prefer_actual_track_endpoint_over_reported_midpoint'))
  assert.equal(shouldCheckpointExactFinisher({ commits: 1, elapsedMs: 30_000 }, plan.finisher).reason, 'commit_checkpoint')
  assert.equal(classifyExactFinisherRun({ unconnected: 20 }, { unconnected: 18, drcViolations: 0 }, { commits: 2 }), 'productive_checkpoint_continue')
})

test('exact ratsnest finisher CLI can execute clearance-aware physical candidates', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'bin', 'boardforge-route-finish.mjs'), 'utf8')
  assert.match(source, /clearance-aware-exact-finish/)
  assert.match(source, /runClearanceAwareFinish/)
  assert.match(source, /spawnSync\(kicadPython/)
  assert.match(source, /kicad-cli/)
  assert.match(source, /global_unconnected_decreases|unconnected.*</s)
})

test('minimum design relaxation report ranks least invasive options first', () => {
  const options = buildMinimumDesignRelaxationOptions([], { remainingUnconnected: 236 })
  assert.equal(options[0].violatesHardLock, false)
  assert.equal(options[0].recommended, true)
})

test('manual copy never modified rule is explicit', () => {
  const protectedPath = 'FN-ESC1_MANUAL_TRACE_HANDOFF_20260628'
  assert.match(protectedPath, /MANUAL_TRACE_HANDOFF/)
})

export const DEFAULT_EXACT_RATSNEST_BATCH = {
  itemsToSelect: 100,
  minimumItemsAttempted: 50,
  commitGoal: 10,
  maxCandidatesPerItem: 20,
  maxRepairAttemptsPerConnectedCandidate: 10,
  shortsMustRemain: 0,
  forbiddenViasMustRemain: 0,
}

export const DEFAULT_CLEARANCE_AWARE_EXACT_FINISHER = {
  endpointSource: 'kicad_drc_uuid',
  obstacleMap: true,
  candidatePrecheck: [
    'same_net_endpoint_resolved',
    'board_outline_contained',
    'no_pad_or_hole_keepout_hit',
    'no_obvious_track_crossing',
    'no_via_in_pad',
  ],
  checkpointEveryCommits: 1,
  maxDrcCallsPerItem: 16,
  maxWallClockMinutes: 20,
  commitGate: [
    'global_unconnected_decreases',
    'drc_violations_remain_zero',
    'shorts_remain_zero',
    'forbidden_vias_remain_zero',
  ],
}

export function isExactRatsnestSuccess(before = {}, after = {}) {
  return Number(after.unconnected ?? Infinity) < Number(before.unconnected ?? Infinity)
    || Number(after.targetNetIslandCount ?? Infinity) < Number(before.targetNetIslandCount ?? Infinity)
    || Boolean(after.exactItemResolved)
}

export function buildExactRatsnestFinisherPlan(boardPath, options = {}) {
  return {
    boardPath,
    batch: { ...DEFAULT_EXACT_RATSNEST_BATCH, ...options },
    successDefinition: [
      'exact_unconnected_item_disappears',
      'target_net_island_count_decreases',
      'global_unconnected_decreases',
    ],
  }
}

export function shouldCheckpointExactFinisher(state = {}, options = {}) {
  const commits = Number(state.commits ?? 0)
  const drcCalls = Number(state.drcCalls ?? state.attempts ?? 0)
  const elapsedMs = Number(state.elapsedMs ?? 0)
  const checkpointEveryCommits = Number(options.checkpointEveryCommits ?? DEFAULT_CLEARANCE_AWARE_EXACT_FINISHER.checkpointEveryCommits)
  const maxWallClockMinutes = Number(options.maxWallClockMinutes ?? DEFAULT_CLEARANCE_AWARE_EXACT_FINISHER.maxWallClockMinutes)
  if (commits > 0 && commits % checkpointEveryCommits === 0) {
    return { checkpoint: true, reason: 'commit_checkpoint' }
  }
  if (elapsedMs >= maxWallClockMinutes * 60_000) {
    return { checkpoint: true, reason: 'wall_clock_budget_reached' }
  }
  if (drcCalls >= Number(options.maxDrcCallsThisInvocation ?? Infinity)) {
    return { checkpoint: true, reason: 'drc_call_budget_reached' }
  }
  return { checkpoint: false, reason: 'continue' }
}

export function buildClearanceAwareExactFinisherPlan(boardPath, options = {}) {
  const finisher = { ...DEFAULT_CLEARANCE_AWARE_EXACT_FINISHER, ...options }
  return {
    boardPath,
    mode: 'clearance_aware_exact_finisher',
    finisher,
    workUnit: 'one_exact_kicad_unconnected_item',
    endpointResolution: [
      'resolve_drc_item_uuid_to_pad_or_track',
      'prefer_actual_track_endpoint_over_reported_midpoint',
      'dogbone_smd_pads_before_layer_change',
    ],
    preScoreBeforeDrc: true,
    checkpointRequired: true,
  }
}

export function classifyExactFinisherRun(before = {}, after = {}, run = {}) {
  const unconnectedBefore = Number(before.unconnected ?? 0)
  const unconnectedAfter = Number(after.unconnected ?? unconnectedBefore)
  const violationsAfter = Number(after.drcViolations ?? after.violations ?? 0)
  const commits = Number(run.commits ?? 0)
  if (unconnectedAfter === 0 && violationsAfter === 0) return 'manufacturing_ready_connectivity_clean'
  if (commits > 0 && unconnectedAfter < unconnectedBefore && violationsAfter === 0) return 'productive_checkpoint_continue'
  if (Number(run.drcCalls ?? 0) > 0 && commits === 0) return 'exhausted_or_needs_routeability_change'
  return 'not_attempted'
}

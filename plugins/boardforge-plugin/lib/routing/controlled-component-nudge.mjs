export function generateControlledNudgeCandidates(blockerRegion = {}, options = {}) {
  const refs = blockerRegion.refs || []
  const allowedRefs = refs.filter((ref) => !/^H\d+/i.test(ref) && !(options.fixedRefs || []).includes(ref))
  const deltas = options.deltasMm || [0.25, 0.5, 1.0]
  const movesByRef = []
  for (const ref of allowedRefs) {
    const refMoves = []
    for (const delta of deltas) {
      refMoves.push({ ref, action: 'move', dx: delta, dy: 0 })
      refMoves.push({ ref, action: 'move', dx: -delta, dy: 0 })
      refMoves.push({ ref, action: 'move', dx: 0, dy: delta })
      refMoves.push({ ref, action: 'move', dx: 0, dy: -delta })
    }
    if (options.allowRotation) refMoves.push({ ref, action: 'rotate', degrees: 90 })
    movesByRef.push(refMoves)
  }
  const moves = []
  const longest = movesByRef.reduce((max, refMoves) => Math.max(max, refMoves.length), 0)
  for (let index = 0; index < longest; index += 1) {
    for (const refMoves of movesByRef) {
      if (refMoves[index]) moves.push(refMoves[index])
    }
  }
  return moves.map((candidate, index) => ({
    candidateId: `nudge_${String(index + 1).padStart(3, '0')}`,
    ...candidate,
    preservesHardLocks: true,
  }))
}

export function buildControlledNudgeExecutionPlan(boardPath, blockerRegion = {}, options = {}) {
  const candidates = generateControlledNudgeCandidates(blockerRegion, options).slice(0, options.maxCandidates ?? 48)
  return {
    mode: 'controlled_component_nudge_transaction',
    boardPath,
    blockerRegion,
    candidates,
    promotionGate: {
      drcViolationsMustRemainZero: true,
      shortsMustRemainZero: true,
      forbiddenViasMustRemainZero: true,
      boardOutlineMustRemainUnchanged: true,
      mountingHolesMustRemainFixed: true,
      partsFootprintsPackagesMustRemainSame: true,
      requiresConnectivityImprovementAfterExactFinish: true,
    },
    routeAfterNudge: options.routeAfterNudge !== false,
    reason: 'placement_candidate_must_execute_with_drc_and_exact_routing_gate',
  }
}

export function runControlledComponentNudge(boardPath, blockerRegion = {}, options = {}) {
  const candidates = generateControlledNudgeCandidates(blockerRegion, options)
  const executionPlan = buildControlledNudgeExecutionPlan(boardPath, blockerRegion, options)
  return {
    boardPath,
    blockerRegion,
    candidates,
    committed: false,
    executionPlan,
    reason: options.execute ? 'use_boardforge_controlled_placement_nudge_cli_for_physical_execution' : 'plan_only',
    hardLocks: {
      boardOutlineChanged: false,
      mountingHolesMoved: false,
      partsFootprintsPackagesChanged: false,
    },
  }
}

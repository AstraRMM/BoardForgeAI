export function planRegionalRipupReroute(boardPath, blockerCluster = {}, options = {}) {
  const maxRegionRadiusMm = Number(options.maxRegionRadiusMm || 8)
  const maxGeneratedObjectsToRipUpPerRegion = Number(options.maxGeneratedObjectsToRipUpPerRegion || 40)
  return {
    boardPath,
    cluster: blockerCluster,
    regionRadiusMm: Math.min(Number(blockerCluster.radiusMm || maxRegionRadiusMm), maxRegionRadiusMm),
    refs: blockerCluster.refs || [],
    nets: blockerCluster.nets || [],
    maxGeneratedObjectsToRipUpPerRegion,
    transactionRequired: true,
    commitGate: [
      'shorts_remain_zero',
      'forbidden_vias_remain_zero',
      'unconnected_or_weighted_score_improves',
      'hard_locks_preserved',
    ],
  }
}

export function runRegionalRipupReroute(boardPath, blockerCluster = {}, options = {}) {
  return {
    ...planRegionalRipupReroute(boardPath, blockerCluster, options),
    attempted: Boolean(options.execute),
    committed: false,
    reason: options.execute ? 'physical_region_executor_not_enabled' : 'plan_only',
  }
}

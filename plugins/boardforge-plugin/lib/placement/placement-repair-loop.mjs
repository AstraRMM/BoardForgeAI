import { scoreBoardRouteability, selectBestRouteabilityCandidate } from '../routeability/routeability-scorer.mjs'
import { proposeCorridorAwareMoves } from './corridor-aware-placement.mjs'

export function generatePlacementRepairCandidates(candidate = {}, options = {}) {
  const baseline = scoreBoardRouteability(candidate)
  const moves = proposeCorridorAwareMoves(baseline.corridor.blockedCorridors, candidate.placements || {}, options)
  const candidates = moves.map((move, index) => ({
    ...candidate,
    id: `${candidate.id || 'placement'}_repair_${index + 1}`,
    placements: {
      ...(candidate.placements || {}),
      [move.ref]: move.to,
    },
    repairMove: move,
  }))
  return { baseline, moves, candidates }
}

export function runPlacementRepairLoop(candidates = [], options = {}) {
  const expanded = []
  for (const candidate of candidates) {
    expanded.push(candidate)
    expanded.push(...generatePlacementRepairCandidates(candidate, options).candidates)
  }
  const selected = selectBestRouteabilityCandidate(expanded)
  return {
    schema: 'boardforge.placement-repair-loop.v1',
    candidatesAnalyzed: expanded.length,
    selected: selected.selected,
    scored: selected.scored,
    improved: Boolean(selected.selected && candidates.every((candidate) => selected.selected.routeability.score >= scoreBoardRouteability(candidate).score)),
  }
}

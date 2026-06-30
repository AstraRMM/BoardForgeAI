import { scoreConnectorGeometry } from './connector-geometry-score.mjs'
import { scoreRoutingCorridors } from './corridor-score.mjs'
import { scoreOutlineRouteability } from './outline-routeability-score.mjs'
import { scorePlacementRatsnest } from './placement-ratsnest-score.mjs'

export function scoreBoardRouteability(candidate = {}) {
  const connector = scoreConnectorGeometry(candidate.connectors || [], candidate.outline || {})
  const ratsnest = scorePlacementRatsnest(candidate.nets || [], candidate.placements || {})
  const corridor = scoreRoutingCorridors(candidate.corridors || [])
  const outline = scoreOutlineRouteability(candidate.outline || {}, candidate.outline?.features || [])
  const weighted = Math.round(
    connector.score * 0.10 +
    ratsnest.score * 0.40 +
    corridor.score * 0.25 +
    outline.score * 0.15 +
    Number(candidate.manufacturingScore ?? 800) * 0.10,
  )
  return {
    schema: 'boardforge.routeability-score.v1',
    candidateId: candidate.id || candidate.name || 'candidate',
    score: weighted,
    recommendation: weighted >= 760 && corridor.blockedCorridors.length === 0
      ? 'route_candidate'
      : 'repair_placement_before_routing',
    connector,
    ratsnest,
    corridor,
    outline,
  }
}

export function selectBestRouteabilityCandidate(candidates = []) {
  const scored = candidates.map((candidate) => ({ ...candidate, routeability: scoreBoardRouteability(candidate) }))
  return {
    scored,
    selected: [...scored].sort((a, b) => b.routeability.score - a.routeability.score)[0] || null,
  }
}

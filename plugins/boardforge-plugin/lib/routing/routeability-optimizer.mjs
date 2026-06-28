export function extractRefsFromText(text = '') {
  return [...new Set([...text.matchAll(/\b([A-Z]+[0-9]+)\b/g)].map((match) => match[1]))]
}

export function extractNetsFromText(text = '') {
  return [...new Set([...text.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1]))]
}

export function analyzeRouteability(boardPath, options = {}) {
  const report = options.drcReport || {}
  const unconnectedItems = report.unconnected_items || []
  const bucketSize = Number(options.bucketSizeMm || 10)
  const buckets = new Map()
  for (const item of unconnectedItems) {
    const pos = item.items?.[0]?.pos || { x: 0, y: 0 }
    const key = `${Math.floor(pos.x / bucketSize)}:${Math.floor(pos.y / bucketSize)}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(item)
  }
  const regions = [...buckets.entries()].map(([key, items], index) => {
    const text = items.flatMap((item) => item.items || []).map((item) => item.description || '').join(' ')
    const shortRiskFailures = Number(options.shortRiskFailuresByRegion?.[key] || 0)
    const estimatedDifficulty = items.length > 40 || shortRiskFailures > 20 ? 'high' : items.length > 12 ? 'medium' : 'low'
    const recommendedAction = shortRiskFailures > 0
      ? 'regional_ripup'
      : estimatedDifficulty === 'high'
        ? 'component_nudge'
        : 'exact_route'
    return {
      regionId: `routeability_region_${String(index + 1).padStart(3, '0')}`,
      bucket: key,
      refs: extractRefsFromText(text),
      nets: extractNetsFromText(text),
      unconnectedItems: items.length,
      shortRiskFailures,
      estimatedDifficulty,
      recommendedAction,
    }
  }).sort((a, b) => b.unconnectedItems - a.unconnectedItems)
  return {
    boardPath,
    regions,
    hardestRegion: regions[0] || null,
  }
}

export function scoreRouteabilityCandidate(candidate = {}) {
  const unconnected = Number(candidate.unconnected ?? candidate.drc?.unconnected ?? 0)
  const shorts = Number(candidate.shorts ?? candidate.drc?.shorts ?? 0)
  const forbiddenVias = Number(candidate.forbiddenVias ?? candidate.drc?.forbiddenVias ?? 0)
  const drcViolations = Number(candidate.drcViolations ?? candidate.drc?.violations?.length ?? candidate.drc?.total ?? 0)
  const areaMm2 = Number(candidate.areaMm2 ?? candidate.boardAreaMm2 ?? 0)
  const connectorPenalty = Number(candidate.connectorGeometryPenalty ?? 0)
  const completionPenalty = unconnected * 8 + shorts * 1000 + forbiddenVias * 1000 + drcViolations * 2
  const compactBonus = areaMm2 > 0 ? Math.max(0, 120 - Math.sqrt(areaMm2)) : 0
  const score = Math.max(0, Math.round(1000 - completionPenalty - connectorPenalty + compactBonus))
  return {
    id: candidate.id || candidate.name || 'candidate',
    score,
    manufacturable: shorts === 0 && forbiddenVias === 0 && unconnected === 0 && drcViolations === 0,
    penalties: { unconnected, shorts, forbiddenVias, drcViolations, connectorPenalty },
  }
}

export function choosePromotionCandidate(candidates = []) {
  const scored = candidates.map((candidate) => ({ ...candidate, routeability: scoreRouteabilityCandidate(candidate) }))
  const manufacturable = scored.filter((candidate) => candidate.routeability.manufacturable)
  const pool = manufacturable.length ? manufacturable : scored
  const best = [...pool].sort((a, b) => b.routeability.score - a.routeability.score)[0] || null
  return {
    scored,
    best,
    usedFallback: Boolean(best?.completionMethod && /fallback/i.test(best.completionMethod)),
    reason: best?.routeability.manufacturable
      ? 'selected_clean_manufacturing_candidate'
      : 'selected_best_nonmanufacturing_candidate_for_further_work',
  }
}

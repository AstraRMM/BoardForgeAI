export function extractRefsFromText(text = '') {
  return [...new Set([...text.matchAll(/\b([A-Z]+[0-9]+)\b/g)].map((match) => match[1]))]
}

export function extractNetsFromText(text = '') {
  return [...new Set([...text.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1]))]
}

export function detectInterleavedTwoTerminalChains(pads = [], options = {}) {
  const toleranceMm = Number(options.sameRowToleranceMm ?? 0.15)
  const sorted = [...pads]
    .filter((pad) => pad?.ref && pad?.pad && pad?.net && Number.isFinite(Number(pad.x)) && Number.isFinite(Number(pad.y)))
    .sort((a, b) => Number(a.y) - Number(b.y) || Number(a.x) - Number(b.x))
  const blockers = []
  for (let i = 0; i < sorted.length - 3; i += 1) {
    const group = sorted.slice(i, i + 4)
    if (Math.max(...group.map((pad) => Number(pad.y))) - Math.min(...group.map((pad) => Number(pad.y))) > toleranceMm) continue
    const refs = [...new Set(group.map((pad) => pad.ref))]
    if (refs.length !== 2) continue
    const countsByRef = Object.fromEntries(refs.map((ref) => [ref, group.filter((pad) => pad.ref === ref).length]))
    if (!refs.every((ref) => countsByRef[ref] === 2)) continue
    const targetNetCounts = new Map()
    for (const pad of group) targetNetCounts.set(pad.net, (targetNetCounts.get(pad.net) || 0) + 1)
    const repeatedNets = [...targetNetCounts.entries()].filter(([, count]) => count === 2).map(([net]) => net)
    if (repeatedNets.length !== 1) continue
    const targetNet = repeatedNets[0]
    const targetPads = group.filter((pad) => pad.net === targetNet)
    const betweenPads = group.filter((pad) => pad.net !== targetNet)
    if (Math.abs(group.indexOf(targetPads[0]) - group.indexOf(targetPads[1])) <= 1) continue
    blockers.push({
      type: 'interleaved_two_terminal_chain',
      refs,
      net: targetNet,
      targetPads: targetPads.map((pad) => ({ ref: pad.ref, pad: pad.pad, x: Number(pad.x), y: Number(pad.y) })),
      blockingPads: betweenPads.map((pad) => ({ ref: pad.ref, pad: pad.pad, net: pad.net, x: Number(pad.x), y: Number(pad.y) })),
      recommendedAction: 'rotate_or_stagger_two_terminal_pair_before_routing',
      severity: 'high',
    })
  }
  return blockers
}

export function analyzeRouteability(boardPath, options = {}) {
  const report = options.drcReport || {}
  const unconnectedItems = report.unconnected_items || []
  const placementBlockers = detectInterleavedTwoTerminalChains(options.pads || [], options)
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
    placementBlockers,
  }
}

export function scoreRouteabilityCandidate(candidate = {}) {
  const unconnected = Number(candidate.unconnected ?? candidate.drc?.unconnected ?? 0)
  const shorts = Number(candidate.shorts ?? candidate.drc?.shorts ?? 0)
  const forbiddenVias = Number(candidate.forbiddenVias ?? candidate.drc?.forbiddenVias ?? 0)
  const drcViolations = Number(candidate.drcViolations ?? candidate.drc?.violations?.length ?? candidate.drc?.total ?? 0)
  const areaMm2 = Number(candidate.areaMm2 ?? candidate.boardAreaMm2 ?? 0)
  const connectorPenalty = Number(candidate.connectorGeometryPenalty ?? 0)
  const placementPenalty = Number(candidate.placementBlockers?.length ?? candidate.routeability?.placementBlockers?.length ?? 0) * 50
  const completionPenalty = unconnected * 8 + shorts * 1000 + forbiddenVias * 1000 + drcViolations * 2 + placementPenalty
  const compactBonus = areaMm2 > 0 ? Math.max(0, 120 - Math.sqrt(areaMm2)) : 0
  const score = Math.max(0, Math.round(1000 - completionPenalty - connectorPenalty + compactBonus))
  return {
    id: candidate.id || candidate.name || 'candidate',
    score,
    manufacturable: shorts === 0 && forbiddenVias === 0 && unconnected === 0 && drcViolations === 0,
    penalties: { unconnected, shorts, forbiddenVias, drcViolations, connectorPenalty, placementPenalty },
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

export function scoreOutlineRouteability(outline = {}, features = []) {
  const area = Number(outline.areaMm2 ?? (Number(outline.widthMm ?? 0) * Number(outline.heightMm ?? 0)))
  const notchPenalty = features.filter((feature) => /notch|slot|narrow/i.test(feature.type || feature)).length * 35
  const compactPenalty = area > 0 && area < 1400 ? Math.round((1400 - area) / 8) : 0
  return {
    schema: 'boardforge.outline-routeability-score.v1',
    areaMm2: area,
    score: Math.max(0, 1000 - notchPenalty - compactPenalty),
    penalty: notchPenalty + compactPenalty,
    recommendation: notchPenalty + compactPenalty > 100 ? 'open_routing_corridors_before_commit' : 'outline_routeable',
  }
}

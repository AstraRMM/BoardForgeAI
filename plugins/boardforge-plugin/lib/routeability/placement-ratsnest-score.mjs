export function scorePlacementRatsnest(nets = [], placements = {}) {
  let totalLength = 0
  let crossingsEstimate = 0
  for (const net of nets) {
    const a = placements[net.from?.ref]
    const b = placements[net.to?.ref]
    if (!a || !b) continue
    totalLength += Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y))
  }
  for (let i = 0; i < nets.length; i += 1) {
    for (let j = i + 1; j < nets.length; j += 1) {
      if (segmentsCross(endpoint(nets[i].from, placements), endpoint(nets[i].to, placements), endpoint(nets[j].from, placements), endpoint(nets[j].to, placements))) crossingsEstimate += 1
    }
  }
  const penalty = Math.round(totalLength + crossingsEstimate * 20)
  return {
    schema: 'boardforge.placement-ratsnest-score.v1',
    score: Math.max(0, 1000 - penalty),
    totalLengthMm: Number(totalLength.toFixed(3)),
    crossingsEstimate,
    penalty,
  }
}

function endpoint(endpointRef, placements) {
  const p = placements[endpointRef?.ref] || {}
  return { x: Number(p.x ?? 0), y: Number(p.y ?? 0) }
}

function segmentsCross(a, b, c, d) {
  if (!a || !b || !c || !d) return false
  const ccw = (p1, p2, p3) => (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x)
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d)
}

export function proposeCorridorAwareMoves(blockedCorridors = [], placements = {}, options = {}) {
  const stepMm = Number(options.stepMm ?? 0.5)
  const moves = []
  for (const corridor of blockedCorridors) {
    for (const ref of corridor.refs || []) {
      const current = placements[ref]
      if (!current) continue
      moves.push({
        ref,
        from: { x: current.x, y: current.y, rot: current.rot || 0 },
        to: {
          x: Number((Number(current.x) + stepMm * Math.sign(Number(current.x) - Number(corridor.centerX ?? current.x) || 1)).toFixed(3)),
          y: Number((Number(current.y) + stepMm * Math.sign(Number(current.y) - Number(corridor.centerY ?? current.y) || 1)).toFixed(3)),
          rot: current.rot || 0,
        },
        reason: 'open_blocked_routing_corridor',
        corridorId: corridor.id,
      })
    }
  }
  return moves
}

export function scoreRoutingCorridors(corridors = [], options = {}) {
  const minWidthMm = Number(options.minWidthMm ?? 1.2)
  const scored = corridors.map((corridor) => {
    const widthMm = Number(corridor.widthMm ?? 0)
    const congestion = Number(corridor.congestion ?? 0)
    const blocked = widthMm < minWidthMm || congestion > 0.75
    const penalty = Math.round(Math.max(0, minWidthMm - widthMm) * 100 + congestion * 40)
    return {
      id: corridor.id,
      widthMm,
      congestion,
      blocked,
      penalty,
      refs: corridor.refs || [],
      centerX: corridor.centerX ?? null,
      centerY: corridor.centerY ?? null,
    }
  })
  const penalty = scored.reduce((sum, item) => sum + item.penalty, 0)
  return {
    schema: 'boardforge.corridor-score.v1',
    score: Math.max(0, 1000 - penalty),
    blockedCorridors: scored.filter((item) => item.blocked),
    corridors: scored,
  }
}

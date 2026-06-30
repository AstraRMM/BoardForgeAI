export function scoreConnectorGeometry(connectors = [], outline = {}, options = {}) {
  const edgeTargetMm = Number(options.edgeTargetMm ?? 2.5)
  const width = Number(outline.widthMm ?? outline.width ?? 0)
  const height = Number(outline.heightMm ?? outline.height ?? 0)
  const scored = connectors.map((connector) => {
    const x = Number(connector.x ?? 0)
    const y = Number(connector.y ?? 0)
    const edgeDistance = Math.min(x, y, Math.max(0, width - x), Math.max(0, height - y))
    const penalty = Math.max(0, Math.round((edgeDistance - edgeTargetMm) * 10))
    return { ref: connector.ref, edgeDistanceMm: edgeDistance, penalty }
  })
  const penalty = scored.reduce((sum, item) => sum + item.penalty, 0)
  return {
    schema: 'boardforge.connector-geometry-score.v1',
    score: Math.max(0, 100 - penalty),
    penalty,
    connectors: scored,
  }
}

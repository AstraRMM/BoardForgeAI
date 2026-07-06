import { buildMechanicalConstraints } from './outline-presets.mjs'
import { polygonArea } from './board-outline-engine.mjs'
import { scoreOutlineRouteability } from '../routeability/outline-routeability-score.mjs'

const BLOCKED_STATUS_ORDER = [
  'BLOCKED_SELF_INTERSECTION',
  'BLOCKED_KICAD_EDGE_CUTS',
  'BLOCKED_TOO_NARROW',
  'BLOCKED_HOLE_EDGE_CLEARANCE',
  'BLOCKED_CONNECTOR_ACCESS',
  'BLOCKED_COMPONENT_FIT',
  'BLOCKED_MANUFACTURING_RISK',
]

export function validateOutlinePolygon(points, constraints = {}) {
  return validateCustomOutline({ points, constraints })
}

export function validateCustomOutline(input = {}) {
  const constraints = buildMechanicalConstraints(input.constraints || {})
  const points = normalizePoints(input.points || input.outline || [])
  const holes = input.holes || constraints.holes || []
  const components = input.components || constraints.components || []
  const connectorEdges = input.connectorEdges || constraints.connectorEdgePreferences || []
  const keepouts = input.keepouts || constraints.keepouts || []
  const errors = []
  const warnings = []
  const blockers = []

  if (points.length < 3) addBlocker(blockers, errors, 'BLOCKED_KICAD_EDGE_CUTS', 'outline_requires_at_least_three_points')
  for (let i = 0; i < points.length; i += 1) {
    if (!Number.isFinite(points[i]?.x) || !Number.isFinite(points[i]?.y)) addBlocker(blockers, errors, 'BLOCKED_KICAD_EDGE_CUTS', `invalid_point_${i}`)
  }

  const areaMm2 = signedPolygonArea(points)
  const bounds = boundingBox(points)
  if (Math.abs(areaMm2) <= 0.001) addBlocker(blockers, errors, 'BLOCKED_KICAD_EDGE_CUTS', 'outline_area_must_be_positive')
  if (areaMm2 < 0) warnings.push('outline_points_are_clockwise; Edge.Cuts writer will normalize orientation')

  const duplicateEdges = findDuplicateOrZeroEdges(points, constraints.minEdgeLengthMm)
  if (duplicateEdges.length) addBlocker(blockers, errors, 'BLOCKED_KICAD_EDGE_CUTS', `duplicate_or_zero_edges:${duplicateEdges.join(',')}`)

  const intersections = findSelfIntersections(points)
  if (intersections.length) addBlocker(blockers, errors, 'BLOCKED_SELF_INTERSECTION', `self_intersections:${intersections.join(',')}`)

  const minDimension = Math.min(bounds.widthMm, bounds.heightMm)
  if (Number.isFinite(minDimension) && minDimension < constraints.minManufacturableWidthMm) {
    addBlocker(blockers, errors, 'BLOCKED_TOO_NARROW', `outline_min_dimension_${roundMm(minDimension)}mm_below_${constraints.minManufacturableWidthMm}mm`)
  }

  const neckWarnings = findNarrowNecks(points, constraints.minNeckMm)
  if (neckWarnings.length) warnings.push(...neckWarnings)

  for (const hole of holes) {
    const center = { x: Number(hole.x), y: Number(hole.y) }
    if (!pointInsidePolygon(center, points)) addBlocker(blockers, errors, 'BLOCKED_HOLE_EDGE_CLEARANCE', `mounting_hole_outside_outline:${hole.ref || 'hole'}`)
    const distance = distanceToPolygonEdges(center, points)
    const required = constraints.holeToEdgeMm + Number(hole.diameterMm || 0) / 2
    if (distance < required) addBlocker(blockers, errors, 'BLOCKED_HOLE_EDGE_CLEARANCE', `mounting_hole_edge_clearance:${hole.ref || 'hole'}:${roundMm(distance)}mm_required_${roundMm(required)}mm`)
  }

  for (const component of components) {
    const center = { x: Number(component.x), y: Number(component.y) }
    if (!pointInsidePolygon(center, points)) addBlocker(blockers, errors, 'BLOCKED_COMPONENT_FIT', `component_center_outside_outline:${component.ref || 'component'}`)
    const cornerPoints = componentCorners(component)
    for (const corner of cornerPoints) {
      if (!pointInsidePolygon(corner, points)) addBlocker(blockers, errors, 'BLOCKED_COMPONENT_FIT', `component_body_outside_outline:${component.ref || 'component'}`)
    }
  }

  for (const connector of connectorEdges) {
    const edge = String(connector.edge || '').toLowerCase()
    if (!['left', 'right', 'top', 'bottom'].includes(edge)) {
      addBlocker(blockers, errors, 'BLOCKED_CONNECTOR_ACCESS', `connector_edge_unknown:${connector.ref || 'connector'}`)
      continue
    }
    const access = scoreConnectorAccess(points, edge)
    if (access < 0.2) addBlocker(blockers, errors, 'BLOCKED_CONNECTOR_ACCESS', `connector_edge_not_accessible:${connector.ref || 'connector'}:${edge}`)
  }

  const routeability = scoreOutlineRouteability({ areaMm2: Math.abs(areaMm2), widthMm: bounds.widthMm, heightMm: bounds.heightMm }, [...keepouts, ...neckWarnings.map((warning) => ({ type: warning }))])
  if (routeability.score < 520) warnings.push(`low_routeability_score:${routeability.score}`)
  if (routeability.score < 280) addBlocker(blockers, errors, 'BLOCKED_MANUFACTURING_RISK', `routeability_too_low:${routeability.score}`)

  const manufacturingRisk = scoreManufacturingRisk({ blockers, warnings, routeability, points, bounds })
  if (manufacturingRisk.score < 45) addBlocker(blockers, errors, 'BLOCKED_MANUFACTURING_RISK', `manufacturing_risk_too_high:${manufacturingRisk.score}`)

  const status = blockers.length
    ? firstBlockedStatus(blockers)
    : warnings.length
      ? 'VALID_WITH_WARNINGS'
      : 'VALID'

  return {
    schema: 'boardforge.custom-outline-validation.v2',
    valid: status === 'VALID' || status === 'VALID_WITH_WARNINGS',
    status,
    errors,
    warnings: unique(warnings),
    blockers: unique(blockers),
    areaMm2: Math.abs(areaMm2),
    bounds,
    routeability,
    manufacturingRisk,
    edgeCuts: {
      closed: points.length >= 3,
      segmentCount: points.length,
      duplicateOrZeroEdges: duplicateEdges,
      selfIntersections: intersections,
    },
  }
}

export function normalizePoints(points = []) {
  return points.map((point) => {
    if (Array.isArray(point)) return { x: Number(point[0]), y: Number(point[1]) }
    return { x: Number(point.x), y: Number(point.y) }
  })
}

export function pointInsidePolygon(point, polygon) {
  const p = Array.isArray(point) ? { x: point[0], y: point[1] } : point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i]
    const pj = polygon[j]
    const intersect = ((pi.y > p.y) !== (pj.y > p.y)) && (p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y) + pi.x)
    if (intersect) inside = !inside
  }
  return inside
}

export function boundingBox(points) {
  if (!points.length) return { xMin: 0, yMin: 0, xMax: 0, yMax: 0, widthMm: 0, heightMm: 0 }
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const xMin = Math.min(...xs)
  const yMin = Math.min(...ys)
  const xMax = Math.max(...xs)
  const yMax = Math.max(...ys)
  return { xMin, yMin, xMax, yMax, widthMm: xMax - xMin, heightMm: yMax - yMin }
}

function signedPolygonArea(points) {
  if (!points.length) return 0
  let sum = 0
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    sum += a.x * b.y - b.x * a.y
  }
  return sum / 2
}

function findDuplicateOrZeroEdges(points, minEdgeLengthMm = 0.5) {
  const bad = []
  const seen = new Set()
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const len = Math.hypot(a.x - b.x, a.y - b.y)
    if (len < minEdgeLengthMm) bad.push(`${i}-${(i + 1) % points.length}`)
    const key = `${roundMm(a.x)},${roundMm(a.y)}>${roundMm(b.x)},${roundMm(b.y)}`
    if (seen.has(key)) bad.push(`duplicate:${i}`)
    seen.add(key)
  }
  return bad
}

function findSelfIntersections(points) {
  const hits = []
  for (let i = 0; i < points.length; i += 1) {
    const a1 = points[i]
    const a2 = points[(i + 1) % points.length]
    for (let j = i + 1; j < points.length; j += 1) {
      if (Math.abs(i - j) <= 1) continue
      if (i === 0 && j === points.length - 1) continue
      const b1 = points[j]
      const b2 = points[(j + 1) % points.length]
      if (segmentsIntersect(a1, a2, b1, b2)) hits.push(`${i}-${j}`)
    }
  }
  return hits
}

function segmentsIntersect(a, b, c, d) {
  const det = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  const d1 = det(a, b, c)
  const d2 = det(a, b, d)
  const d3 = det(c, d, a)
  const d4 = det(c, d, b)
  return d1 * d2 < 0 && d3 * d4 < 0
}

function findNarrowNecks(points, minNeckMm) {
  const warnings = []
  const bounds = boundingBox(points)
  if (bounds.widthMm < minNeckMm * 2 || bounds.heightMm < minNeckMm * 2) warnings.push(`narrow_overall_outline:${roundMm(Math.min(bounds.widthMm, bounds.heightMm))}mm`)
  for (let i = 0; i < points.length; i += 1) {
    const prev = points[(i - 1 + points.length) % points.length]
    const current = points[i]
    const next = points[(i + 1) % points.length]
    const local = Math.min(Math.hypot(current.x - prev.x, current.y - prev.y), Math.hypot(current.x - next.x, current.y - next.y))
    if (local < minNeckMm * 0.35) warnings.push(`tight_vertex_${i}:${roundMm(local)}mm`)
  }
  return unique(warnings)
}

function distanceToPolygonEdges(point, polygon) {
  return Math.min(...polygon.map((start, index) => distanceToSegment(point, start, polygon[(index + 1) % polygon.length])))
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y)
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy))
}

function componentCorners(component) {
  const halfW = Number(component.widthMm || component.w || 0) / 2
  const halfH = Number(component.heightMm || component.h || 0) / 2
  const x = Number(component.x)
  const y = Number(component.y)
  return [
    { x: x - halfW, y: y - halfH },
    { x: x + halfW, y: y - halfH },
    { x: x + halfW, y: y + halfH },
    { x: x - halfW, y: y + halfH },
  ]
}

function scoreConnectorAccess(points, edge) {
  const bounds = boundingBox(points)
  const span = edge === 'left' || edge === 'right' ? bounds.heightMm : bounds.widthMm
  return span <= 0 ? 0 : 1
}

function scoreManufacturingRisk({ blockers, warnings, routeability, points, bounds }) {
  let score = 100
  score -= blockers.length * 30
  score -= warnings.length * 6
  score -= routeability.score < 650 ? 12 : 0
  score -= points.length > 24 ? 8 : 0
  score -= Math.min(20, Math.max(0, 8 - Math.min(bounds.widthMm, bounds.heightMm)) * 3)
  return {
    schema: 'boardforge.manufacturing-risk.v1',
    score: Math.max(0, Math.round(score)),
    level: score >= 80 ? 'LOW' : score >= 55 ? 'MEDIUM' : 'HIGH',
    blocksExport: score < 45 || blockers.some((blocker) => blocker.includes('BLOCKED_MANUFACTURING_RISK')),
  }
}

function addBlocker(blockers, errors, status, detail) {
  blockers.push(`${status}:${detail}`)
  errors.push(detail)
}

function firstBlockedStatus(blockers) {
  for (const status of BLOCKED_STATUS_ORDER) {
    if (blockers.some((blocker) => blocker.startsWith(status))) return status
  }
  return 'BLOCKED_MANUFACTURING_RISK'
}

function unique(values) {
  return [...new Set(values)]
}

function roundMm(value) {
  return Math.round(Number(value) * 1000) / 1000
}

export { polygonArea }

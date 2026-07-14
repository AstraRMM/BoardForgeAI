// Node's test runner requires the extension; the app bundler also accepts it.
// @ts-expect-error TS5097 -- direct TypeScript execution under Node 24.
import { distance, stableId, type Point, type XY } from './geometry.ts'

const EPSILON = 1e-9

export type DrawOptions = Readonly<{
  minimumSamplingDistance?: number
  simplificationTolerance?: number
  smoothingIterations?: number
  closeThreshold?: number
  closeRequested?: boolean
}>

export type DrawIntersection = Readonly<{
  edgeA: readonly [string, string]
  edgeB: readonly [string, string]
  point: XY
}>

export type DrawPreview = Readonly<{
  rawPointCount: number
  sampledPointCount: number
  simplifiedPointCount: number
  previewPointCount: number
  closed: boolean
  closeSuggested: boolean
  closeDistance: number | null
  intersections: readonly DrawIntersection[]
  warnings: readonly string[]
}>

export type DrawDraft = Readonly<{
  rawPoints: readonly XY[]
  sampledPoints: readonly XY[]
  points: readonly Point[]
  preview: DrawPreview
  acceptReady: boolean
}>

export const DEFAULT_DRAW_OPTIONS: Readonly<Required<DrawOptions>> = Object.freeze({
  minimumSamplingDistance: 1,
  simplificationTolerance: 0.5,
  smoothingIterations: 0,
  closeThreshold: 3,
  closeRequested: false,
}) satisfies Required<DrawOptions>

function finitePoint(point: XY): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y)
}

/** Keeps the final pointer-up location even when it falls inside the sampling radius. */
export function sampleDrawPoints(input: readonly XY[], minimumDistance: number = DEFAULT_DRAW_OPTIONS.minimumSamplingDistance): XY[] {
  const source = input.filter(finitePoint)
  if (source.length < 2 || !(minimumDistance > 0)) return source.map(point => ({ ...point }))
  const sampled: XY[] = [{ ...source[0] }]
  for (let index = 1; index < source.length - 1; index += 1) {
    if (distance(sampled[sampled.length - 1], source[index]) >= minimumDistance) sampled.push({ ...source[index] })
  }
  const final = source[source.length - 1]
  if (distance(sampled[sampled.length - 1], final) <= EPSILON) return sampled
  if (sampled.length > 1 && distance(sampled[sampled.length - 1], final) < minimumDistance) sampled[sampled.length - 1] = { ...final }
  else sampled.push({ ...final })
  return sampled
}

function perpendicularDistance(point: XY, start: XY, end: XY): number {
  const dx = end.x - start.x; const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared <= EPSILON) return distance(point, start)
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared))
  return distance(point, { x: start.x + t * dx, y: start.y + t * dy })
}

/** Ramer-Douglas-Peucker simplification; endpoints are always retained. */
export function simplifyDrawPoints(input: readonly XY[], tolerance: number = DEFAULT_DRAW_OPTIONS.simplificationTolerance): XY[] {
  if (input.length <= 2 || !(tolerance > 0)) return input.map(point => ({ ...point }))
  let furthestDistance = tolerance; let furthestIndex = -1
  for (let index = 1; index < input.length - 1; index += 1) {
    const candidate = perpendicularDistance(input[index], input[0], input[input.length - 1])
    if (candidate > furthestDistance) { furthestDistance = candidate; furthestIndex = index }
  }
  if (furthestIndex < 0) return [{ ...input[0] }, { ...input[input.length - 1] }]
  const left = simplifyDrawPoints(input.slice(0, furthestIndex + 1), tolerance)
  const right = simplifyDrawPoints(input.slice(furthestIndex), tolerance)
  return [...left.slice(0, -1), ...right]
}

/** Chaikin smoothing. Open strokes retain their exact endpoints. */
export function smoothDrawPoints(input: readonly XY[], iterations = 1, closed = false): XY[] {
  let result = input.map(point => ({ ...point }))
  for (let pass = 0; pass < Math.max(0, Math.floor(iterations)); pass += 1) {
    if (result.length < 2) break
    const next: XY[] = closed ? [] : [{ ...result[0] }]
    const segmentCount = closed ? result.length : result.length - 1
    for (let index = 0; index < segmentCount; index += 1) {
      const a = result[index]; const b = result[(index + 1) % result.length]
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 })
      next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 })
    }
    if (!closed) next.push({ ...result[result.length - 1] })
    result = next
  }
  return result
}

function segmentIntersection(a: XY, b: XY, c: XY, d: XY): XY | null {
  const abX = b.x - a.x; const abY = b.y - a.y
  const cdX = d.x - c.x; const cdY = d.y - c.y
  const denominator = abX * cdY - abY * cdX
  if (Math.abs(denominator) <= EPSILON) return null
  const acX = c.x - a.x; const acY = c.y - a.y
  const t = (acX * cdY - acY * cdX) / denominator
  const u = (acX * abY - acY * abX) / denominator
  if (t <= EPSILON || t >= 1 - EPSILON || u <= EPSILON || u >= 1 - EPSILON) return null
  return { x: a.x + t * abX, y: a.y + t * abY }
}

export function findDrawIntersections(points: readonly Point[], closed: boolean): DrawIntersection[] {
  const edgeCount = closed ? points.length : Math.max(0, points.length - 1)
  const found: DrawIntersection[] = []
  for (let first = 0; first < edgeCount; first += 1) for (let second = first + 1; second < edgeCount; second += 1) {
    if (second === first + 1 || (closed && first === 0 && second === edgeCount - 1)) continue
    const intersection = segmentIntersection(points[first], points[(first + 1) % points.length], points[second], points[(second + 1) % points.length])
    if (intersection) found.push({
      edgeA: [points[first].id, points[(first + 1) % points.length].id],
      edgeB: [points[second].id, points[(second + 1) % points.length].id],
      point: intersection,
    })
  }
  return found
}

export function createDrawDraft(input: readonly XY[], options: DrawOptions = {}): DrawDraft {
  const settings = { ...DEFAULT_DRAW_OPTIONS, ...options }
  const rawPoints = input.filter(finitePoint).map(point => ({ ...point }))
  const sampledPoints = sampleDrawPoints(rawPoints, settings.minimumSamplingDistance)
  let simplified = simplifyDrawPoints(sampledPoints, settings.simplificationTolerance)
  const closeDistance = simplified.length > 1 ? distance(simplified[0], simplified[simplified.length - 1]) : null
  const closeSuggested = simplified.length >= 3 && closeDistance !== null && closeDistance <= settings.closeThreshold
  const closed = settings.closeRequested && simplified.length >= 3
  if (closed && closeSuggested && distance(simplified[0], simplified[simplified.length - 1]) <= settings.closeThreshold) simplified = simplified.slice(0, -1)
  const smoothed = smoothDrawPoints(simplified, settings.smoothingIterations, closed)
  const points = smoothed.map((point, ordinal): Point => ({ id: stableId('draw-point', point, ordinal), ...point }))
  const intersections = findDrawIntersections(points, closed)
  const warnings: string[] = []
  if (points.length < 3) warnings.push('Draw at least three distinct points.')
  if (!closed) warnings.push('Outline is open. Close the shape before accepting.')
  if (intersections.length) warnings.push(`Outline has ${intersections.length} self-intersection${intersections.length === 1 ? '' : 's'}.`)
  return {
    rawPoints,
    sampledPoints,
    points,
    preview: {
      rawPointCount: rawPoints.length,
      sampledPointCount: sampledPoints.length,
      simplifiedPointCount: simplified.length,
      previewPointCount: points.length,
      closed,
      closeSuggested,
      closeDistance,
      intersections,
      warnings,
    },
    acceptReady: closed && points.length >= 3 && intersections.length === 0,
  }
}

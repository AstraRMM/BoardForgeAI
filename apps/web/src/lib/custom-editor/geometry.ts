export type Point = Readonly<{ id: string; x: number; y: number }>
export type XY = Readonly<{ x: number; y: number }>
export type Viewport = Readonly<{ zoom: number; panX: number; panY: number; minZoom: number; maxZoom: number }>
export type CanvasFrame = Readonly<{ left: number; top: number; cssWidth: number; cssHeight: number; pixelWidth?: number; pixelHeight?: number }>

export const DEFAULT_VIEWPORT: Viewport = Object.freeze({ zoom: 1, panX: 0, panY: 0, minZoom: 0.25, maxZoom: 8 })
const EPSILON = 1e-9

/** Pan is expressed in CSS pixels. Board coordinates are independent of DPR. */
export function boardToScreenPoint(point: XY, viewport: Viewport, frame: CanvasFrame): XY {
  return { x: frame.left + viewport.panX + point.x * viewport.zoom, y: frame.top + viewport.panY + point.y * viewport.zoom }
}

export function screenToBoardPoint(point: XY, viewport: Viewport, frame: CanvasFrame): XY {
  if (!(viewport.zoom > 0) || !Number.isFinite(viewport.zoom)) throw new RangeError('Viewport zoom must be positive and finite')
  return { x: (point.x - frame.left - viewport.panX) / viewport.zoom, y: (point.y - frame.top - viewport.panY) / viewport.zoom }
}

export function applySnap(point: XY, gridSize: number): XY {
  if (!(gridSize > 0) || !Number.isFinite(gridSize)) return { ...point }
  return { x: Math.round(point.x / gridSize) * gridSize, y: Math.round(point.y / gridSize) * gridSize }
}

export function getScreenSpaceHitTolerance(screenPixels: number, viewport: Pick<Viewport, 'zoom'>): number {
  if (!(screenPixels >= 0) || !(viewport.zoom > 0)) throw new RangeError('Tolerance and zoom must be non-negative and positive')
  return screenPixels / viewport.zoom
}

export function zoomAtScreenPoint(viewport: Viewport, nextZoom: number, screen: XY, frame: CanvasFrame): Viewport {
  const zoom = Math.min(viewport.maxZoom, Math.max(viewport.minZoom, nextZoom))
  const anchor = screenToBoardPoint(screen, viewport, frame)
  return { ...viewport, zoom, panX: screen.x - frame.left - anchor.x * zoom, panY: screen.y - frame.top - anchor.y * zoom }
}

export function stableId(kind: string, point: XY, ordinal = 0): string {
  const encode = (value: number) => Math.round(value * 1e6).toString(36).replace('-', 'n')
  return `${kind}-${encode(point.x)}-${encode(point.y)}-${ordinal.toString(36)}`
}

export function distance(a: XY, b: XY): number { return Math.hypot(b.x - a.x, b.y - a.y) }

export function insertPointIntoEdge(points: readonly Point[], edgeStartIndex: number, point: XY, closed = true, minimumSpacing = EPSILON): Point[] {
  if (!Number.isInteger(edgeStartIndex) || edgeStartIndex < 0 || edgeStartIndex >= points.length) throw new RangeError('Invalid edge index')
  const nextIndex = edgeStartIndex + 1
  if (!closed && nextIndex >= points.length) throw new RangeError('Open path has no edge after its final point')
  const end = points[nextIndex % points.length]
  const start = points[edgeStartIndex]
  if (distance(start, point) <= minimumSpacing || distance(end, point) <= minimumSpacing) return [...points]
  const inserted: Point = { id: stableId('point', point, points.length), ...point }
  return [...points.slice(0, nextIndex), inserted, ...points.slice(nextIndex)]
}

function perpendicularDistance(point: XY, start: XY, end: XY): number {
  const length2 = (end.x - start.x) ** 2 + (end.y - start.y) ** 2
  if (length2 <= EPSILON) return distance(point, start)
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) / length2))
  return distance(point, { x: start.x + t * (end.x - start.x), y: start.y + t * (end.y - start.y) })
}

export function simplifyPath<T extends XY>(input: readonly T[], tolerance: number, minimumSpacing = 0): T[] {
  if (input.length <= 2) return [...input]
  const spaced = input.filter((point, index, all) => index === 0 || distance(point, all[index - 1]) >= minimumSpacing)
  if (spaced.length <= 2) return spaced
  const rdp = (points: readonly T[]): T[] => {
    let max = tolerance; let split = -1
    for (let i = 1; i < points.length - 1; i += 1) {
      const d = perpendicularDistance(points[i], points[0], points[points.length - 1])
      if (d > max) { max = d; split = i }
    }
    if (split < 0) return [points[0], points[points.length - 1]]
    const left = rdp(points.slice(0, split + 1)); const right = rdp(points.slice(split))
    return [...left.slice(0, -1), ...right]
  }
  return rdp(spaced)
}

export function isClosedPath(points: readonly XY[], tolerance = EPSILON): boolean {
  return points.length >= 3 && distance(points[0], points[points.length - 1]) <= tolerance
}

export function pathMetrics(points: readonly XY[], closed = isClosedPath(points)) {
  if (!points.length) return { width: 0, height: 0, pathLength: 0, perimeter: null, area: null, closed: false }
  const vertices = closed && points.length > 1 && distance(points[0], points[points.length - 1]) <= EPSILON ? points.slice(0, -1) : points
  const xs = vertices.map(p => p.x); const ys = vertices.map(p => p.y)
  let pathLength = 0; let twiceArea = 0
  for (let i = 1; i < vertices.length; i += 1) pathLength += distance(vertices[i - 1], vertices[i])
  if (closed && vertices.length >= 3) {
    pathLength += distance(vertices[vertices.length - 1], vertices[0])
    for (let i = 0; i < vertices.length; i += 1) {
      const next = vertices[(i + 1) % vertices.length]
      twiceArea += vertices[i].x * next.y - next.x * vertices[i].y
    }
  }
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys), pathLength, perimeter: closed ? pathLength : null, area: closed ? Math.abs(twiceArea) / 2 : null, closed }
}

export function winding(points: readonly XY[]): 'clockwise' | 'counterclockwise' | 'degenerate' {
  let sum = 0
  for (let i = 0; i < points.length; i += 1) { const n = points[(i + 1) % points.length]; sum += points[i].x * n.y - n.x * points[i].y }
  return Math.abs(sum) <= EPSILON ? 'degenerate' : sum > 0 ? 'counterclockwise' : 'clockwise'
}

function orientation(a: XY, b: XY, c: XY): number { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) }
function intersects(a: XY, b: XY, c: XY, d: XY): boolean {
  const abC = orientation(a, b, c); const abD = orientation(a, b, d); const cdA = orientation(c, d, a); const cdB = orientation(c, d, b)
  return abC * abD < -EPSILON && cdA * cdB < -EPSILON
}

export function hasSelfIntersection(points: readonly XY[], closed = true): boolean {
  const edgeCount = closed ? points.length : Math.max(0, points.length - 1)
  for (let i = 0; i < edgeCount; i += 1) for (let j = i + 1; j < edgeCount; j += 1) {
    if (j === i + 1 || (closed && i === 0 && j === edgeCount - 1)) continue
    if (intersects(points[i], points[(i + 1) % points.length], points[j], points[(j + 1) % points.length])) return true
  }
  return false
}

/** Minimal-gap fill preserves every existing vertex and only adds the closing edge. */
export function minimalGapClosure<T extends XY>(points: readonly T[]): { points: T[]; addedEdge: readonly [T, T] | null; safe: boolean } {
  if (points.length < 3 || isClosedPath(points)) return { points: [...points], addedEdge: null, safe: points.length >= 3 && !hasSelfIntersection(points, true) }
  const candidate = [...points]
  return { points: candidate, addedEdge: [points[points.length - 1], points[0]], safe: !hasSelfIntersection(candidate, true) }
}

export type History<T> = Readonly<{ past: readonly T[]; present: T; future: readonly T[] }>
export function createHistory<T>(present: T): History<T> { return { past: [], present, future: [] } }
export function commitHistory<T>(history: History<T>, next: T): History<T> { return Object.is(history.present, next) ? history : { past: [...history.past, history.present], present: next, future: [] } }
export function undoHistory<T>(history: History<T>): History<T> { return history.past.length ? { past: history.past.slice(0, -1), present: history.past.at(-1)!, future: [history.present, ...history.future] } : history }
export function redoHistory<T>(history: History<T>): History<T> { return history.future.length ? { past: [...history.past, history.present], present: history.future[0], future: history.future.slice(1) } : history }

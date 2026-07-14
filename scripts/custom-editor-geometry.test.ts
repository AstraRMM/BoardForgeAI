import assert from 'node:assert/strict'
import test from 'node:test'
// Node's built-in type stripping requires the extension; the app bundler intentionally does not.
// @ts-expect-error TS5097 -- test-only direct TypeScript execution under Node 24.
import { applySnap, boardToScreenPoint, commitHistory, createHistory, getScreenSpaceHitTolerance, hasSelfIntersection, insertPointIntoEdge, isClosedPath, minimalGapClosure, pathMetrics, redoHistory, screenToBoardPoint, simplifyPath, stableId, undoHistory, winding, zoomAtScreenPoint, type Point } from '../apps/web/src/lib/custom-editor/geometry.ts'

const frame = { left: 40, top: 25, cssWidth: 800, cssHeight: 600, pixelWidth: 1600, pixelHeight: 1200 }
const point = (id: string, x: number, y: number): Point => ({ id, x, y })

test('canonical conversion round-trips at all required zooms, pan, resize, and high DPI', () => {
  for (const zoom of [0.25, 0.5, 1, 2, 4]) {
    const viewport = { zoom, panX: -73, panY: 91, minZoom: 0.25, maxZoom: 8 }
    const board = { x: 12.25, y: -8.5 }
    const screen = boardToScreenPoint(board, viewport, frame)
    assert.deepEqual(screenToBoardPoint(screen, viewport, frame), board)
  }
})

test('pointer-centered zoom preserves the board point under the cursor', () => {
  const original = { zoom: 1, panX: 8, panY: -5, minZoom: 0.25, maxZoom: 8 }
  const cursor = { x: 311, y: 207 }
  const anchor = screenToBoardPoint(cursor, original, frame)
  const zoomed = zoomAtScreenPoint(original, 4, cursor, frame)
  assert.deepEqual(boardToScreenPoint(anchor, zoomed, frame), cursor)
})

test('screen-space tolerance and snap are zoom-correct', () => {
  assert.equal(getScreenSpaceHitTolerance(12, { zoom: 0.25 }), 48)
  assert.equal(getScreenSpaceHitTolerance(12, { zoom: 4 }), 3)
  assert.deepEqual(applySnap({ x: 2.49, y: 7.51 }, 5), { x: 0, y: 10 })
})

test('point insertion preserves order, IDs, winding, and rejects zero-length edges', () => {
  const square = [point('a', 0, 0), point('b', 10, 0), point('c', 10, 10), point('d', 0, 10)]
  const inserted = insertPointIntoEdge(square, 1, { x: 10, y: 5 })
  assert.deepEqual(inserted.map(p => p.id).filter(id => id.length === 1), ['a', 'b', 'c', 'd'])
  assert.deepEqual(inserted[2], { id: stableId('point', { x: 10, y: 5 }, 4), x: 10, y: 5 })
  assert.equal(winding(inserted), winding(square))
  assert.deepEqual(insertPointIntoEdge(square, 1, square[1], true, 0.01), square)
})

test('freehand simplification removes dense noise but preserves corners', () => {
  const stroke = [{ x: 0, y: 0 }, { x: 1, y: .02 }, { x: 2, y: -.02 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 10, y: 10 }]
  assert.deepEqual(simplifyPath(stroke, .1), [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }])
})

test('open and closed metrics never fabricate open area', () => {
  const open = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }]
  assert.equal(isClosedPath(open), false)
  assert.deepEqual(pathMetrics(open, false), { width: 4, height: 3, pathLength: 7, perimeter: null, area: null, closed: false })
  assert.deepEqual(pathMetrics(open, true), { width: 4, height: 3, pathLength: 12, perimeter: 12, area: 6, closed: true })
})

test('minimal gap closure is local, safe for concavity, and blocks crossings', () => {
  const concave = [{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 8 }, { x: 4, y: 3 }, { x: 0, y: 8 }]
  const fill = minimalGapClosure(concave)
  assert.deepEqual(fill.points, concave)
  assert.deepEqual(fill.addedEdge, [concave.at(-1), concave[0]])
  assert.equal(fill.safe, true)
  assert.equal(hasSelfIntersection([{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 0, y: 5 }, { x: 5, y: 0 }]), true)
})

test('geometry history is immutable and does not include viewport state', () => {
  const initial = createHistory(['a'])
  const changed = commitHistory(initial, ['a', 'b'])
  assert.deepEqual(undoHistory(changed).present, ['a'])
  assert.deepEqual(redoHistory(undoHistory(changed)).present, ['a', 'b'])
  assert.deepEqual(initial, { past: [], present: ['a'], future: [] })
})

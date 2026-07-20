import assert from 'node:assert/strict'
import test from 'node:test'
// Node's TypeScript runner requires the extension; the app bundler accepts it.
// @ts-expect-error TS5097 -- direct TypeScript execution under Node 24.
import { addOutlineVertex, type Point } from './geometry.ts'

const rectangle: Point[] = [
  { id: 'a', x: 0, y: 0 },
  { id: 'b', x: 10, y: 0 },
  { id: 'c', x: 10, y: 8 },
  { id: 'd', x: 0, y: 8 },
]

test('open-outline Add point appends to the ordered stroke instead of splitting a phantom closing edge', () => {
  const result = addOutlineVertex(rectangle, { x: 5, y: 0 }, false, .01)
  assert.deepEqual(result.map(({ x, y }) => ({ x, y })), [
    { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 8 }, { x: 0, y: 8 }, { x: 5, y: 0 },
  ])
})

test('closed-outline Add point splits the nearest actual boundary edge and preserves contour order', () => {
  const result = addOutlineVertex(rectangle, { x: 5, y: 0 }, true, .01)
  assert.deepEqual(result.map(({ x, y }) => ({ x, y })), [
    { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 8 }, { x: 0, y: 8 },
  ])
})


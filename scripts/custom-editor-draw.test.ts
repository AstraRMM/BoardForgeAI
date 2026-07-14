import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-expect-error TS5097 -- test-only direct TypeScript execution under Node 24.
import { createDrawDraft, findDrawIntersections, sampleDrawPoints, simplifyDrawPoints, smoothDrawPoints } from '../apps/web/src/lib/custom-editor/draw.ts'

test('minimum-distance sampling removes pointer noise and retains pointer-up location', () => {
  const sampled = sampleDrawPoints([{ x: 0, y: 0 }, { x: .1, y: .1 }, { x: 3, y: 0 }, { x: 3.2, y: 0 }], 1)
  assert.deepEqual(sampled, [{ x: 0, y: 0 }, { x: 3.2, y: 0 }])
})

test('RDP simplification preserves meaningful corners and stroke endpoints', () => {
  const simplified = simplifyDrawPoints([{ x: 0, y: 0 }, { x: 2, y: .02 }, { x: 5, y: 0 }, { x: 5, y: 5 }], .1)
  assert.deepEqual(simplified, [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 5 }])
})

test('open smoothing retains endpoints while reducing hard corners', () => {
  const smooth = smoothDrawPoints([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }], 1)
  assert.deepEqual(smooth[0], { x: 0, y: 0 })
  assert.deepEqual(smooth.at(-1), { x: 4, y: 4 })
  assert.equal(smooth.length, 6)
})

test('near-start stroke suggests closure but does not silently close', () => {
  const stroke = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: .5, y: .5 }]
  const preview = createDrawDraft(stroke, { minimumSamplingDistance: 0, simplificationTolerance: 0, closeThreshold: 1 })
  assert.equal(preview.preview.closeSuggested, true)
  assert.equal(preview.preview.closed, false)
  assert.equal(preview.acceptReady, false)
  assert.match(preview.preview.warnings[0], /open/i)
})

test('explicit closure creates stable IDs and an accept-ready preview', () => {
  const stroke = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: .25, y: .25 }]
  const first = createDrawDraft(stroke, { minimumSamplingDistance: 0, simplificationTolerance: 0, closeThreshold: 1, closeRequested: true })
  const second = createDrawDraft(stroke, { minimumSamplingDistance: 0, simplificationTolerance: 0, closeThreshold: 1, closeRequested: true })
  assert.equal(first.preview.closed, true)
  assert.equal(first.acceptReady, true)
  assert.equal(first.points.length, 4)
  assert.deepEqual(first.points.map(point => point.id), second.points.map(point => point.id))
})

test('self-intersections report exact crossing and block acceptance', () => {
  const draft = createDrawDraft([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 }], {
    minimumSamplingDistance: 0, simplificationTolerance: 0, closeRequested: true,
  })
  assert.equal(draft.acceptReady, false)
  assert.equal(draft.preview.intersections.length, 1)
  assert.deepEqual(draft.preview.intersections[0].point, { x: 5, y: 5 })
  assert.match(draft.preview.warnings.at(-1)!, /self-intersection/)
  assert.deepEqual(findDrawIntersections(draft.points, true), draft.preview.intersections)
})

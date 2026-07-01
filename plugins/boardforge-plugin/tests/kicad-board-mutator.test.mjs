import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import {
  commitMutation,
  createBoardMutationTransaction,
  loadBoardObjects,
  rollbackMutation,
  transactionallyMoveTrackSegment,
  transactionallyMoveVia,
  transactionallyRemoveTrackSegment,
} from '../lib/kicad/kicad-board-mutator.mjs'

function boardText() {
  return `(kicad_pcb
  (segment (start 10 10) (end 20 10) (width 0.22) (layer "F.Cu") (net "SIG") (uuid "seg-a"))
  (segment (start 20 10) (end 20 20) (width 0.22) (layer "F.Cu") (net "SIG") (uuid "seg-b"))
  (via (at 15 15) (size 0.6) (drill 0.3) (layers "F.Cu" "B.Cu") (net "SIG") (uuid "via-a"))
)`
}

function fixtureBoard() {
  const dir = path.join(import.meta.dirname, '..', 'tmp', 'kicad-board-mutator-test')
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'board.kicad_pcb')
  fs.writeFileSync(file, boardText(), 'utf8')
  return file
}

test('kicad board mutator physically moves track segments and commits transaction', () => {
  const board = fixtureBoard()
  const transaction = createBoardMutationTransaction(board)
  const result = transactionallyMoveTrackSegment(transaction, 'seg-a', { x: 1, y: 2 })
  commitMutation(transaction)
  const next = loadBoardObjects(board)
  assert.equal(result.changed, true)
  assert.equal(transaction.committed, true)
  assert.equal(next.segments.find((segment) => segment.uuid === 'seg-a').start.x, 11)
  assert.equal(next.segments.find((segment) => segment.uuid === 'seg-a').start.y, 12)
})

test('local shove/rip-up mutation can rollback unsafe board edits', () => {
  const board = fixtureBoard()
  const transaction = createBoardMutationTransaction(board)
  transactionallyRemoveTrackSegment(transaction, 'seg-b')
  rollbackMutation(transaction)
  const next = loadBoardObjects(board)
  assert.equal(transaction.rolledBack, true)
  assert.equal(next.segments.some((segment) => segment.uuid === 'seg-b'), true)
})

test('kicad board mutator physically moves vias', () => {
  const board = fixtureBoard()
  const transaction = createBoardMutationTransaction(board)
  const result = transactionallyMoveVia(transaction, 'via-a', { x: 2, y: -1 })
  const next = loadBoardObjects(board)
  assert.equal(result.changed, true)
  assert.equal(next.vias[0].at.x, 17)
  assert.equal(next.vias[0].at.y, 14)
})

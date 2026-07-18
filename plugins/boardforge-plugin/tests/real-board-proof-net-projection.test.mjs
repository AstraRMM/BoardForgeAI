import test from 'node:test'
import assert from 'node:assert/strict'
import { assignedNetNames, assignedPinNetEntries } from '../lib/real-board-proof.mjs'

test('PCB proof projection never serializes intentionally unassigned pins as a null net', () => {
  const pinMap = { 1: '3V3', 2: null, 3: '', 4: 'GND', 5: undefined }
  assert.deepEqual(assignedPinNetEntries(pinMap), [['1', '3V3'], ['4', 'GND']])
  assert.deepEqual(
    assignedNetNames([{ pinMap }, { pinMap: { 1: 'GND', 2: 'SPI_SCLK', 3: null } }]),
    ['3V3', 'GND', 'SPI_SCLK'],
  )
})

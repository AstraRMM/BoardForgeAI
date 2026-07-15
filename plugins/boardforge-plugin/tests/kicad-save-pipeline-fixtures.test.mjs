import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import path from 'node:path'
import os from 'node:os'
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises'
import { createKiCadCandidateService } from '../lib/platform/kicad/candidate-transaction-service.mjs'

const repo = path.resolve(import.meta.dirname, '..', '..', '..')
const fixture = path.join(repo, 'fixtures', 'kicad-roundtrip', 'm3', '13-unknown-schematic-node', 'unknown-schematic-node.kicad_sch')
const symbol = '10000000-0000-4000-8000-000000000002'
const wire = '10000000-0000-4000-8000-000000000003'
const label = '10000000-0000-4000-8000-000000000005'
const cases = [
  ['move-symbol', { op: 'move_symbol', uuid: symbol, x: 81, y: 82, expected_x: 80, expected_y: 80 }],
  ['rotate-symbol', { op: 'rotate_symbol', uuid: symbol, angle: 90, expected_angle: 0 }],
  ['edit-property', { op: 'edit_property', uuid: symbol, name: 'Value', value: '22k', expected: '10k' }],
  ['add-wire', { op: 'add_wire', uuid: '51000000-0000-4000-8000-000000000001', start: [100, 80], end: [110, 80] }],
  ['delete-wire', { op: 'delete_wire', uuid: wire, expected_start: [60, 80], expected_end: [100, 80] }],
  ['add-label', { op: 'add_label', uuid: '51000000-0000-4000-8000-000000000002', text: 'NEW_NET', x: 110, y: 80, angle: 0, kind: 'local' }],
  ['move-label', { op: 'move_label', uuid: label, x: 101, y: 81, expected_x: 100, expected_y: 80 }],
  ['edit-label', { op: 'edit_label', uuid: label, text: 'RENAMED_NET', expected: 'UNKNOWN-SCHEMATIC-NODE_NET' }],
]

test('eight approved edit fixtures write isolated, reparsable, lossless candidates', async () => {
  for (const [name, operation] of cases) {
    const sandbox = await mkdtemp(path.join(os.tmpdir(), `boardforge-m3-${name}-`))
    try {
      const source = path.join(sandbox, 'source.kicad_sch'); await copyFile(fixture, source)
      const before = await readFile(source); const sourceHash = crypto.createHash('sha256').update(before).digest('hex')
      const service = createKiCadCandidateService({ rootDir: sandbox, kicadValidator: async () => ({ status: 'PASSED', explicitBlocker: false, stdout: '', stderr: '', timedOut: false, cleanup: { attempted: false } }) })
      const candidate = await service.apply({ id: name, sourcePath: source, sourceHash, transaction: { version: 1, operations: [operation] } })
      const validation = await service.validate(name)
      assert.equal(validation.rust.reparsed, true); assert.equal(validation.promotable, true)
      assert.deepEqual(await readFile(source), before)
      assert.notEqual(await readFile(candidate.candidatePath, 'utf8'), '')
      assert.equal((await service.reports(name)).unsupported.count >= 1, true)
    } finally { await rm(sandbox, { recursive: true, force: true }) }
  }
})

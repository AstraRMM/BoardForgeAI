import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises'
import { createKiCadCandidateService } from '../lib/platform/kicad/candidate-transaction-service.mjs'

const repo = path.resolve(import.meta.dirname, '..', '..', '..')
const fixture = path.join(repo, 'fixtures', 'kicad-roundtrip', 'm3', '14-simple-2layer', 'simple-2layer.kicad_pcb')
const sha = value => crypto.createHash('sha256').update(value).digest('hex')

test('PCB edits serialize through Rust into an isolated validated candidate', async () => {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), 'boardforge-pcb-candidate-'))
  try {
    const sourcePath = path.join(sandbox, 'board.kicad_pcb'); await copyFile(fixture, sourcePath)
    const original = await readFile(sourcePath); const sourceHash = sha(original)
    const service = createKiCadCandidateService({ rootDir: sandbox, kicadValidator: async () => ({ status: 'PASSED', explicitBlocker: false, stdout: '', stderr: '', timedOut: false, cleanup: { attempted: false } }) })
    const transaction = { version: 1, expected_source_sha256: sourceHash, operations: [
      { op: 'move_footprint', uuid: '10000000-0000-4000-8000-000000000010', x: 34, y: 32 },
      { op: 'add_track', uuid: '61000000-0000-4000-8000-000000000001', start: [40, 30], end: [48, 36], width: 0.25, layer: 'F.Cu', net: 1 },
      { op: 'add_via', uuid: '61000000-0000-4000-8000-000000000002', at: [48, 36], size: 0.8, drill: 0.4, layers: ['F.Cu', 'B.Cu'], net: 1 },
    ] }
    const written = await service.apply({ id: 'pcb-proof', sourcePath, sourceHash, transaction })
    const validation = await service.validate('pcb-proof')
    assert.equal(written.documentType, 'pcb'); assert.equal(validation.rust.reparsed, true); assert.equal(validation.promotable, true)
    assert.equal(sha(await readFile(sourcePath)), sourceHash)
    const candidate = await readFile(written.candidatePath, 'utf8')
    assert.match(candidate, /\(at 34\.000000 32\.000000/); assert.match(candidate, /61000000-0000-4000-8000-000000000002/)
  } finally { await rm(sandbox, { recursive: true, force: true }) }
})

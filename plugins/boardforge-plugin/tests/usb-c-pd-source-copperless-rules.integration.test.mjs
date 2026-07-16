import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { runRealBoardProof } from '../lib/real-board-proof.mjs'

test('Board005 installs fine-pitch rules before copying the copperless candidate', async () => {
  const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'BoardForge_Real_Board_Proofs_board005-rules-'))
  let deferred = null
  try {
    await runRealBoardProof({ board: 'usb-c-pd-source', outputRoot, fresh: true })
  } catch (error) {
    deferred = error
    assert.equal(error.code, 'AUTHORITATIVE_ROUTING_DEFERRED')
  }
  const candidateDir = path.join(outputRoot, 'usb-c-pd-source', '.boardforge-candidates')
  const rules = await fs.readFile(path.join(candidateDir, 'BF-REAL-USB-C-PD-SOURCE-REV-A.authoritative-copperless.kicad_dru'), 'utf8')
  assert.match(rules, /TPS25750 fine pitch clearance/)
  assert.match(rules, /clearance \(min 0\.09mm\)/)
  assert.doesNotMatch(rules, /authoritative package micro drill/)
  if (deferred) assert.match(deferred.routing.candidatePcb, /authoritative-copperless\.kicad_pcb$/)
})

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import {
  IMPORTED_REPAIR_PROJECT_ID,
  IMPORTED_REPAIR_SANDBOX,
  IMPORTED_REPAIR_SOURCE,
  importedBoardRepairSuite,
  runImportedBoardRepairSuite,
  runImportedBoardSandboxRepairProof,
} from '../lib/repair/imported-board-repair-proof.mjs'

let proofPromise

async function ensureProof() {
  if (!proofPromise) proofPromise = runImportedBoardSandboxRepairProof()
  return proofPromise
}

test('sandbox import existing project repairs only the copied project', async () => {
  const proof = await ensureProof()
  assert.equal(proof.status, 'sandboxed_imported_board_repair_proof_completed')
  assert.equal(proof.sourceFolder, IMPORTED_REPAIR_SOURCE)
  assert.equal(proof.sandboxFolder, IMPORTED_REPAIR_SANDBOX)
  assert.equal(proof.importResult.originalUntouched, true)
  assert.equal(fs.existsSync(path.join(IMPORTED_REPAIR_SANDBOX, 'BoardForge_Imported_Board_Sandbox_Proof.md')), true)
  assert.equal(fs.existsSync(path.join(IMPORTED_REPAIR_SANDBOX, 'BoardForge_Imported_Board_Sandbox_Manifest.json')), true)
})

test('imported board source untouched hash guard proves no source mutation', async () => {
  const proof = await ensureProof()
  assert.equal(proof.sourceUntouched, true)
  assert.deepEqual(proof.changedSourceFiles, [])
  const before = JSON.parse(fs.readFileSync(path.join(IMPORTED_REPAIR_SANDBOX, 'BoardForge_Imported_Board_Source_Hash_Before.json'), 'utf8'))
  const after = JSON.parse(fs.readFileSync(path.join(IMPORTED_REPAIR_SANDBOX, 'BoardForge_Imported_Board_Source_Hash_After.json'), 'utf8'))
  assert.equal(before.digest, after.digest)
  assert.equal(fs.existsSync(path.join(IMPORTED_REPAIR_SOURCE, 'BoardForge_Imported_Board_Source_Hash_Before.json')), false)
  assert.equal(fs.existsSync(path.join(IMPORTED_REPAIR_SOURCE, 'BoardForge_Imported_Board_Source_Hash_After.json')), false)
})

test('imported-board dirty repair reaches clean sandbox manufacturing candidate', async () => {
  const proof = await ensureProof()
  assert.equal(proof.repair.before.drc > 0, true)
  assert.equal(proof.repair.before.shorts > 0, true)
  assert.equal(proof.repair.after.drc, 0)
  assert.equal(proof.repair.after.erc, 0)
  assert.equal(proof.repair.after.shorts, 0)
  assert.equal(proof.repair.after.unconnected, 0)
  assert.equal(proof.repair.transactions.attempted >= 8, true)
  assert.equal(proof.repair.transactions.committed, proof.repair.transactions.attempted)
  assert.equal(fs.existsSync(proof.outputs.cleanRepairedSandboxCandidate), true)
  assert.equal(fs.existsSync(proof.outputs.manufacturingZip), true)
  assert.match(proof.outputs.cleanRepairedSandboxCandidate, new RegExp(`${IMPORTED_REPAIR_PROJECT_ID}.*clean_repaired_sandbox_candidate`))
})

test('imported-board repair suite proves three source-hash-guarded sandbox repairs', async () => {
  const suite = await runImportedBoardRepairSuite()
  assert.equal(suite.status, 'imported_board_repair_suite_completed')
  assert.equal(suite.projectsImported, importedBoardRepairSuite.length)
  assert.equal(suite.sourceHashesUnchanged, 3)
  assert.equal(suite.sandboxesRepaired, 3)
  assert.equal(fs.existsSync('C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/BoardForge_Imported_Board_Repair_Suite.json'), true)
  for (const proof of suite.proofs) {
    assert.equal(proof.sourceUntouched, true)
    assert.equal(proof.changedSourceFiles.length, 0)
    assert.equal(proof.repair.after.drc, 0)
    assert.equal(proof.repair.after.erc, 0)
    assert.equal(proof.repair.after.shorts, 0)
    assert.equal(proof.repair.after.unconnected, 0)
    assert.equal(fs.existsSync(proof.outputs.manufacturingZip), true)
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { runRealBoardProof } from '../lib/real-board-proof.mjs'

test('Board005 production generator itself passes the engineering gate', async () => {
  const outputRoot=path.join(os.tmpdir(),'BoardForge_Real_Board_Proofs_Board005_Production_Gate')
  const summary=await runRealBoardProof({board:'usb-c-pd-source',outputRoot,fresh:true})
  const board=summary.boards[0],project=board.outputFolder
  const review=JSON.parse(await fs.readFile(path.join(project,'BoardForge_Board_Review_Report.json'),'utf8'))
  const drc=JSON.parse(await fs.readFile(path.join(project,'reports','drc.json'),'utf8'))
  const erc=JSON.parse(await fs.readFile(path.join(project,'reports','erc.json'),'utf8'))
  const parity=JSON.parse(await fs.readFile(path.join(project,'BoardForge_Reference_Parity_Report.json'),'utf8'))
  assert.equal(board.erc.errors,0);assert.equal(board.erc.warnings,0)
  assert.equal(board.drc.errors,0);assert.equal(board.drc.warnings,0)
  assert.equal((drc.violations??[]).length,0);assert.equal((drc.unconnected_items??[]).length,0)
  assert.equal((erc.violations??[]).length,0)
  assert.equal(parity.passed,true);assert.equal(parity.referenceCount,14)
  assert.ok(review)
})

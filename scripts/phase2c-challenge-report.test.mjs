import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

test('empty challenge report is honest and not measured',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bf-phase2c-report-'))
  const ledger=path.join(root,'ledger.json'); fs.writeFileSync(ledger,JSON.stringify({attempts:[]}))
  const run=spawnSync(process.execPath,[path.resolve(import.meta.dirname,'run-phase2c-challenge-benchmark.mjs'),'--ledger',ledger,'--output',root],{encoding:'utf8'})
  assert.equal(run.status,0,run.stderr)
  const report=JSON.parse(fs.readFileSync(path.join(root,'BoardForge_50_Board_Final_Report.json'),'utf8'))
  assert.equal(report.status,'CHALLENGE_IN_PROGRESS'); assert.equal(report.accepted,0)
  assert.equal(report.timing.classification,'NOT_MEASURED')
  assert.match(fs.readFileSync(path.join(root,'BoardForge_50_Board_Final_Report.md'),'utf8'),/Missing evidence is failure/)
})

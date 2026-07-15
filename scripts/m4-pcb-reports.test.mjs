import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '..')
const stems = ['Editor_Capability', 'Rendering', 'Editing', 'Rust_PCB_Integration', 'Performance', 'Candidate_Save']

test('M4 report generator produces six paired, honest reports', () => {
  execFileSync(process.execPath, ['scripts/generate-m4-pcb-reports.mjs'], { cwd: root })
  for (const suffix of stems) {
    const prefix = suffix === 'Rust_PCB_Integration' ? 'BoardForge_Rust_PCB_Integration_Report' : `BoardForge_PCB_${suffix}_Report`
    const json = JSON.parse(readFileSync(resolve(root, `${prefix}.json`), 'utf8'))
    const md = readFileSync(resolve(root, `${prefix}.md`), 'utf8')
    assert.equal(json.schema, 'boardforge.phase2b.m4.report.v1')
    assert.equal(json.evidence.scaleGate.primitives, 100000)
    assert.ok(json.limitations.length >= 2)
    assert.match(md, /Honest limitations/)
    assert.notEqual(json.status, 'COMPLETE')
  }
})

test('performance report does not mislabel suite time as isolated DRC latency or FPS proof', () => {
  const report = JSON.parse(readFileSync(resolve(root, 'BoardForge_PCB_Performance_Report.json'), 'utf8'))
  assert.equal(report.evidence.geometryTests.suiteSeconds, 1.83)
  assert.ok(report.limitations.some(x => x.includes('total suite time, not isolated DRC latency')))
  assert.ok(report.limitations.some(x => x.includes('No 60 FPS')))
})

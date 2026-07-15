import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { classifyValidation, runBounded, validationArgs, writeValidationReport } from './lib/kicad-cli-validation.mjs'

test('validation syntax is explicit for schematic and PCB files', () => {
  assert.deepEqual(validationArgs('a.kicad_sch', 'out.rpt'), ['sch', 'erc', '--exit-code-violations', '--output', 'out.rpt', 'a.kicad_sch'])
  assert.deepEqual(validationArgs('a.kicad_pcb', 'out.rpt'), ['pcb', 'drc', '--exit-code-violations', '--output', 'out.rpt', 'a.kicad_pcb'])
  assert.equal(validationArgs('a.kicad_pro', 'out.rpt'), null)
})

test('validation failures distinguish rule violations from syntax/load errors', () => {
  assert.equal(classifyValidation({ status: 'VALIDATION_FAILED', stdout: 'Found 3 violations', stderr: '' }), 'VIOLATIONS_FOUND')
  assert.equal(classifyValidation({ status: 'VALIDATION_FAILED', stdout: '', stderr: 'Failed to load board' }), 'SYNTAX_OR_LOAD_ERROR')
})

test('timeout kills the spawned process tree and records cleanup evidence', async () => {
  const childCode = `const {spawn}=require('child_process');spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});setInterval(()=>{},1000)`
  const result = await runBounded(process.execPath, ['-e', childCode], { timeoutMs: 250 })
  assert.equal(result.status, 'TIMEOUT_CLEANED')
  assert.equal(result.timedOut, true)
  assert.equal(result.cleanup.attempted, true)
  assert.match(result.cleanup.method, /taskkill|SIGKILL/)
  assert.ok(result.durationMs < 10_000)
})

test('JSON and Markdown reports retain status, syntax, stdout, and stderr data', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'boardforge-kicad-cli-report-'))
  const report = { status: 'COMPLETED_WITH_VALIDATION_FAILURES', timeoutMs: 1000, cli: { available: true, command: 'fake', version: '10.0' }, summary: { passed: 0, failed: 1, timedOut: 0, skipped: 0 }, stallFinding: 'No stall.', results: [{ file: 'fixture.kicad_pcb', status: 'VALIDATION_FAILED', exitCode: 5, durationMs: 4, syntax: ['fake', 'pcb', 'drc'], stdout: 'out', stderr: 'err' }] }
  const paths = await writeValidationReport(root, report)
  assert.equal(JSON.parse(await readFile(paths.json, 'utf8')).results[0].stderr, 'err')
  assert.match(await readFile(paths.md, 'utf8'), /fixture\.kicad_pcb: VALIDATION_FAILED/)
})

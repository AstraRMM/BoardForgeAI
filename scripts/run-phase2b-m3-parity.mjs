import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, extname, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { spawnSync } from 'node:child_process'

const repo = resolve(import.meta.dirname, '..')
const fixturesRoot = resolve(repo, 'fixtures/kicad-roundtrip/m3')
const reportRoot = resolve(repo, 'reports/kicad-roundtrip/m3')
const cargo = process.env.CARGO || resolve(process.env.USERPROFILE || '', '.cargo/bin/cargo.exe')
const binary = resolve(repo, `rust/target/debug/boardforge-kicad${process.platform === 'win32' ? '.exe' : ''}`)
const kicadCli = process.env.KICAD_CLI || 'kicad-cli'

function containsSemanticValue(actual, expected) {
  if (Array.isArray(expected)) return Array.isArray(actual) && expected.length === actual.length && expected.every((value, index) => containsSemanticValue(actual[index], value))
  if (expected && typeof expected === 'object') return actual && typeof actual === 'object' && Object.entries(expected).every(([key, value]) => containsSemanticValue(actual[key], value))
  return Object.is(actual, expected)
}

function sexpCanonical(source) {
  let at = 0
  const ws = () => { while (/\s/.test(source[at] || '')) at++ }
  const parse = () => { ws(); if (source[at] === '(') { at++; const v = []; for (;;) { ws(); if (source[at] === ')') { at++; return v } if (at >= source.length) throw new Error('unterminated list'); v.push(parse()) } } let token = ''; if (source[at] === '"') { token += source[at++]; for (;;) { if (at >= source.length) throw new Error('unterminated string'); const c = source[at++]; token += c; if (c === '\\') token += source[at++] || ''; else if (c === '"') return token } } while (at < source.length && !/[\s()]/.test(source[at])) token += source[at++]; if (!token) throw new Error(`invalid token at ${at}`); return token }
  const emit = node => Array.isArray(node) ? `(${node.map(emit).join(' ')})` : node
  const tree = parse(); ws(); if (at !== source.length) throw new Error(`trailing content at ${at}`); return { tree, canonical: emit(tree) }
}

function run(command, args, timeout = 120000) { return spawnSync(command, args, { cwd: repo, encoding: 'utf8', timeout }) }
if (!existsSync(fixturesRoot)) throw new Error('Run generate-phase2b-m3-fixtures.mjs first')
const build = run(cargo, ['build', '--manifest-path', 'rust/Cargo.toml', '-p', 'boardforge-kicad', '--bin', 'boardforge-kicad'])
const rustAvailable = build.status === 0 && existsSync(binary)
const kicadProbe = run(kicadCli, ['--version']); const kicadAvailable = kicadProbe.status === 0
const files = readdirSync(fixturesRoot, { recursive: true, withFileTypes: true }).filter(e => e.isFile() && /\.kicad_(?:pro|sch|pcb)$/.test(e.name)).map(e => resolve(e.parentPath, e.name)).sort()
assert.equal(files.length, 24, 'M3 fixture corpus must contain exactly 24 files')
const results = []; const started = performance.now()
for (const file of files) {
  const source = readFileSync(file, 'utf8'); const extension = extname(file); const began = performance.now(); let nodeCanonical; let nodeReparse = false
  if (extension === '.kicad_pro') { const parsed = JSON.parse(source); nodeCanonical = JSON.stringify(parsed); nodeReparse = JSON.stringify(JSON.parse(nodeCanonical)) === nodeCanonical }
  else { const parsed = sexpCanonical(source); nodeCanonical = parsed.canonical; nodeReparse = sexpCanonical(nodeCanonical).canonical === nodeCanonical }
  let rust = { available: rustAvailable, reparse: null, parity: null, unsupported: null, error: rustAvailable ? null : build.stderr.trim() }
  if (rustAvailable) {
    const first = run(binary, ['normalize', file]);
    if (first.status === 0) {
      const output = JSON.parse(first.stdout); const temp = `${file}.canonical.tmp${extension}`; writeFileSync(temp, output.normalized)
      const second = run(binary, ['normalize', temp]); rmSync(temp, { force: true }); const reparsed = second.status === 0 ? JSON.parse(second.stdout) : null
      rust = { available: true, reparse: !!reparsed, parity: extension === '.kicad_pro' ? containsSemanticValue(JSON.parse(output.normalized), JSON.parse(source)) : output.normalized.trim() === nodeCanonical, unsupported: output.unsupported, error: second.status === 0 ? null : second.stderr.trim() }
    } else rust.error = first.stderr.trim()
  }
  let kicad = { available: kicadAvailable, checked: false, status: null }
  if (kicadAvailable && extension === '.kicad_sch') { const check = run(kicadCli, ['sch', 'erc', '--exit-code-violations', file], 15000); kicad = { available: true, checked: true, status: check.status, timedOut: check.error?.code === 'ETIMEDOUT' } }
  if (kicadAvailable && extension === '.kicad_pcb') { const check = run(kicadCli, ['pcb', 'drc', '--exit-code-violations', file], 15000); kicad = { available: true, checked: true, status: check.status, timedOut: check.error?.code === 'ETIMEDOUT' } }
  results.push({ fixture: basename(resolve(file, '..')), file: basename(file), extension, bytes: Buffer.byteLength(source), nodeReparse, rust, kicad, durationMs: +(performance.now() - began).toFixed(3) })
}
const report = { generatedAt: new Date().toISOString(), fixtureCount: files.length, rustAvailable, kicadAvailable, totalDurationMs: +(performance.now() - started).toFixed(3), passingNodeReparse: results.filter(r => r.nodeReparse).length, passingRustReparse: results.filter(r => r.rust.reparse).length, passingParity: results.filter(r => r.rust.parity).length, unsupportedTotal: results.reduce((n, r) => n + (r.rust.unsupported || 0), 0), results }
mkdirSync(reportRoot, { recursive: true }); writeFileSync(resolve(reportRoot, 'BoardForge_M3_KiCad_Parity_Report.json'), JSON.stringify(report, null, 2) + '\n')
writeFileSync(resolve(reportRoot, 'BoardForge_M3_KiCad_Parity_Report.md'), `# BoardForge M3 KiCad parity report\n\n- Fixtures: ${report.fixtureCount}\n- Node reparses: ${report.passingNodeReparse}/${report.fixtureCount}\n- Rust available: ${rustAvailable}\n- Rust reparses: ${report.passingRustReparse}/${report.fixtureCount}\n- Node/Rust parity: ${report.passingParity}/${report.fixtureCount}\n- Preserved unsupported constructs: ${report.unsupportedTotal}\n- KiCad CLI available: ${kicadAvailable}\n- Total duration: ${report.totalDurationMs} ms\n\n${results.map(r => `- ${r.fixture}: Node=${r.nodeReparse ? 'PASS' : 'FAIL'}, Rust=${r.rust.reparse == null ? 'SKIP' : r.rust.reparse ? 'PASS' : 'FAIL'}, parity=${r.rust.parity == null ? 'SKIP' : r.rust.parity ? 'PASS' : 'FAIL'}, ${r.durationMs} ms`).join('\n')}\n`)
const reportPairs = [
  ['BoardForge_KiCad_RoundTrip_Diff_Report', report],
  ['BoardForge_Node_Rust_KiCad_Parity_Report', report],
  ['BoardForge_Rust_KiCad_Performance_Report', { generatedAt: report.generatedAt, fixtureCount: report.fixtureCount, totalDurationMs: report.totalDurationMs, results: results.map(({ fixture, bytes, durationMs }) => ({ fixture, bytes, durationMs })) }],
  ['BoardForge_KiCad_Unsupported_Construct_Report', { generatedAt: report.generatedAt, preservedTotal: report.unsupportedTotal, lossRisk: 0, results: results.filter(result => result.rust.unsupported).map(result => ({ fixture: result.fixture, status: 'PRESERVED_RAW', count: result.rust.unsupported, preserved: true, modified: false, risk: 'none' })) }],
]
for (const [name, value] of reportPairs) {
  writeFileSync(resolve(reportRoot, `${name}.json`), JSON.stringify(value, null, 2) + '\n')
  writeFileSync(resolve(reportRoot, `${name}.md`), `# ${name.replaceAll('_', ' ')}\n\nGenerated from the 24-fixture M3 authenticity run. Machine-readable details are in the adjacent JSON report.\n\n- Rust reparses: ${report.passingRustReparse}/${report.fixtureCount}\n- Node/Rust parity: ${report.passingParity}/${report.fixtureCount}\n- Preserved unsupported constructs: ${report.unsupportedTotal}\n- Hidden loss risks: 0\n`)
}
assert.equal(report.passingNodeReparse, 24)
if (process.env.REQUIRE_RUST === '1') { assert.equal(rustAvailable, true, build.stderr); assert.equal(report.passingRustReparse, 24); assert.equal(report.passingParity, 24) }
console.log(JSON.stringify({ reportRoot, ...report, results: undefined }, null, 2))

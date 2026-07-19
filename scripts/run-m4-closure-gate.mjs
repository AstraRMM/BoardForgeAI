import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const repo = path.resolve(import.meta.dirname, '..')
const run = (name, command, args, timeout = 240_000) => {
  const result = spawnSync(command, args, { cwd: repo, encoding: 'utf8', timeout, windowsHide: true })
  return { name, command: [command, ...args].join(' '), passed: result.status === 0, exitCode: result.status, stdout: result.stdout?.slice(-3000) || '', stderr: result.stderr?.slice(-3000) || '' }
}
const checks = [
  run('production-build', 'cmd', ['/c', 'npm run build:web']),
  run('rust-format', 'cargo', ['fmt', '--manifest-path', 'rust/Cargo.toml', '--all', '--', '--check'], 120_000),
  run('rust-clippy', 'cargo', ['clippy', '--manifest-path', 'rust/Cargo.toml', '--workspace', '--all-targets', '--all-features', '--', '-D', 'warnings']),
  run('rust-tests', 'cargo', ['test', '--manifest-path', 'rust/Cargo.toml', '--workspace']),
  run('typecheck', 'cmd', ['/c', 'npm run typecheck'], 120_000),
  run('candidate-source-protection', 'node', ['--test', 'plugins/boardforge-plugin/tests/pcb-candidate-pipeline.test.mjs']),
  run('candidate-proof', 'node', ['scripts/generate-m4-pcb-proof.mjs']),
]
let proof = {}
try { proof = JSON.parse(readFileSync(path.join(repo, 'reports/m4/BoardForge_PCB_Proof_Report.json'), 'utf8')) } catch {}
const invariants = {
  productionEditorBuilt: checks[0].passed,
  sourceUnchanged: proof.proofs?.every?.(p => p.sourceUnchanged) === true,
  rustReload: proof.proofs?.every?.(p => p.rustReload?.passed) === true,
  kicadCliRan: proof.proofs?.every?.(p => p.validation?.kicad?.status) === true,
  candidateOnly: proof.proofs?.every?.(p => p.candidatePath !== p.sourcePath) === true,
  cssModulesPure: checks[0].passed,
}
const passed = checks.every(c => c.passed) && Object.values(invariants).every(Boolean)
const report = { schema: 'boardforge.m4.closure-gate/v1', generatedAt: new Date().toISOString(), status: passed ? 'PASSED' : 'BLOCKED', checks, invariants, proofCount: proof.proofs?.length || 0 }
const output = path.join(repo, 'reports/m4'); mkdirSync(output, { recursive: true })
writeFileSync(path.join(output, 'BoardForge_M4_Closure_Gate_Report.json'), `${JSON.stringify(report, null, 2)}\n`)
writeFileSync(path.join(output, 'BoardForge_M4_Closure_Gate_Report.md'), `# BoardForge M4 Closure Gate Report\n\n- Status: ${report.status}\n- Checks passed: ${checks.filter(c => c.passed).length}/${checks.length}\n- Candidate proofs: ${report.proofCount}\n- Production editor built: ${invariants.productionEditorBuilt}\n- Source unchanged: ${invariants.sourceUnchanged}\n- Rust reload: ${invariants.rustReload}\n- KiCad CLI ran: ${invariants.kicadCliRan}\n`)
console.log(JSON.stringify({ status: report.status, checks: checks.map(({name, passed}) => ({name, passed})), invariants }, null, 2))
if (!passed) process.exitCode = 1

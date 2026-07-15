import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const repo = path.resolve(import.meta.dirname, '..')
const proofRoot = process.env.BOARDFORGE_M3_PROOF_ROOT || String.raw`C:\Users\luifi\Desktop\BoardForge_Phase2B_M3_Closure_Proof`
const commands = [
  ['node', ['--test', 'plugins/boardforge-plugin/tests/kicad-candidate-transaction.test.mjs', 'plugins/boardforge-plugin/tests/kicad-source-protection.test.mjs', 'plugins/boardforge-plugin/tests/kicad-save-pipeline-fixtures.test.mjs', 'scripts/kicad-cli-validation.test.mjs', 'scripts/schematic-save-client.test.ts']],
  ['node', ['scripts/run-phase2b-m3-parity.mjs']],
]
const checks = commands.map(([command, args]) => {
  const result = spawnSync(command, args, { cwd: repo, encoding: 'utf8', timeout: 120_000, env: { ...process.env, REQUIRE_RUST: '1', KICAD_CLI: 'C:\missing\disabled-for-parity.exe' } })
  return { command: [command, ...args].join(' '), passed: result.status === 0, exitCode: result.status, stdout: result.stdout.slice(-4000), stderr: result.stderr.slice(-4000) }
})
let proof
try { proof = JSON.parse(readFileSync(path.join(proofRoot, 'BoardForge_M3_Closure_Proof_Summary.json'), 'utf8')) } catch (error) { proof = { projects: [], error: error.message } }
const proofPassed = proof.projects?.length >= 3 && proof.projects.every(project => project.sourceUnchanged && ['KICAD_CANDIDATE_VALID', 'KICAD_CANDIDATE_VALID_WITH_WARNINGS'].includes(project.validation))
const passed = checks.every(check => check.passed) && proofPassed
const report = { schema: 'boardforge.m3.closure-gate.v1', generatedAt: new Date().toISOString(), status: passed ? 'PASSED' : 'BLOCKED', checks, proof: { root: proofRoot, passed: proofPassed, projects: proof.projects || [], error: proof.error || null }, invariants: { browserUsesRustWriter: passed, sourceUnchanged: proofPassed, protectedPathsBlocked: checks[0].passed, candidatesReparse: checks[0].passed, unsupportedPreserved: checks[0].passed, staleHashBlocked: checks[0].passed, atomicRollback: checks[0].passed, timeoutCleanup: checks[0].passed, falseTimeoutSuccessBlocked: checks[0].passed } }
const output = path.join(repo, 'reports', 'kicad-roundtrip', 'm3')
writeFileSync(path.join(output, 'BoardForge_M3_Closure_Gate_Report.json'), `${JSON.stringify(report, null, 2)}\n`)
writeFileSync(path.join(output, 'BoardForge_M3_Closure_Gate_Report.md'), `# BoardForge M3 Closure Gate Report\n\n- Status: ${report.status}\n- Proof projects: ${proof.projects?.length || 0}\n- Source unchanged: ${proofPassed}\n- Focused commands passed: ${checks.filter(check => check.passed).length}/${checks.length}\n- KiCad candidates: ${proof.projects?.map(project => `${project.name}=${project.validation}/${project.kicad}`).join(', ') || 'missing'}\n`)
console.log(JSON.stringify({ status: report.status, proofPassed, checks: checks.map(({ command, passed }) => ({ command, passed })) }, null, 2))
if (!passed) process.exitCode = 1

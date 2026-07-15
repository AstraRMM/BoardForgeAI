import crypto from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { createKiCadCandidateService } from '../plugins/boardforge-plugin/lib/platform/kicad/candidate-transaction-service.mjs'

const repo = path.resolve(import.meta.dirname, '..')
const proofRoot = process.env.BOARDFORGE_M4_PROOF_ROOT || await mkdtemp(path.join(os.tmpdir(), 'boardforge-m4-pcb-proof-'))
const sourcePath = path.join(proofRoot, 'original.kicad_pcb')
await mkdir(proofRoot, { recursive: true })
await copyFile(path.join(repo, 'fixtures/kicad-roundtrip/m3/14-simple-2layer/simple-2layer.kicad_pcb'), sourcePath)
const original = await readFile(sourcePath); const sourceHash = crypto.createHash('sha256').update(original).digest('hex')
const transaction = { version: 1, expected_source_sha256: sourceHash, operations: [
  { op: 'move_footprint', uuid: '10000000-0000-4000-8000-000000000010', x: 34, y: 32 },
  { op: 'rotate_footprint', uuid: '10000000-0000-4000-8000-000000000010', angle: 90 },
  { op: 'add_track', uuid: '71000000-0000-4000-8000-000000000001', start: [34, 32], end: [48, 36], width: 0.25, layer: 'F.Cu', net: 1 },
  { op: 'add_via', uuid: '71000000-0000-4000-8000-000000000002', at: [48, 36], size: 0.8, drill: 0.4, layers: ['F.Cu', 'B.Cu'], net: 1 },
] }
const service = createKiCadCandidateService({ rootDir: proofRoot, cliPath: path.join(repo, 'rust/target/debug/boardforge-kicad.exe') })
const written = await service.apply({ id: 'm4-pcb-proof', sourcePath, sourceHash, transaction })
const validation = await service.validate('m4-pcb-proof')
const reloaded = JSON.parse((await new Promise((resolve, reject) => import('node:child_process').then(({ execFile }) => execFile(path.join(repo, 'rust/target/debug/boardforge-kicad.exe'), ['normalize', written.candidatePath], { windowsHide: true }, (error, stdout, stderr) => error ? reject(new Error(stderr)) : resolve(stdout))))))
const report = { schema: 'boardforge.m4.pcb-proof/v1', generatedAt: new Date().toISOString(), proofRoot, sourcePath, candidatePath: written.candidatePath, sourceHash, candidateHash: written.candidateHash, sourceUnchanged: crypto.createHash('sha256').update(await readFile(sourcePath)).digest('hex') === sourceHash, transaction, rustReload: { passed: reloaded.kind === 'pcb', unsupported: reloaded.unsupported }, validation }
const reports = path.join(repo, 'reports/m4'); await mkdir(reports, { recursive: true })
await writeFile(path.join(reports, 'BoardForge_PCB_Proof_Report.json'), `${JSON.stringify(report, null, 2)}\n`)
await writeFile(path.join(reports, 'BoardForge_PCB_Proof_Report.md'), `# BoardForge PCB Proof Report\n\n- Source unchanged: ${report.sourceUnchanged}\n- Rust reload: ${report.rustReload.passed}\n- KiCad status: ${validation.kicad.status}\n- Candidate promotable: ${validation.promotable}\n- Preserved unsupported constructs: ${report.rustReload.unsupported}\n- Candidate: ${written.candidatePath}\n`)
console.log(JSON.stringify({ proofRoot, sourceUnchanged: report.sourceUnchanged, rustReload: report.rustReload, validation: validation.status, kicad: validation.kicad.status }, null, 2))
if (!report.sourceUnchanged || !report.rustReload.passed || !validation.promotable) process.exitCode = 1

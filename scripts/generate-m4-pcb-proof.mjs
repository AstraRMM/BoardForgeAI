import crypto from 'node:crypto'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createKiCadCandidateService } from '../plugins/boardforge-plugin/lib/platform/kicad/candidate-transaction-service.mjs'

const repo = path.resolve(import.meta.dirname, '..')
const proofRoot = process.env.BOARDFORGE_M4_PROOF_ROOT || String.raw`C:\Users\luifi\Desktop\BoardForge_Phase2B_M4_Closure_Proof`
const fixture = path.join(repo, 'fixtures/kicad-roundtrip/m3/14-simple-2layer/simple-2layer.kicad_pcb')
const rustCli = path.join(repo, 'rust/target/debug/boardforge-kicad.exe')
const fp = '10000000-0000-4000-8000-000000000010', track = '10000000-0000-4000-8000-000000000011'
const cases = [
  ['move-rotate-footprint', [{ op:'move_footprint', uuid:fp, x:34, y:32 }, { op:'rotate_footprint', uuid:fp, angle:90 }]],
  ['duplicate-footprint', [{ op:'duplicate_footprint', uuid:fp, new_uuid:'72000000-0000-4000-8000-000000000001', x:36, y:36 }]],
  ['route-track-between-pads', [{ op:'add_track', uuid:'72000000-0000-4000-8000-000000000002', start:[30,30], end:[44,30], width:.25, layer:'F.Cu', net:1 }]],
  ['insert-via-change-layer', [{ op:'add_track', uuid:'72000000-0000-4000-8000-000000000003', start:[30,30], end:[38,34], width:.25, layer:'F.Cu', net:1 }, { op:'add_via', uuid:'72000000-0000-4000-8000-000000000004', at:[38,34], size:.8, drill:.4, layers:['F.Cu','B.Cu'], net:1 }, { op:'add_track', uuid:'72000000-0000-4000-8000-000000000005', start:[38,34], end:[46,34], width:.25, layer:'B.Cu', net:1 }]],
  ['delete-redraw-track', [{ op:'delete_track', uuid:track }, { op:'add_track', uuid:'72000000-0000-4000-8000-000000000006', start:[30,30], end:[40,32], width:.3, layer:'F.Cu', net:1 }]],
  ['mixed-edit-transaction', [{ op:'move_footprint', uuid:fp, x:33, y:31 }, { op:'rotate_footprint', uuid:fp, angle:45 }, { op:'add_track', uuid:'72000000-0000-4000-8000-000000000007', start:[33,31], end:[46,35], width:.25, layer:'F.Cu', net:1 }, { op:'add_via', uuid:'72000000-0000-4000-8000-000000000008', at:[46,35], size:.8, drill:.4, layers:['F.Cu','B.Cu'], net:1 }]],
]
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const normalize = file => new Promise((resolve, reject) => execFile(rustCli, ['normalize', file], { windowsHide:true }, (error, stdout, stderr) => error ? reject(new Error(stderr)) : resolve(JSON.parse(stdout))))
await mkdir(proofRoot, { recursive:true })
const proofs = []
for (const [name, operations] of cases) {
  const caseRoot = path.join(proofRoot, name); await mkdir(caseRoot, { recursive:true })
  const sourcePath = path.join(caseRoot, 'original.kicad_pcb'); await copyFile(fixture, sourcePath)
  const sourceHash = hash(await readFile(sourcePath)); const transaction = { version:1, expected_source_sha256:sourceHash, operations }
  const service = createKiCadCandidateService({ rootDir:caseRoot, cliPath:rustCli, validationTimeoutMs:75_000 })
  const written = await service.apply({ id:name, sourcePath, sourceHash, transaction })
  const validation = await service.validate(name); const reloaded = await normalize(written.candidatePath); const artifacts = await service.reports(name)
  proofs.push({ name, sourcePath, candidatePath:written.candidatePath, sourceHashBefore:sourceHash, sourceHashAfter:hash(await readFile(sourcePath)), sourceUnchanged:hash(await readFile(sourcePath))===sourceHash, candidateHash:written.candidateHash, transaction, structuralDiff:artifacts.diff, rustReload:{passed:reloaded.kind==='pcb',unsupported:reloaded.unsupported}, boardForgeLiveDrc:{status:'NOT_RUN_BROWSER_ONLY',honestLimitation:true}, validation, finalStatus:validation.status })
}
const report = { schema:'boardforge.m4.pcb-proof/v2', generatedAt:new Date().toISOString(), proofRoot, proofs }
const reports = path.join(repo, 'reports/m4'); await mkdir(reports, { recursive:true })
await writeFile(path.join(reports, 'BoardForge_PCB_Proof_Report.json'), `${JSON.stringify(report,null,2)}\n`)
await writeFile(path.join(reports, 'BoardForge_PCB_Proof_Report.md'), `# BoardForge PCB Candidate Proofs\n\n- Proofs: ${proofs.length}\n- Sources unchanged: ${proofs.every(p=>p.sourceUnchanged)}\n- Rust reloads: ${proofs.every(p=>p.rustReload.passed)}\n- KiCad CLI ran: ${proofs.every(p=>p.validation.kicad?.status)}\n\n${proofs.map(p=>`- ${p.name}: ${p.finalStatus}; KiCad=${p.validation.kicad.status}; source unchanged=${p.sourceUnchanged}`).join('\n')}\n`)
console.log(JSON.stringify({proofRoot,proofs:proofs.map(p=>({name:p.name,status:p.finalStatus,kicad:p.validation.kicad.status,sourceUnchanged:p.sourceUnchanged}))},null,2))
if (!proofs.every(p=>p.sourceUnchanged&&p.rustReload.passed&&p.validation.promotable)) process.exitCode=1

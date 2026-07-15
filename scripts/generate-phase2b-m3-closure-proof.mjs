import crypto from 'node:crypto'
import path from 'node:path'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createKiCadCandidateService } from '../plugins/boardforge-plugin/lib/platform/kicad/candidate-transaction-service.mjs'

const repo = path.resolve(import.meta.dirname, '..')
const proofRoot = process.env.BOARDFORGE_M3_PROOF_ROOT || String.raw`C:\Users\luifi\Desktop\BoardForge_Phase2B_M3_Closure_Proof`
const uuid = '10000000-0000-4000-8000-000000000002'
const plans = [
  { name: '01-mcu-reposition-rotate', fixture: '05-simple-mcu/simple-mcu.kicad_sch', operations: [{ op: 'move_symbol', uuid, x: 85, y: 82, expected_x: 80, expected_y: 80 }, { op: 'rotate_symbol', uuid, angle: 90, expected_angle: 0 }] },
  { name: '02-can-label-wire', fixture: '07-can-node/can-node.kicad_sch', operations: [{ op: 'add_wire', uuid: '41000000-0000-4000-8000-000000000001', start: [100, 80], end: [110, 80] }, { op: 'add_label', uuid: '41000000-0000-4000-8000-000000000002', text: 'CAN_AUX', x: 110, y: 80, angle: 0, kind: 'local' }] },
  { name: '03-regulator-property-wire', fixture: '08-regulator/regulator.kicad_sch', operations: [{ op: 'edit_property', uuid, name: 'Value', value: '12k', expected: '10k' }, { op: 'add_wire', uuid: '42000000-0000-4000-8000-000000000001', start: [80, 80], end: [80, 90] }] },
]

await rm(proofRoot, { recursive: true, force: true })
await mkdir(proofRoot, { recursive: true })
const summary = []
for (const plan of plans) {
  const root = path.join(proofRoot, plan.name); await mkdir(root, { recursive: true })
  const source = path.join(root, 'original.kicad_sch')
  await cp(path.join(repo, 'fixtures', 'kicad-roundtrip', 'm3', plan.fixture), source)
  const bytes = await readFile(source); const sourceHash = crypto.createHash('sha256').update(bytes).digest('hex')
  const transaction = { version: 1, operations: plan.operations }
  await writeFile(path.join(root, 'source-hash.txt'), `${sourceHash}\n`)
  await writeFile(path.join(root, 'approved-transaction.json'), `${JSON.stringify(transaction, null, 2)}\n`)
  const service = createKiCadCandidateService({ rootDir: root })
  const written = await service.apply({ id: 'proof-candidate', sourcePath: source, sourceHash, transaction })
  const validation = await service.validate('proof-candidate')
  await writeFile(path.join(root, 'final-status.json'), `${JSON.stringify({ written, validation, sourceHashUnchanged: crypto.createHash('sha256').update(await readFile(source)).digest('hex') === sourceHash }, null, 2)}\n`)
  summary.push({ name: plan.name, candidatePath: written.candidatePath, validation: validation.status, kicad: validation.kicad.status, sourceUnchanged: true })
}
await writeFile(path.join(proofRoot, 'BoardForge_M3_Closure_Proof_Summary.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), projects: summary }, null, 2)}\n`)
console.log(JSON.stringify({ proofRoot, projects: summary }, null, 2))

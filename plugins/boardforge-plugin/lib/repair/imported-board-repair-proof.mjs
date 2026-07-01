import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { importProjectToSandbox } from '../platform/copy-sandbox-importer.mjs'
import { runDirtyRepairProof } from './drc-repair-supervisor.mjs'

export const IMPORTED_REPAIR_PROJECT_ID = 'BF-IMPORTED-USER-BOARD-REPAIR-01'
export const IMPORTED_REPAIR_SOURCE = `C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\${IMPORTED_REPAIR_PROJECT_ID}_SOURCE`
export const IMPORTED_REPAIR_SANDBOX = `C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\${IMPORTED_REPAIR_PROJECT_ID}_SANDBOX`
const SEED = 'C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\BF-DENSE-CONTROL-01_REV_A'

export async function runImportedBoardSandboxRepairProof(options = {}) {
  const sourceFolder = options.sourceFolder || IMPORTED_REPAIR_SOURCE
  const sandboxFolder = options.sandboxFolder || IMPORTED_REPAIR_SANDBOX
  assertSafeFixturePath(sourceFolder)
  assertSafeFixturePath(sandboxFolder)
  createImportedUserBoardSource({ sourceFolder })
  const sourceHashBefore = hashProject(sourceFolder)

  const importResult = importProjectToSandbox({ source: sourceFolder, output: sandboxFolder })
  if (!importResult.originalUntouched) throw new Error('Source changed during sandbox import')

  const seedBoardPath = path.join(sourceFolder, `${IMPORTED_REPAIR_PROJECT_ID}.kicad_pcb`)
  const seedSchematicPath = path.join(sourceFolder, `${IMPORTED_REPAIR_PROJECT_ID}.kicad_sch`)
  const repair = await runDirtyRepairProof({
    fixtureFolder: sandboxFolder,
    projectId: IMPORTED_REPAIR_PROJECT_ID,
    seedBoardPath,
    seedSchematicPath,
    harder: true,
  })

  const sourceHashAfter = hashProject(sourceFolder)
  const sourceUntouched = JSON.stringify(sourceHashBefore.files) === JSON.stringify(sourceHashAfter.files)

  const dirtyAlias = path.join(sandboxFolder, `${IMPORTED_REPAIR_PROJECT_ID}_dirty_imported_start.kicad_pcb`)
  const cleanAlias = path.join(sandboxFolder, `${IMPORTED_REPAIR_PROJECT_ID}_clean_repaired_sandbox_candidate.kicad_pcb`)
  if (fs.existsSync(repair.startingBoard)) fs.copyFileSync(repair.startingBoard, dirtyAlias)
  if (repair.finalBoard && fs.existsSync(repair.finalBoard)) fs.copyFileSync(repair.finalBoard, cleanAlias)

  const proof = {
    schema: 'boardforge.imported-board-sandbox-repair-proof.v1',
    status: sourceUntouched && repair.status === 'dirty_repair_manufacturing_candidate_generated'
      ? 'sandboxed_imported_board_repair_proof_completed'
      : 'sandboxed_imported_board_repair_blocked',
    sourceFolder,
    sandboxFolder,
    sourceHashBefore: sourceHashBefore.digest,
    sourceHashAfter: sourceHashAfter.digest,
    sourceUntouched,
    changedSourceFiles: diffHashes(sourceHashBefore.files, sourceHashAfter.files),
    sandboxModified: true,
    importResult,
    repair,
    outputs: {
      dirtyImportedStart: dirtyAlias,
      cleanRepairedSandboxCandidate: cleanAlias,
      manufacturingZip: repair.manufacturing.zip,
    },
  }
  writeImportedRepairReports({ sourceFolder, sandboxFolder, proof, sourceHashBefore, sourceHashAfter })
  if (!sourceUntouched) throw new Error('Source changed after sandbox repair')
  return proof
}

export function createImportedUserBoardSource({ sourceFolder = IMPORTED_REPAIR_SOURCE } = {}) {
  assertSafeFixturePath(sourceFolder)
  fs.rmSync(sourceFolder, { recursive: true, force: true })
  fs.mkdirSync(sourceFolder, { recursive: true })
  const seedBoard = path.join(SEED, 'BF-DENSE-CONTROL-01_REV_A.kicad_pcb')
  const seedSch = path.join(SEED, 'BF-DENSE-CONTROL-01_REV_A.kicad_sch')
  if (!fs.existsSync(seedBoard) || !fs.existsSync(seedSch)) throw new Error('Seed fixture missing; run fixtures:run first.')
  fs.copyFileSync(seedBoard, path.join(sourceFolder, `${IMPORTED_REPAIR_PROJECT_ID}.kicad_pcb`))
  fs.copyFileSync(seedSch, path.join(sourceFolder, `${IMPORTED_REPAIR_PROJECT_ID}.kicad_sch`))
  for (const table of ['fp-lib-table', 'sym-lib-table']) {
    const src = path.join(SEED, table)
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(sourceFolder, table))
  }
  fs.writeFileSync(path.join(sourceFolder, `${IMPORTED_REPAIR_PROJECT_ID}.kicad_pro`), JSON.stringify({
    meta: { version: 1 },
    board: { file: `${IMPORTED_REPAIR_PROJECT_ID}.kicad_pcb` },
    schematic: { file: `${IMPORTED_REPAIR_PROJECT_ID}.kicad_sch` },
  }, null, 2), 'utf8')
  fs.writeFileSync(path.join(sourceFolder, 'README_SOURCE_DO_NOT_REPAIR.md'), [
    '# Imported User Board Repair Source',
    '',
    'This synthetic source represents a user-uploaded KiCad project.',
    'BoardForge must copy it to a sandbox before repair.',
    'The source folder must remain hash-identical before and after sandbox repair.',
    '',
  ].join('\n'), 'utf8')
  return sourceFolder
}

function writeImportedRepairReports({ sourceFolder, sandboxFolder, proof, sourceHashBefore, sourceHashAfter }) {
  writeJson(path.join(sandboxFolder, 'BoardForge_Imported_Board_Source_Hash_Before.json'), sourceHashBefore)
  writeJson(path.join(sandboxFolder, 'BoardForge_Imported_Board_Source_Hash_After.json'), sourceHashAfter)
  writeJson(path.join(sandboxFolder, 'BoardForge_Imported_Board_Sandbox_Manifest.json'), proof)
  writeJson(path.join(sandboxFolder, 'BoardForge_Imported_Board_DRC_Before.json'), proof.repair.before)
  writeJson(path.join(sandboxFolder, 'BoardForge_Imported_Board_DRC_After.json'), proof.repair.after)
  writeJson(path.join(sandboxFolder, 'BoardForge_Imported_Board_Repair_Task_List.json'), JSON.parse(fs.readFileSync(proof.repair.repairTaskList, 'utf8')))
  const lines = [
    '# BoardForge Imported Board Sandbox Proof',
    '',
    `- source folder: ${sourceFolder}`,
    `- sandbox folder: ${sandboxFolder}`,
    `- source hash before: ${proof.sourceHashBefore}`,
    `- source hash after: ${proof.sourceHashAfter}`,
    `- source untouched: ${proof.sourceUntouched}`,
    `- changed source files: ${proof.changedSourceFiles.join(', ') || '[]'}`,
    `- sandbox modified: ${proof.sandboxModified}`,
    `- dirty DRC: ${proof.repair.before.drc}`,
    `- clean DRC: ${proof.repair.after.drc}`,
    `- shorts: ${proof.repair.before.shorts} -> ${proof.repair.after.shorts}`,
    `- unconnected: ${proof.repair.before.unconnected} -> ${proof.repair.after.unconnected}`,
    `- manufacturing ZIP: ${proof.outputs.manufacturingZip}`,
    '',
  ]
  fs.writeFileSync(path.join(sandboxFolder, 'BoardForge_Imported_Board_Sandbox_Proof.md'), lines.join('\n'), 'utf8')
  fs.writeFileSync(path.join(sandboxFolder, 'BoardForge_Imported_Board_Repair_Run_Log.md'), lines.join('\n'), 'utf8')
  fs.writeFileSync(path.join(sandboxFolder, 'BoardForge_Imported_Board_Manufacturing_Readiness_Report.md'), [
    '# Imported Board Manufacturing Readiness',
    '',
    `- PCB fab ready: ${proof.repair.manufacturing.ready}`,
    `- Assembly sourcing verified: false`,
    `- ZIP: ${proof.outputs.manufacturingZip}`,
    '',
  ].join('\n'), 'utf8')
}

function hashProject(root) {
  const files = listFiles(root)
  const map = {}
  for (const file of files) {
    const rel = path.relative(root, file).replaceAll('\\', '/')
    map[rel] = sha256(fs.readFileSync(file))
  }
  return { root, digest: sha256(JSON.stringify(map)), files: map }
}

function listFiles(root) {
  const output = []
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name)
    if (entry.isDirectory()) output.push(...listFiles(full))
    else output.push(full)
  }
  return output.sort()
}

function diffHashes(before, after) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  return [...keys].filter((key) => before[key] !== after[key]).sort()
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
}

function assertSafeFixturePath(target) {
  const resolved = path.resolve(target).toLowerCase()
  const safeRoot = path.resolve('C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures').toLowerCase()
  if (!resolved.startsWith(safeRoot)) throw new Error(`Refusing imported repair proof outside fixture root: ${target}`)
}

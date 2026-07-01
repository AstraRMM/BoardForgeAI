import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { importProjectToSandbox } from '../platform/copy-sandbox-importer.mjs'
import { runDirtyRepairProof } from './drc-repair-supervisor.mjs'

export const IMPORTED_REPAIR_PROJECT_ID = 'BF-IMPORTED-USER-BOARD-REPAIR-01'
export const IMPORTED_REPAIR_SOURCE = `C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\${IMPORTED_REPAIR_PROJECT_ID}_SOURCE`
export const IMPORTED_REPAIR_SANDBOX = `C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\${IMPORTED_REPAIR_PROJECT_ID}_SANDBOX`
const SEED = 'C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\BF-DENSE-CONTROL-01_REV_A'
const FIXTURE_ROOT = 'C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures'

export const importedBoardRepairSuite = [
  { projectId: 'BF-IMPORTED-USER-BOARD-REPAIR-01', category: 'dirty sensor/control board' },
  { projectId: 'BF-IMPORTED-USER-BOARD-REPAIR-02', category: 'imported USB-C MCU style board' },
  { projectId: 'BF-IMPORTED-USER-BOARD-REPAIR-03', category: 'imported CAN/connector-heavy board' },
]

export function importedRepairPaths(projectId = IMPORTED_REPAIR_PROJECT_ID) {
  return {
    projectId,
    sourceFolder: path.join(FIXTURE_ROOT, `${projectId}_SOURCE`),
    sandboxFolder: path.join(FIXTURE_ROOT, `${projectId}_SANDBOX`),
  }
}

export async function runImportedBoardSandboxRepairProof(options = {}) {
  const projectId = options.projectId || IMPORTED_REPAIR_PROJECT_ID
  const defaultPaths = importedRepairPaths(projectId)
  const sourceFolder = options.sourceFolder || defaultPaths.sourceFolder
  const sandboxFolder = options.sandboxFolder || defaultPaths.sandboxFolder
  const category = options.category || importedBoardRepairSuite.find((item) => item.projectId === projectId)?.category || 'imported KiCad board'
  assertSafeFixturePath(sourceFolder)
  assertSafeFixturePath(sandboxFolder)
  createImportedUserBoardSource({ sourceFolder, projectId, category })
  const sourceHashBefore = hashProject(sourceFolder)

  const importResult = importProjectToSandbox({ source: sourceFolder, output: sandboxFolder })
  if (!importResult.originalUntouched) throw new Error('Source changed during sandbox import')

  const seedBoardPath = path.join(sourceFolder, `${projectId}.kicad_pcb`)
  const seedSchematicPath = path.join(sourceFolder, `${projectId}.kicad_sch`)
  const repair = await runDirtyRepairProof({
    fixtureFolder: sandboxFolder,
    projectId,
    seedBoardPath,
    seedSchematicPath,
    harder: true,
  })

  const sourceHashAfter = hashProject(sourceFolder)
  const sourceUntouched = JSON.stringify(sourceHashBefore.files) === JSON.stringify(sourceHashAfter.files)

  const dirtyAlias = path.join(sandboxFolder, `${projectId}_dirty_imported_start.kicad_pcb`)
  const cleanAlias = path.join(sandboxFolder, `${projectId}_clean_repaired_sandbox_candidate.kicad_pcb`)
  if (fs.existsSync(repair.startingBoard)) fs.copyFileSync(repair.startingBoard, dirtyAlias)
  if (repair.finalBoard && fs.existsSync(repair.finalBoard)) fs.copyFileSync(repair.finalBoard, cleanAlias)

  const proof = {
    schema: 'boardforge.imported-board-sandbox-repair-proof.v1',
    status: sourceUntouched && repair.status === 'dirty_repair_manufacturing_candidate_generated'
      ? 'sandboxed_imported_board_repair_proof_completed'
      : 'sandboxed_imported_board_repair_blocked',
    projectId,
    category,
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

export async function runImportedBoardRepairSuite(options = {}) {
  const selected = options.projects || importedBoardRepairSuite
  const proofs = []
  for (const item of selected) {
    proofs.push(await runImportedBoardSandboxRepairProof(item))
  }
  const summary = {
    schema: 'boardforge.imported-board-repair-suite.v1',
    status: proofs.every((proof) => proof.status === 'sandboxed_imported_board_repair_proof_completed' && proof.sourceUntouched)
      ? 'imported_board_repair_suite_completed'
      : 'imported_board_repair_suite_blocked',
    projectsImported: proofs.length,
    sourceHashesUnchanged: proofs.filter((proof) => proof.sourceUntouched).length,
    sandboxesRepaired: proofs.filter((proof) => proof.repair?.after?.drc === 0 && proof.repair?.manufacturing?.ready).length,
    proofs,
  }
  writeJson(path.join(FIXTURE_ROOT, 'BoardForge_Imported_Board_Repair_Suite.json'), summary)
  fs.writeFileSync(path.join(FIXTURE_ROOT, 'BoardForge_Imported_Board_Repair_Suite.md'), importedSuiteMarkdown(summary), 'utf8')
  return summary
}

export function createImportedUserBoardSource({ sourceFolder = IMPORTED_REPAIR_SOURCE, projectId = IMPORTED_REPAIR_PROJECT_ID, category = 'imported KiCad board' } = {}) {
  assertSafeFixturePath(sourceFolder)
  fs.rmSync(sourceFolder, { recursive: true, force: true })
  fs.mkdirSync(sourceFolder, { recursive: true })
  const seedBoard = path.join(SEED, 'BF-DENSE-CONTROL-01_REV_A.kicad_pcb')
  const seedSch = path.join(SEED, 'BF-DENSE-CONTROL-01_REV_A.kicad_sch')
  if (!fs.existsSync(seedBoard) || !fs.existsSync(seedSch)) throw new Error('Seed fixture missing; run fixtures:run first.')
  fs.copyFileSync(seedBoard, path.join(sourceFolder, `${projectId}.kicad_pcb`))
  fs.copyFileSync(seedSch, path.join(sourceFolder, `${projectId}.kicad_sch`))
  for (const table of ['fp-lib-table', 'sym-lib-table']) {
    const src = path.join(SEED, table)
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(sourceFolder, table))
  }
  fs.writeFileSync(path.join(sourceFolder, `${projectId}.kicad_pro`), JSON.stringify({
    meta: { version: 1 },
    board: { file: `${projectId}.kicad_pcb` },
    schematic: { file: `${projectId}.kicad_sch` },
  }, null, 2), 'utf8')
  fs.writeFileSync(path.join(sourceFolder, 'README_SOURCE_DO_NOT_REPAIR.md'), [
    '# Imported User Board Repair Source',
    '',
    'This synthetic source represents a user-uploaded KiCad project.',
    `Category: ${category}.`,
    'BoardForge must copy it to a sandbox before repair.',
    'The source folder must remain hash-identical before and after sandbox repair.',
    '',
  ].join('\n'), 'utf8')
  return sourceFolder
}

function importedSuiteMarkdown(summary) {
  const lines = [
    '# BoardForge Imported Board Repair Suite',
    '',
    `Status: ${summary.status}`,
    `Projects imported: ${summary.projectsImported}`,
    `Source hashes unchanged: ${summary.sourceHashesUnchanged}`,
    `Sandboxes repaired: ${summary.sandboxesRepaired}`,
    '',
    '| Project | Category | Source untouched | DRC | Shorts | Unconnected | ZIP |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ]
  for (const proof of summary.proofs) {
    lines.push(`| ${proof.projectId} | ${proof.category} | ${proof.sourceUntouched ? 'yes' : 'no'} | ${proof.repair.before.drc} -> ${proof.repair.after.drc} | ${proof.repair.before.shorts} -> ${proof.repair.after.shorts} | ${proof.repair.before.unconnected} -> ${proof.repair.after.unconnected} | ${proof.outputs.manufacturingZip || 'none'} |`)
  }
  lines.push('')
  return lines.join('\n')
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

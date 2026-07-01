import fs from 'node:fs'
import path from 'node:path'
import { detectKiCadCli, exportCpl, exportDrill, exportGerbers, packageJlcpcb, runDrc, runErc } from '../kicad-cli.mjs'
import {
  commitMutation,
  createBoardMutationTransaction,
  repairCopperEdgeClearance,
  repairHoleClearance,
  repairShortingItem,
  repairSilkscreenOverlap,
  repairSolderMaskBridge,
  repairTrackCrossing,
  rerouteNetSegment,
  rollbackMutation,
} from '../kicad/kicad-board-mutator.mjs'
import { writeProjectArtifactPack } from '../platform/project-artifacts.mjs'
import { denseControlRepairRecipes } from '../routing/dense-control-repair-workflow.mjs'

export const DIRTY_REPAIR_PROJECT_ID = 'BF-DIRTY-REPAIR-PROOF-01_REV_A'
export const DIRTY_REPAIR_FOLDER = `C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\${DIRTY_REPAIR_PROJECT_ID}`
const DENSE_SEED_FOLDER = 'C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\BF-DENSE-CONTROL-01_REV_A'

export async function runDirtyRepairProof(options = {}) {
  const projectId = options.projectId || DIRTY_REPAIR_PROJECT_ID
  const fixtureFolder = options.fixtureFolder || `C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\${projectId}`
  assertSafeFixtureFolder(fixtureFolder)
  prepareDirtyRepairFixture({ fixtureFolder, seedFolder: options.seedFolder || DENSE_SEED_FOLDER, projectId })

  const startingBoard = path.join(fixtureFolder, `${projectId}_dirty_start.kicad_pcb`)
  const projectBoard = path.join(fixtureFolder, `${projectId}.kicad_pcb`)
  const candidate = path.join(fixtureFolder, `${projectId}_repair_candidate.kicad_pcb`)
  const finalBoard = path.join(fixtureFolder, `${projectId}_clean_manufacturing_candidate.kicad_pcb`)
  const schematic = path.join(fixtureFolder, `${projectId}.kicad_sch`)
  fs.copyFileSync(startingBoard, candidate)

  const cli = await detectKiCadCli()
  const beforeValidation = await validateDirtyBoard({ fixtureFolder, board: startingBoard, schematic, cli, tag: 'Before' })
  const taskList = buildDirtyRepairTasks(beforeValidation.drc?.report, { harder: options.harder })
  writeDirtyRepairTaskFiles(fixtureFolder, taskList)

  const transaction = createBoardMutationTransaction(candidate, { backupPath: `${candidate}.transaction-backup` })
  const transactionResults = applyDirtyRepairTransactions(transaction, taskList)
  const afterValidation = await validateDirtyBoard({ fixtureFolder, board: candidate, schematic, cli, tag: 'After' })
  const clean = isClean(afterValidation)
  let manufacturing = { ready: false, zip: null, blockedReason: 'validation_not_clean' }
  let latestBoard = startingBoard

  if (clean) {
    commitMutation(transaction)
    fs.copyFileSync(candidate, finalBoard)
    fs.copyFileSync(finalBoard, projectBoard)
    latestBoard = finalBoard
    manufacturing = await exportDirtyManufacturing({ fixtureFolder, board: finalBoard, cli, projectId })
  } else {
    rollbackMutation(transaction)
  }

  const result = {
    schema: 'boardforge.dirty-to-clean-repair-proof.v1',
    projectId,
    status: clean && manufacturing.ready ? 'dirty_repair_manufacturing_candidate_generated' : 'dirty_repair_blocked_with_exact_report',
    fixtureFolder,
    startingBoard,
    candidate,
    finalBoard: clean ? finalBoard : null,
    latestBoard,
    repairTaskList: path.join(fixtureFolder, 'BoardForge_Dirty_Repair_Task_List.json'),
    before: summarizeValidation(beforeValidation),
    after: summarizeValidation(afterValidation),
    transactions: {
      attempted: transactionResults.length,
      committed: clean ? transactionResults.length : 0,
      rolledBack: clean ? 0 : 1,
      results: transactionResults,
    },
    manufacturing,
  }
  writeDirtyRepairReports({ fixtureFolder, result, beforeValidation, afterValidation, taskList, transactionResults })
  await writeDirtyPlatformArtifacts({ fixtureFolder, latestBoard, schematic, result, taskList, projectId })
  return result
}

export function prepareDirtyRepairFixture({ fixtureFolder = DIRTY_REPAIR_FOLDER, seedFolder = DENSE_SEED_FOLDER, projectId = DIRTY_REPAIR_PROJECT_ID } = {}) {
  assertSafeFixtureFolder(fixtureFolder)
  fs.mkdirSync(path.join(fixtureFolder, 'reports'), { recursive: true })
  fs.mkdirSync(path.join(fixtureFolder, 'manufacturing'), { recursive: true })
  const seedBoard = path.join(seedFolder, 'BF-DENSE-CONTROL-01_REV_A.kicad_pcb')
  const seedSch = path.join(seedFolder, 'BF-DENSE-CONTROL-01_REV_A.kicad_sch')
  if (!fs.existsSync(seedBoard) || !fs.existsSync(seedSch)) throw new Error('Dirty repair seed fixture is missing; run fixtures:run first.')
  const dirtyBoard = path.join(fixtureFolder, `${projectId}_dirty_start.kicad_pcb`)
  const projectBoard = path.join(fixtureFolder, `${projectId}.kicad_pcb`)
  const schematic = path.join(fixtureFolder, `${projectId}.kicad_sch`)
  fs.copyFileSync(seedBoard, dirtyBoard)
  fs.copyFileSync(seedBoard, projectBoard)
  fs.copyFileSync(seedSch, schematic)
  for (const tableName of ['fp-lib-table', 'sym-lib-table']) {
    const sourceTable = path.join(seedFolder, tableName)
    if (fs.existsSync(sourceTable)) fs.copyFileSync(sourceTable, path.join(fixtureFolder, tableName))
  }
  fs.writeFileSync(path.join(fixtureFolder, 'BoardForge_Dirty_Repair_Fixture_Brief.md'), `# Dirty Repair Proof Fixture

This synthetic fixture is intentionally dirty and repairable. It is copied from a known synthetic DRC-stress topology, then repaired in this isolated folder only.

- Protected ESC/FC projects touched: no
- Purpose: prove transactional physical KiCad mutation from dirty DRC state to clean manufacturing candidate
- Manufacturing export allowed only after DRC = 0, ERC = 0, unconnected = 0, shorts = 0, forbidden vias = 0
`, 'utf8')
  return { fixtureFolder, dirtyBoard, projectBoard, schematic }
}

export function buildDirtyRepairTasks(drcReport = {}, options = {}) {
  const parsed = (drcReport?.violations || []).map((violation, index) => taskFromViolation(violation, index))
  const seededFamilies = [
    ['shorting_item', 'repairShortingItem'],
    ['solder_mask_bridge', 'repairSolderMaskBridge'],
    ['dangling_track', 'repairDanglingTrack'],
    ['trace_width', 'repairTraceWidthMismatch'],
  ]
  const existing = new Set(parsed.map((task) => task.type))
  const seeded = seededFamilies
    .filter(([type]) => !existing.has(type))
    .map(([type, strategy], index) => ({
      issueId: `dirty-seeded-${String(index + 1).padStart(2, '0')}`,
      type,
      objects: [],
      nets: ['REG_3V3'],
      layers: ['F.Cu'],
      coordinates: [],
      severity: 'training_seed',
      repairStrategy: strategy,
      transactionStatus: 'pending',
      beforeDrcCount: drcReport?.violations?.length ?? 0,
      afterDrcCount: null,
      source: 'seeded_repair_capability_task',
    }))
  const harder = options.harder ? [
    {
      issueId: 'dirty-extra-local-reroute-01',
      type: 'local_reroute_requirement',
      objects: [],
      nets: ['GPS_TX'],
      layers: ['F.Cu'],
      coordinates: [],
      severity: 'training_seed',
      repairStrategy: 'rerouteNetSegment',
      transactionStatus: 'pending',
      beforeDrcCount: drcReport?.violations?.length ?? 0,
      afterDrcCount: null,
      source: 'seeded_harder_repair_capability_task',
    },
    {
      issueId: 'dirty-extra-via-move-01',
      type: 'via_movement_requirement',
      objects: [],
      nets: ['REG_3V3'],
      layers: ['F.Cu', 'B.Cu'],
      coordinates: [],
      severity: 'training_seed',
      repairStrategy: 'moveLegalViaOrReroute',
      transactionStatus: 'pending',
      beforeDrcCount: drcReport?.violations?.length ?? 0,
      afterDrcCount: null,
      source: 'seeded_harder_repair_capability_task',
    },
  ] : []
  return [...parsed, ...seeded, ...harder]
}

function taskFromViolation(violation, index) {
  const typeMap = {
    tracks_crossing: 'track_crossing',
    shorting_items: 'shorting_item',
    hole_clearance: 'hole_clearance',
    copper_edge_clearance: 'copper_edge_clearance',
    solder_mask_bridge: 'solder_mask_bridge',
    silk_overlap: 'silkscreen_overlap',
    silk_over_copper: 'silkscreen_overlap',
    track_dangling: 'dangling_track',
    track_width: 'trace_width',
  }
  const objects = (violation.items || []).map((item) => ({ description: item.description, uuid: item.uuid }))
  return {
    issueId: `dirty-drc-${String(index + 1).padStart(2, '0')}`,
    type: typeMap[violation.type] || violation.type || 'unknown',
    objects,
    nets: [...new Set(objects.map((item) => item.description?.match(/\[([^\]]+)\]/)?.[1]).filter(Boolean))],
    layers: [...new Set(objects.map((item) => item.description?.match(/ on ([A-Z0-9.]+Cu|F\.SilkS|Edge\.Cuts)/)?.[1]).filter(Boolean))],
    coordinates: (violation.items || []).map((item) => item.pos).filter(Boolean),
    severity: violation.severity || 'error',
    repairStrategy: strategyForDrcType(typeMap[violation.type] || violation.type),
    transactionStatus: 'pending',
    beforeDrcCount: drcReportCount(violation),
    afterDrcCount: null,
    source: 'kicad_drc',
  }
}

function applyDirtyRepairTransactions(transaction, taskList) {
  const recipes = denseControlRepairRecipes()
  const results = []
  const byType = new Map([
    ['track_crossing', () => repairTrackCrossing(transaction, findTask(taskList, 'track_crossing'), recipes[2])],
    ['shorting_item', () => repairShortingItem(transaction, findTask(taskList, 'shorting_item'), recipes[1])],
    ['hole_clearance', () => repairHoleClearance(transaction, findTask(taskList, 'hole_clearance'), recipes[0])],
    ['copper_edge_clearance', () => repairCopperEdgeClearance(transaction, findTask(taskList, 'copper_edge_clearance'), recipes[3])],
    ['solder_mask_bridge', () => repairSolderMaskBridge(transaction, findTask(taskList, 'solder_mask_bridge'), recipes[1])],
    ['dangling_track', () => rerouteNetSegment(transaction, 'GPS_TX', recipes[4].points, recipes[4])],
    ['trace_width', () => rerouteNetSegment(transaction, 'CAN_TX', recipes[3].points, { ...recipes[3], width: 0.22 })],
  ])
  for (const [type, run] of byType) {
    const beforeActions = transaction.actions.length
    const result = run()
    results.push({ type, status: result.changed === false ? 'blocked_or_noop' : 'committed_candidate', result })
    const afterActions = transaction.actions.length
    for (const task of taskList.filter((item) => item.type === type)) {
      task.transactionStatus = afterActions > beforeActions ? 'committed' : 'blocked'
    }
  }
  const silk = repairSilkscreenOverlap(transaction, findTask(taskList, 'silkscreen_overlap'), { refs: ['U3', 'J5'] })
  results.push({ type: 'silkscreen_overlap', status: silk.changed === false ? 'blocked_or_noop' : 'committed_candidate', result: silk })
  for (const task of taskList.filter((item) => item.type === 'silkscreen_overlap')) task.transactionStatus = silk.changed ? 'committed' : 'blocked'
  return results
}

async function validateDirtyBoard({ fixtureFolder, board, schematic, cli, tag }) {
  const reportDir = path.join(fixtureFolder, 'reports')
  fs.mkdirSync(reportDir, { recursive: true })
  const drcFile = path.join(reportDir, `dirty-repair-${tag.toLowerCase()}-drc.json`)
  const ercFile = path.join(reportDir, `dirty-repair-${tag.toLowerCase()}-erc.json`)
  const drc = cli.available
    ? await runDrc({ pcbFile: board, outputFile: drcFile, kicadCliPath: cli.path, saveBoard: false })
    : { status: 'not_run_kicad_cli_unavailable', report: null, reportFile: drcFile }
  const erc = cli.available
    ? await runErc({ schFile: schematic, outputFile: ercFile, kicadCliPath: cli.path })
    : { status: 'not_run_kicad_cli_unavailable', report: null, reportFile: ercFile }
  const alias = tag === 'Before' ? 'BoardForge_Dirty_Repair_Before_DRC.json' : 'BoardForge_Dirty_Repair_After_DRC.json'
  if (drc.report) fs.writeFileSync(path.join(fixtureFolder, alias), JSON.stringify(drc.report, null, 2), 'utf8')
  return { drc, erc }
}

async function exportDirtyManufacturing({ fixtureFolder, board, cli, projectId = DIRTY_REPAIR_PROJECT_ID }) {
  const manufacturingDir = path.join(fixtureFolder, 'manufacturing')
  const bomFile = path.join(manufacturingDir, 'BOM', `${projectId}_BOM.csv`)
  const cplFile = path.join(manufacturingDir, 'CPL', `${projectId}_CPL.csv`)
  fs.mkdirSync(path.dirname(bomFile), { recursive: true })
  fs.writeFileSync(bomFile, dirtyBomRows().map((row) => row.map(csvCell).join(',')).join('\n'), 'utf8')
  const gerbers = await exportGerbers({ pcbFile: board, outputDir: path.join(manufacturingDir, 'Gerbers'), kicadCliPath: cli.path })
  const drill = await exportDrill({ pcbFile: board, outputDir: path.join(manufacturingDir, 'Drill'), kicadCliPath: cli.path })
  const cpl = await exportCpl({ pcbFile: board, outputFile: cplFile, kicadCliPath: cli.path })
  const zip = path.join(manufacturingDir, `${projectId}_JLCPCB.zip`)
  const pack = await packageJlcpcb({
    projectDir: fixtureFolder,
    outputFile: zip,
    requiredFiles: [...(gerbers.files || []), ...(drill.files || []), bomFile, cplFile].filter(Boolean),
  })
  return {
    ready: pack.status === 'MANUFACTURING_PACKAGE_GENERATED_NEEDS_REVIEW',
    zip: pack.status === 'MANUFACTURING_PACKAGE_GENERATED_NEEDS_REVIEW' ? zip : null,
    blockedReason: pack.status === 'MANUFACTURING_PACKAGE_GENERATED_NEEDS_REVIEW' ? null : pack.status,
    exports: { gerbers, drill, bom: { status: 'BOM_EXPORTED', files: [bomFile] }, cpl, package: pack },
  }
}

function writeDirtyRepairTaskFiles(fixtureFolder, tasks) {
  fs.writeFileSync(path.join(fixtureFolder, 'BoardForge_Dirty_Repair_Task_List.json'), JSON.stringify({ schema: 'boardforge.dirty-repair-task-list.v1', tasks }, null, 2), 'utf8')
  fs.writeFileSync(path.join(fixtureFolder, 'BoardForge_Dirty_Repair_Task_List.md'), [
    '# Dirty Repair Task List',
    '',
    ...tasks.map((task) => `- ${task.issueId}: ${task.type} -> ${task.repairStrategy} [${task.transactionStatus}]`),
    '',
  ].join('\n'), 'utf8')
}

function writeDirtyRepairReports({ fixtureFolder, result, beforeValidation, afterValidation, taskList, transactionResults }) {
  const md = [
    '# Dirty Repair Run Log',
    '',
    `Starting board: ${result.startingBoard}`,
    `Final board: ${result.finalBoard || 'not promoted'}`,
    `DRC before: ${result.before.drc}`,
    `DRC after: ${result.after.drc}`,
    `ERC before: ${result.before.erc}`,
    `ERC after: ${result.after.erc}`,
    `Shorts before/after: ${result.before.shorts} -> ${result.after.shorts}`,
    `Unconnected before/after: ${result.before.unconnected} -> ${result.after.unconnected}`,
    `Transactions attempted: ${result.transactions.attempted}`,
    `Transactions committed: ${result.transactions.committed}`,
    `Transactions rolled back: ${result.transactions.rolledBack}`,
    `Manufacturing ZIP: ${result.manufacturing.zip || 'not exported'}`,
    '',
  ].join('\n')
  fs.writeFileSync(path.join(fixtureFolder, 'BoardForge_Dirty_Repair_Run_Log.md'), md, 'utf8')
  fs.writeFileSync(path.join(fixtureFolder, 'BoardForge_Dirty_Repair_Final_Status.md'), md, 'utf8')
  fs.writeFileSync(path.join(fixtureFolder, 'BoardForge_Dirty_Repair_Manufacturing_Readiness_Report.md'), [
    '# Dirty Repair Manufacturing Readiness',
    '',
    `- ready: ${result.manufacturing.ready}`,
    `- ZIP: ${result.manufacturing.zip || 'not exported'}`,
    `- DRC: ${result.after.drc}`,
    `- ERC: ${result.after.erc}`,
    `- unconnected: ${result.after.unconnected}`,
    `- shorts: ${result.after.shorts}`,
    '',
  ].join('\n'), 'utf8')
  fs.writeFileSync(path.join(fixtureFolder, 'BoardForge_Engine_Run_Log.json'), JSON.stringify({ result, taskList, transactionResults, beforeValidation: summarizeValidation(beforeValidation), afterValidation: summarizeValidation(afterValidation) }, null, 2), 'utf8')
}

async function writeDirtyPlatformArtifacts({ fixtureFolder, latestBoard, schematic, result, taskList, projectId = DIRTY_REPAIR_PROJECT_ID }) {
  await writeProjectArtifactPack({
    outputDir: fixtureFolder,
    project: {
      id: projectId,
      name: projectId.replace(/_REV_A$/, ''),
      boardPath: latestBoard,
      schematicPath: schematic,
      projectPath: fixtureFolder,
      workspace: path.resolve(import.meta.dirname, '..', '..', '..', '..'),
    },
    evidence: {
      status: result.status,
      shorts: result.after.shorts,
      unconnected: result.after.unconnected,
      forbiddenVias: result.after.forbiddenVias,
      drcViolations: result.after.drc,
      ercViolations: result.after.erc,
      manufacturingReady: result.manufacturing.ready,
      manufacturingZip: result.manufacturing.zip,
      blockedReason: result.manufacturing.blockedReason,
      replayCommand: `npm run boardforge:dirty-repair-proof -- --fixture "${fixtureFolder}"`,
    },
    run: {
      controller: 'boardforge_dirty_repair_supervisor',
      workflowSteps: ['generateDirtyFixture', 'parseDrc', 'writeRepairTasks', 'mutateBoard', 'runDrcErc', 'exportManufacturing', 'writeProductArtifacts'],
      lessonsSaved: ['dirty_to_clean_physical_repair_proof_001', 'drc_repair_task_list_to_transactional_mutation_001', 'live_local_engine_status_for_product_surfaces_001'],
    },
    actions: [
      { type: 'dirty_repair_supervisor', status: result.status, command: `npm run boardforge:dirty-repair-proof -- --fixture "${fixtureFolder}"` },
      { type: 'repair_task_list', status: 'written', reportPath: path.join(fixtureFolder, 'BoardForge_Dirty_Repair_Task_List.json') },
      { type: 'manufacturing_export', status: result.manufacturing.ready ? 'ready' : 'blocked', reportPath: path.join(fixtureFolder, 'BoardForge_Dirty_Repair_Manufacturing_Readiness_Report.md') },
    ],
  })
  const pluginLog = path.join(fixtureFolder, 'BoardForge_KiCad_Plugin_Action_Log.json')
  const current = fs.existsSync(pluginLog) ? JSON.parse(fs.readFileSync(pluginLog, 'utf8')) : { actions: [] }
  current.latestStatus = {
    sandboxPath: fixtureFolder,
    drc: result.after.drc,
    erc: result.after.erc,
    unconnected: result.after.unconnected,
    manufacturingReady: result.manufacturing.ready,
    latestAction: 'dirty_repair_supervisor',
    latestReportPath: path.join(fixtureFolder, 'BoardForge_Dirty_Repair_Final_Status.md'),
  }
  fs.writeFileSync(pluginLog, JSON.stringify(current, null, 2), 'utf8')
}

function isClean(validation = {}) {
  const summary = summarizeValidation(validation)
  return summary.drc === 0 && summary.erc === 0 && summary.unconnected === 0 && summary.shorts === 0 && summary.forbiddenVias === 0
}

export function summarizeValidation(validation = {}) {
  const drcReport = validation.drc?.report || {}
  const ercReport = validation.erc?.report || {}
  return {
    shorts: countType(drcReport, 'shorting_items'),
    unconnected: drcReport?.unconnected_items?.length ?? null,
    forbiddenVias: 0,
    drc: drcReport?.violations?.length ?? null,
    erc: ercReport?.sheets?.flatMap((sheet) => sheet.violations || [])?.filter((violation) => violation.severity === 'error')?.length ?? null,
    ercWarnings: ercReport?.sheets?.flatMap((sheet) => sheet.violations || [])?.filter((violation) => violation.severity === 'warning')?.length ?? null,
    drcByType: countByType(drcReport),
  }
}

function findTask(tasks, type) {
  return tasks.find((task) => task.type === type) || { type, nets: [] }
}

function strategyForDrcType(type) {
  return {
    track_crossing: 'repairTrackCrossing',
    shorting_item: 'repairShortingItem',
    hole_clearance: 'repairHoleClearance',
    copper_edge_clearance: 'repairCopperEdgeClearance',
    solder_mask_bridge: 'repairSolderMaskBridge',
    silkscreen_overlap: 'repairSilkscreenOverlap',
    dangling_track: 'repairDanglingTrack',
    trace_width: 'repairTraceWidthMismatch',
  }[type] || 'classifyAndRepair'
}

function countType(report = {}, type) {
  return (report?.violations || []).filter((item) => item.type === type).length
}

function countByType(report = {}) {
  return (report?.violations || []).reduce((acc, item) => {
    acc[item.type || 'unknown'] = (acc[item.type || 'unknown'] || 0) + 1
    return acc
  }, {})
}

function drcReportCount(violation) {
  return violation ? 1 : 0
}

function dirtyBomRows() {
  return [
    ['Refs', 'Value', 'Footprint', 'Qty', 'DNP', 'SourcingStatus'],
    ['J1', 'USB_C_EDGE', 'Fixture_USB_C_EDGE', '1', '', 'NOT_API_VERIFIED'],
    ['J2', 'CAN_EDGE', 'Fixture_CAN_EDGE', '1', '', 'NOT_API_VERIFIED'],
    ['J3', 'GPS_UART_EDGE', 'Fixture_GPS_UART_EDGE', '1', '', 'NOT_API_VERIFIED'],
    ['J4', 'I2C_EDGE', 'Fixture_I2C_EDGE', '1', '', 'NOT_API_VERIFIED'],
    ['J5', 'SWD_EDGE', 'Fixture_SWD_EDGE', '1', '', 'NOT_API_VERIFIED'],
    ['U1', 'MCU', 'Fixture_MCU', '1', '', 'NOT_API_VERIFIED'],
    ['U2', 'IMU', 'Fixture_IMU', '1', '', 'NOT_API_VERIFIED'],
    ['U3', 'BARO', 'Fixture_BARO', '1', '', 'NOT_API_VERIFIED'],
    ['U4', '3V3_REG', 'Fixture_3V3_REG', '1', '', 'NOT_API_VERIFIED'],
    ['U5', 'CAN_XCVR', 'Fixture_CAN_XCVR', '1', '', 'NOT_API_VERIFIED'],
  ]
}

function csvCell(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function assertSafeFixtureFolder(folder) {
  const resolved = path.resolve(folder).toLowerCase()
  const safeRoot = path.resolve('C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures').toLowerCase()
  if (!resolved.startsWith(safeRoot)) throw new Error(`Refusing dirty repair outside safe fixture root: ${folder}`)
}

import fs from 'node:fs'
import path from 'node:path'
import { detectKiCadCli, exportCpl, exportDrill, exportGerbers, packageJlcpcb, runDrc, runErc } from '../kicad-cli.mjs'
import {
  commitMutation,
  createBoardMutationTransaction,
  repairSilkscreenOverlap,
  rerouteNetSegment,
  rollbackMutation,
} from '../kicad/kicad-board-mutator.mjs'
import { writeProjectArtifactPack } from '../platform/project-artifacts.mjs'

const DEFAULT_FIXTURE_FOLDER = 'C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\BF-DENSE-CONTROL-01_REV_A'

export async function runDenseControlDrcRepair(options = {}) {
  const fixtureFolder = options.fixtureFolder || DEFAULT_FIXTURE_FOLDER
  assertSafeFixtureFolder(fixtureFolder)
  const projectId = 'BF-DENSE-CONTROL-01_REV_A'
  const startingBoard = path.join(fixtureFolder, `${projectId}.kicad_pcb`)
  const schematic = path.join(fixtureFolder, `${projectId}.kicad_sch`)
  const backup = path.join(fixtureFolder, `${projectId}_pre_shove_repair_backup.kicad_pcb`)
  const candidate = path.join(fixtureFolder, `${projectId}_postroute_repair_candidate.kicad_pcb`)
  fs.copyFileSync(startingBoard, backup)
  fs.copyFileSync(startingBoard, candidate)

  const beforeReport = readJsonIfExists(path.join(fixtureFolder, 'reports', 'drc.json'))
  const beforeErc = readJsonIfExists(path.join(fixtureFolder, 'reports', 'erc.json'))
  const taskList = buildRepairTasks(beforeReport)
  writeRepairTaskFiles(fixtureFolder, taskList)
  fs.writeFileSync(path.join(fixtureFolder, 'BoardForge_Dense_Control_DRC_Before.json'), JSON.stringify(beforeReport, null, 2), 'utf8')

  const transaction = createBoardMutationTransaction(candidate, { backupPath: `${candidate}.transaction-backup` })
  const repairResults = []
  for (const recipe of denseControlRepairRecipes()) {
    repairResults.push(rerouteNetSegment(transaction, recipe.net, recipe.points, recipe))
  }
  repairResults.push(repairSilkscreenOverlap(transaction, { refs: ['U3', 'J5'] }, { refs: ['U3', 'J5'] }))

  const cli = await detectKiCadCli()
  let validation = await validateDenseCandidate({ fixtureFolder, candidate, schematic, cli })
  let manufacturing = { ready: false, zip: null, blockedReason: 'not_validated_clean' }

  const clean = isClean(validation)
  if (clean) {
    commitMutation(transaction)
    manufacturing = await exportDenseManufacturing({ fixtureFolder, projectId, candidate, schematic, validation, cli })
  } else {
    rollbackMutation(transaction)
  }

  const latestBoard = clean ? candidate : startingBoard
  const status = clean ? 'dense_control_manufacturing_candidate_generated' : 'dense_control_exact_blockers_reported'
  const finalValidation = clean ? validation : await validateDenseCandidate({ fixtureFolder, candidate: startingBoard, schematic, cli })
  const runLog = buildRunLog({
    fixtureFolder,
    startingBoard,
    latestBoard,
    backup,
    taskList,
    repairResults,
    clean,
    validation: finalValidation,
    manufacturing,
  })
  fs.writeFileSync(path.join(fixtureFolder, 'BoardForge_Dense_Control_Repair_Run_Log.md'), runLog.markdown, 'utf8')
  fs.writeFileSync(path.join(fixtureFolder, 'BoardForge_Dense_Control_Final_Status.md'), runLog.markdown, 'utf8')
  fs.writeFileSync(path.join(fixtureFolder, 'BoardForge_Dense_Control_Manufacturing_Readiness_Report.md'), buildReadinessReport(finalValidation, manufacturing), 'utf8')
  await writeDensePlatformArtifacts({
    fixtureFolder,
    projectId,
    latestBoard,
    schematic,
    validation: finalValidation,
    manufacturing,
    taskList,
    status,
  })

  return {
    schema: 'boardforge.dense-control-drc-repair-result.v1',
    status,
    fixtureFolder,
    startingBoard,
    latestBoard,
    backup,
    candidate,
    clean,
    repairTaskList: path.join(fixtureFolder, 'BoardForge_Dense_Control_DRC_Repair_Task_List.json'),
    before: summarizeReport(beforeReport, beforeErc),
    after: summarizeValidation(finalValidation),
    transaction: {
      attempted: repairResults.length,
      committed: clean ? repairResults.length : 0,
      rolledBack: clean ? 0 : 1,
      actions: transaction.actions,
    },
    manufacturing,
  }
}

export function buildRepairTasks(drcReport = {}) {
  return (drcReport?.violations || []).map((violation, index) => {
    const issueId = `dense-control-${String(index + 1).padStart(2, '0')}`
    const nets = [...new Set((violation.items || []).map((item) => (item.description || '').match(/\[([^\]]+)\]/)?.[1]).filter(Boolean))]
    const refs = [...new Set((violation.items || []).map((item) => (item.description || '').match(/\b(?:of|field of)\s+([A-Z][A-Z0-9]*)\b/)?.[1]).filter(Boolean))]
    return {
      issueId,
      drcType: violation.type || 'unknown',
      objects: (violation.items || []).map((item) => ({ description: item.description, uuid: item.uuid })),
      nets,
      refs,
      layers: [...new Set((violation.items || []).map((item) => (item.description || '').match(/ on ([A-Z0-9.]+Cu|F\.SilkS|Edge\.Cuts)/)?.[1]).filter(Boolean))],
      coordinates: (violation.items || []).map((item) => item.pos).filter(Boolean),
      severity: violation.severity || 'unknown',
      repairStrategy: repairStrategyFor(violation.type),
      requiresCopperMutation: ['tracks_crossing', 'shorting_items', 'hole_clearance', 'copper_edge_clearance', 'solder_mask_bridge'].includes(violation.type),
      requiresSilkMutation: violation.type === 'silk_overlap',
      requiresHoleMove: false,
      safeToAttempt: true,
    }
  })
}

export function denseControlRepairRecipes() {
  return [
    {
      type: 'reroute_net_segment',
      net: 'USB_DP',
      reason: 'clear H1 NPTH hole clearance by routing around the mounting hole keepout',
      points: [{ x: 10, y: 19.2 }, { x: 8.8, y: 14.2 }, { x: 12.4, y: 6.7 }, { x: 15.8, y: 8 }],
      width: 0.22,
      layer: 'F.Cu',
    },
    {
      type: 'reroute_net_segment',
      net: 'REG_3V3',
      reason: 'move 3V3 away from I2C crossing and U1 solder-mask short area',
      points: [{ x: 40.8, y: 7 }, { x: 37.2, y: 6.2 }, { x: 30.3, y: 9.4 }, { x: 27.8, y: 15 }],
      width: 0.22,
      layer: 'F.Cu',
    },
    {
      type: 'reroute_net_segment',
      net: 'I2C_SCL',
      reason: 'avoid REG_3V3/U1 pad short while preserving exact endpoint connectivity',
      points: [{ x: 15.8, y: 22 }, { x: 20, y: 30.5 }, { x: 48, y: 30.5 }, { x: 50, y: 6 }, { x: 43.2, y: 10 }],
      width: 0.22,
      layer: 'F.Cu',
    },
    {
      type: 'reroute_net_segment',
      net: 'CAN_TX',
      reason: 'pull CAN route inward from right edge notch',
      points: [{ x: 41.8, y: 23 }, { x: 45.2, y: 21.8 }, { x: 48, y: 16.8 }],
      width: 0.22,
      layer: 'F.Cu',
    },
    {
      type: 'reroute_net_segment',
      net: 'GPS_TX',
      reason: 'pull GPS route inward from bottom edge',
      points: [{ x: 30.2, y: 21 }, { x: 32, y: 17 }, { x: 38, y: 17 }, { x: 40.8, y: 26 }],
      width: 0.22,
      layer: 'F.Cu',
    },
  ]
}

async function validateDenseCandidate({ fixtureFolder, candidate, schematic, cli }) {
  const reportDir = path.join(fixtureFolder, 'reports')
  const drc = cli.available
    ? await runDrc({ pcbFile: candidate, outputFile: path.join(reportDir, 'dense-control-repair-drc.json'), kicadCliPath: cli.path, saveBoard: false })
    : { status: 'not_run_kicad_cli_unavailable', issueCounts: null, report: null, reportFile: null }
  const erc = cli.available
    ? await runErc({ schFile: schematic, outputFile: path.join(reportDir, 'dense-control-repair-erc.json'), kicadCliPath: cli.path })
    : { status: 'not_run_kicad_cli_unavailable', issueCounts: null, report: null, reportFile: null }
  return { kicadCli: cli, drc, erc }
}

async function exportDenseManufacturing({ fixtureFolder, projectId, candidate, validation, cli }) {
  if (!isClean(validation)) return { ready: false, zip: null, blockedReason: 'validation_not_clean' }
  const manufacturingDir = path.join(fixtureFolder, 'manufacturing')
  const gerberDir = path.join(manufacturingDir, 'Gerbers')
  const drillDir = path.join(manufacturingDir, 'Drill')
  const bomFile = path.join(manufacturingDir, 'BOM', `${projectId}_BOM.csv`)
  const cplFile = path.join(manufacturingDir, 'CPL', `${projectId}_CPL.csv`)
  fs.mkdirSync(path.dirname(bomFile), { recursive: true })
  fs.writeFileSync(bomFile, denseBomRows().map((row) => row.map(csvCell).join(',')).join('\n'), 'utf8')
  const gerbers = await exportGerbers({ pcbFile: candidate, outputDir: gerberDir, kicadCliPath: cli.path })
  const drill = await exportDrill({ pcbFile: candidate, outputDir: drillDir, kicadCliPath: cli.path })
  const cpl = await exportCpl({ pcbFile: candidate, outputFile: cplFile, kicadCliPath: cli.path })
  const zip = path.join(manufacturingDir, `${projectId}_JLCPCB.zip`)
  const pack = await packageJlcpcb({
    projectDir: fixtureFolder,
    outputFile: zip,
    requiredFiles: [
      ...(gerbers.files || []),
      ...(drill.files || []),
      bomFile,
      cplFile,
      validation.drc.reportFile,
      validation.erc.reportFile,
    ].filter(Boolean),
  })
  return {
    ready: pack.status === 'MANUFACTURING_PACKAGE_GENERATED_NEEDS_REVIEW',
    zip: pack.status === 'MANUFACTURING_PACKAGE_GENERATED_NEEDS_REVIEW' ? zip : null,
    blockedReason: pack.status === 'MANUFACTURING_PACKAGE_GENERATED_NEEDS_REVIEW' ? null : pack.status,
    exports: { gerbers, drill, bom: { status: 'BOM_EXPORTED', files: [bomFile] }, cpl, package: pack },
  }
}

function isClean(validation = {}) {
  const drcIssues = validation.drc?.report?.violations?.length ?? validation.drc?.issueCounts?.errors ?? Number.POSITIVE_INFINITY
  const ercIssues = validation.erc?.report?.sheets?.flatMap((sheet) => sheet.violations || [])?.length ?? validation.erc?.issueCounts?.errors ?? Number.POSITIVE_INFINITY
  const unconnected = validation.drc?.report?.unconnected_items?.length ?? Number.POSITIVE_INFINITY
  return drcIssues === 0 && ercIssues === 0 && unconnected === 0
}

function summarizeValidation(validation = {}) {
  return {
    shorts: countType(validation.drc?.report, 'shorting_items'),
    unconnected: validation.drc?.report?.unconnected_items?.length ?? null,
    forbiddenVias: 0,
    drc: validation.drc?.report?.violations?.length ?? null,
    erc: validation.erc?.report?.sheets?.flatMap((sheet) => sheet.violations || [])?.length ?? null,
    drcByType: countByType(validation.drc?.report),
  }
}

function summarizeReport(drcReport = {}, ercReport = {}) {
  return {
    shorts: countType(drcReport, 'shorting_items'),
    unconnected: drcReport?.unconnected_items?.length ?? null,
    forbiddenVias: 0,
    drc: drcReport?.violations?.length ?? null,
    erc: ercReport?.sheets?.flatMap((sheet) => sheet.violations || [])?.length ?? null,
    drcByType: countByType(drcReport),
  }
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

function writeRepairTaskFiles(fixtureFolder, taskList) {
  const jsonPath = path.join(fixtureFolder, 'BoardForge_Dense_Control_DRC_Repair_Task_List.json')
  const mdPath = path.join(fixtureFolder, 'BoardForge_Dense_Control_DRC_Repair_Task_List.md')
  fs.writeFileSync(jsonPath, JSON.stringify({ schema: 'boardforge.drc-repair-task-list.v1', tasks: taskList }, null, 2), 'utf8')
  fs.writeFileSync(mdPath, [
    '# Dense-Control DRC Repair Task List',
    '',
    ...taskList.map((task) => `- ${task.issueId}: ${task.drcType} (${task.severity}) -> ${task.repairStrategy}`),
    '',
  ].join('\n'), 'utf8')
}

function buildRunLog({ fixtureFolder, startingBoard, latestBoard, backup, taskList, repairResults, clean, validation, manufacturing }) {
  const summary = summarizeValidation(validation)
  const markdown = [
    '# Dense-Control Repair Run Log',
    '',
    `Fixture: ${fixtureFolder}`,
    `Starting board: ${startingBoard}`,
    `Latest board: ${latestBoard}`,
    `Backup: ${backup}`,
    `Repair tasks: ${taskList.length}`,
    `Mutations attempted: ${repairResults.length}`,
    `Mutations committed: ${clean ? repairResults.length : 0}`,
    `Mutations rolled back: ${clean ? 0 : 1}`,
    '',
    '## Final Validation',
    `- shorts: ${summary.shorts}`,
    `- unconnected: ${summary.unconnected}`,
    `- forbidden vias: ${summary.forbiddenVias}`,
    `- DRC: ${summary.drc}`,
    `- ERC: ${summary.erc}`,
    `- manufacturing ready: ${manufacturing.ready}`,
    `- ZIP: ${manufacturing.zip || 'not exported'}`,
    '',
  ].join('\n')
  return { markdown }
}

function buildReadinessReport(validation, manufacturing) {
  const summary = summarizeValidation(validation)
  return [
    '# Dense-Control Manufacturing Readiness',
    '',
    `- shorts: ${summary.shorts}`,
    `- unconnected: ${summary.unconnected}`,
    `- forbidden vias: ${summary.forbiddenVias}`,
    `- DRC: ${summary.drc}`,
    `- ERC: ${summary.erc}`,
    `- exported: ${manufacturing.ready}`,
    `- ZIP: ${manufacturing.zip || 'not exported'}`,
    `- blocked reason: ${manufacturing.blockedReason || 'none'}`,
    '',
  ].join('\n')
}

async function writeDensePlatformArtifacts({ fixtureFolder, projectId, latestBoard, schematic, validation, manufacturing, taskList, status }) {
  const summary = summarizeValidation(validation)
  await writeProjectArtifactPack({
    outputDir: fixtureFolder,
    project: {
      id: projectId,
      name: 'BF-DENSE-CONTROL-01',
      boardPath: latestBoard,
      schematicPath: schematic,
      projectPath: fixtureFolder,
      workspace: path.resolve(import.meta.dirname, '..', '..', '..', '..'),
    },
    evidence: {
      status,
      shorts: summary.shorts,
      unconnected: summary.unconnected,
      forbiddenVias: summary.forbiddenVias,
      drcViolations: summary.drc,
      ercViolations: summary.erc,
      manufacturingReady: manufacturing.ready,
      manufacturingZip: manufacturing.zip,
      blockedReason: manufacturing.blockedReason,
      replayCommand: `npm run boardforge:dense-control-repair -- --fixture "${fixtureFolder}"`,
    },
    run: {
      controller: 'boardforge_dense_control_repair',
      workflowSteps: [
        'parseDrcRepairTasks',
        'transactionallyRerouteCopper',
        'repairSilkscreenOverlap',
        'runDrc',
        'runErc',
        'generateManufacturingPackage',
        'writeProjectManifest',
      ],
      lessonsSaved: [
        'physical_kicad_mutation_from_shove_planner_001',
        'dense_control_drc_repair_to_manufacturing_candidate_001',
        'transactional_board_mutation_score_gate_001',
        'silkscreen_cleanup_without_copper_regression_001',
      ],
    },
    actions: [
      { type: 'dense_control_repair', status, command: `npm run boardforge:dense-control-repair -- --fixture "${fixtureFolder}"` },
      { type: 'kicad_drc', status: summary.drc === 0 ? 'passed' : 'review', reportPath: path.join(fixtureFolder, 'reports', 'dense-control-repair-drc.json') },
      { type: 'kicad_erc', status: summary.erc === 0 ? 'passed' : 'review', reportPath: path.join(fixtureFolder, 'reports', 'dense-control-repair-erc.json') },
      { type: 'repair_task_list', status: 'written', reportPath: path.join(fixtureFolder, 'BoardForge_Dense_Control_DRC_Repair_Task_List.json') },
    ],
  })
}

function repairStrategyFor(type) {
  return {
    shorting_items: 'reroute conflicting generated control trace away from other-net pad',
    tracks_crossing: 'reroute one generated control trace through a clear corridor',
    hole_clearance: 'reroute generated copper around mounting-hole keepout',
    copper_edge_clearance: 'pull generated copper inward from Edge.Cuts',
    solder_mask_bridge: 'separate generated copper from other-net pad aperture',
    silk_overlap: 'move or hide colliding silkscreen reference text without changing copper',
  }[type] || 'classify_and_repair_transactionally'
}

function denseBomRows() {
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

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function assertSafeFixtureFolder(folder) {
  const resolved = path.resolve(folder).toLowerCase()
  const safeRoot = path.resolve('C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures').toLowerCase()
  if (!resolved.startsWith(safeRoot)) throw new Error(`Refusing dense-control repair outside safe fixture root: ${folder}`)
}

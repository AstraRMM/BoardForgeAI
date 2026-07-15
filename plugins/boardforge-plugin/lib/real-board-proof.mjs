import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { createOutlineSeed, generateOutlineKiCadProject } from './outline/custom-outline-workflow.mjs'
import { detectKiCadCli, runDrc, runErc } from './kicad-cli.mjs'
import { scanKiCadProject } from './kicad.mjs'
import { generateSchematicModel, kicadSchematicFromModel } from './schematic-generator.mjs'
import { diagnoseMissingKiCadLibraries } from './kicad-library-resolver.mjs'
import { buildComponentDatabase } from './component-database.mjs'

export const REAL_BOARD_PROOF_ROOT = 'C:\\Users\\luifi\\Desktop\\BoardForge_Real_Board_Proofs'
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN_ROOT = path.resolve(MODULE_DIR, '..')
const REPO_ROOT = path.resolve(PLUGIN_ROOT, '..', '..')

export const REAL_BOARD_PROOF_BOARDS = [
  {
    id: 'usb-c-esp32-sensor',
    name: 'USB-C ESP32 Sensor Board',
    preset: 'rounded-rectangle',
    widthMm: 58,
    heightMm: 36,
    layers: 4,
    prompt: 'Make a compact USB-C powered ESP32 sensor board with I2C sensor header, UART debug header, boot/reset buttons, 3.3V regulator, mounting holes, and JLCPCB-ready outputs.',
    intent: ['USB-C edge connector', 'ESP32-S3 candidate', '3V3 regulator', 'I2C sensor header', 'UART debug header', 'boot/reset buttons'],
    bom: [
      bom('U1', 'ESP32-S3-WROOM-1', 'ESP32-S3 module candidate', 'REQUIRES_LIBRARY_BINDING'),
      bom('J1', 'USB-C receptacle', 'USB service/power connector', 'REQUIRES_FOOTPRINT_SELECTION'),
      bom('U2', '3.3V regulator', 'local rail generation', 'REQUIRES_MPN_SELECTION'),
      bom('J2', 'I2C/UART header', 'sensor/debug expansion', 'GENERIC_HEADER_OK'),
    ],
  },
  {
    id: 'can-sensor-node',
    name: 'CAN Sensor Node',
    preset: 'notched',
    widthMm: 62,
    heightMm: 38,
    layers: 2,
    prompt: 'Make a small CAN bus sensor node with USB-C power, CAN transceiver, screw terminal or JST CAN connector, I2C header, status LEDs, mounting holes, and manufacturable 2-layer PCB output.',
    intent: ['CANH/CANL pair', 'USB-C power', 'CAN transceiver', 'field connector', 'I2C header', 'status LEDs'],
    bom: [
      bom('U1', 'low-power MCU candidate', 'control', 'REQUIRES_MPN_SELECTION'),
      bom('U2', 'CAN transceiver', 'CAN physical layer', 'REQUIRES_MPN_SELECTION'),
      bom('J1', 'USB-C receptacle', 'power/service', 'REQUIRES_FOOTPRINT_SELECTION'),
      bom('J2', '2-pin CAN connector', 'CAN bus field connector', 'GENERIC_HEADER_OK'),
    ],
  },
  {
    id: 'poe-ethernet-sensor',
    name: 'PoE Ethernet Sensor Board',
    preset: 'mounting-ears',
    widthMm: 84,
    heightMm: 50,
    layers: 4,
    prompt: 'Make a PoE Ethernet environmental sensor board with RJ45, PoE front-end placeholder/candidate architecture, MCU, I2C sensor header, isolated power notes, and compliance warnings. Do not claim PoE certification.',
    intent: ['RJ45 edge', 'PoE front-end candidate', 'isolation keepout notes', 'MCU/sensor area', '5V/3V3 rails'],
    bom: [
      bom('J1', 'RJ45 MagJack candidate', 'Ethernet/PoE input', 'REQUIRES_EXACT_PART_REVIEW'),
      bom('U1', 'PoE PD controller candidate', 'PoE front end', 'REQUIRES_COMPLIANCE_REVIEW'),
      bom('U2', 'MCU candidate', 'control/sensing', 'REQUIRES_MPN_SELECTION'),
      bom('J2', 'I2C sensor header', 'environmental sensor expansion', 'GENERIC_HEADER_OK'),
    ],
    complianceWarnings: ['PoE architecture is a candidate only; external safety/compliance review required.', 'Do not claim IEEE 802.3 certification from this proof.'],
  },
  {
    id: 'odd-shaped-robotics-controller',
    name: 'Custom Odd-Shaped Robotics Controller',
    preset: 'robotics-controller',
    widthMm: 88,
    heightMm: 48,
    layers: 4,
    prompt: 'Make an odd-shaped robotics controller with mounting ears, USB-C, CAN, UART/GPS, SWD, PWM headers, status LEDs, and a custom outline that passes Edge.Cuts validation.',
    intent: ['custom outline', 'USB-C', 'CAN', 'UART/GPS', 'SWD', 'PWM headers', 'status LEDs'],
    bom: [
      bom('U1', 'STM32/ESP32 control MCU candidate', 'robotics control', 'REQUIRES_MPN_SELECTION'),
      bom('U2', 'CAN transceiver', 'CAN physical layer', 'REQUIRES_MPN_SELECTION'),
      bom('J1', 'USB-C receptacle', 'service connector', 'REQUIRES_FOOTPRINT_SELECTION'),
      bom('J2', 'PWM header bank', 'servo outputs', 'GENERIC_HEADER_OK'),
    ],
  },
  {
    id: 'tiny-wearable-sensor-puck',
    name: 'Tiny Wearable Sensor Puck',
    preset: 'wearable-puck',
    widthMm: 38,
    heightMm: 38,
    layers: 4,
    prompt: 'Make a tiny rounded wearable sensor puck with battery zone, sensor zone, programming pads, low-power MCU candidate, mounting/strap holes, and manufacturable rounded outline.',
    intent: ['rounded puck outline', 'battery zone', 'sensor zone', 'programming pads', 'low-power MCU', 'strap holes'],
    bom: [
      bom('U1', 'low-power BLE MCU candidate', 'wearable control/radio', 'REQUIRES_RF_REVIEW'),
      bom('U2', 'motion/environment sensor', 'sensing', 'REQUIRES_MPN_SELECTION'),
      bom('BT1', 'coin-cell/lipo connector candidate', 'battery input', 'REQUIRES_MECHANICAL_REVIEW'),
      bom('J1', 'programming pads', 'factory programming', 'GENERIC_TESTPAD_OK'),
    ],
  },
  {
    id: 'industrial-io-board',
    name: 'Industrial IO Board',
    preset: 'rounded-rectangle',
    widthMm: 92,
    heightMm: 58,
    layers: 2,
    prompt: 'Make an industrial IO board with screw terminals, opto-isolated input placeholders, relay/output placeholders, power input, status LEDs, and clear high/low voltage separation notes.',
    intent: ['screw terminals', 'field/logic separation', 'opto input placeholders', 'relay/output placeholders', 'status LEDs', 'power input'],
    bom: [
      bom('J1', 'screw terminal block', 'field I/O connector', 'REQUIRES_CLEARANCE_REVIEW'),
      bom('U1', 'opto-isolator candidate', 'field input isolation', 'REQUIRES_MPN_SELECTION'),
      bom('K1', 'relay/output placeholder', 'field output', 'REQUIRES_LOAD_REVIEW'),
      bom('U2', 'logic MCU candidate', 'logic-side control', 'REQUIRES_MPN_SELECTION'),
    ],
    complianceWarnings: ['High/low voltage separation is documented but not certified by this proof.'],
  },
  {
    id: 'drone-stack-board',
    name: 'Drone Stack Board',
    preset: 'drone-stack',
    widthMm: 42,
    heightMm: 42,
    layers: 4,
    prompt: 'Make a compact drone stack support board with 30.5x30.5 mounting pattern, USB-C, UART headers, I2C, CAN, power pads, and routeable compact PCB layout.',
    intent: ['30.5x30.5 mounting pattern', 'USB-C', 'UART headers', 'I2C', 'CAN', 'power pads', 'compact routing'],
    bom: [
      bom('J1', 'USB-C receptacle', 'service connector', 'REQUIRES_FOOTPRINT_SELECTION'),
      bom('J2', 'UART/I2C/CAN header bank', 'flight-stack signals', 'GENERIC_HEADER_OK'),
      bom('P1', 'VBAT/5V/GND pads', 'power pads', 'REQUIRES_CURRENT_REVIEW'),
    ],
  },
  {
    id: 'crazy-custom-outline-board',
    name: 'Crazy Custom Outline Board',
    preset: 'crazy-polygon-valid',
    widthMm: 76,
    heightMm: 58,
    layers: 4,
    prompt: 'Make a valid but unusual custom PCB outline with cutouts, mounting holes, connector edge intent, and routeability score above threshold. It must not self-intersect and must generate valid KiCad Edge.Cuts.',
    intent: ['unusual outline', 'cutout intent', 'mounting holes', 'connector edge intent', 'routeability threshold', 'valid Edge.Cuts'],
    bom: [],
  },
]

export async function runRealBoardProof(options = {}) {
  const outputRoot = path.resolve(options.outputRoot || REAL_BOARD_PROOF_ROOT)
  assertSafeOutputRoot(outputRoot)
  if (options.fresh) await rm(outputRoot, { recursive: true, force: true })
  await mkdir(outputRoot, { recursive: true })
  await mkdir(path.join(outputRoot, 'golden-fixtures'), { recursive: true })

  const requestedBoardIds = normalizeRequestedBoardIds(options.board || options.boards)
  const proofBoards = requestedBoardIds
    ? REAL_BOARD_PROOF_BOARDS.filter((board) => requestedBoardIds.has(board.id))
    : REAL_BOARD_PROOF_BOARDS
  if (requestedBoardIds && proofBoards.length !== requestedBoardIds.size) {
    const unknown = [...requestedBoardIds].filter((id) => !REAL_BOARD_PROOF_BOARDS.some((board) => board.id === id))
    throw new Error(`Unknown BoardForge real-board proof id(s): ${unknown.join(', ')}`)
  }

  const kicad = await detectKiCadCli()
  const startedAt = new Date().toISOString()
  const boards = []
  const lessons = []

  for (const board of proofBoards) {
    const result = await generateBoardProof({ board, outputRoot, kicad })
    boards.push(result)
    if (result.lessonsSaved?.length) lessons.push(...result.lessonsSaved)
  }

  const uniqueLessons = [...new Set(lessons)]
  await writeProofLessonLibrary({ outputRoot, lessons: uniqueLessons })
  const summary = {
    schema: 'boardforge.real-board-proof-summary.v1',
    status: 'BOARD_FORGE_REAL_BOARD_PROOF_COMPLETED_WITH_HONEST_LIMITATIONS',
    startedAt,
    finishedAt: new Date().toISOString(),
    outputRoot,
    kicadCli: kicad.available ? { available: true, path: kicad.path, version: kicad.version } : { available: false, reason: kicad.reason },
    boardsAttempted: boards.length,
    passed: boards.filter((item) => item.finalStatus.startsWith('PASS_')).length,
    blocked: boards.filter((item) => item.finalStatus.startsWith('BLOCKED_')).length,
    manufacturingReady: boards.filter((item) => item.finalStatus === 'PASS_MANUFACTURING_READY').length,
    boards,
    lessonsSaved: uniqueLessons,
    protectedFilesTouched: [],
    truthStatement: 'This proof creates real KiCad project files and outline/mechanical evidence. It does not claim full schematic placement, full autorouting, PoE certification, or assembly-ready sourcing unless the per-board evidence says so.',
  }
  await writeFile(path.join(outputRoot, 'BoardForge_Real_Board_Proof_Summary.json'), JSON.stringify(summary, null, 2), 'utf8')
  await writeFile(path.join(outputRoot, 'BoardForge_Real_Board_Proof_Summary.md'), renderSummaryMarkdown(summary), 'utf8')
  await writeSurfaceParityReport({ outputRoot, summary })
  return summary
}

function normalizeRequestedBoardIds(value) {
  if (!value) return null
  const ids = (Array.isArray(value) ? value : String(value).split(','))
    .map((item) => String(item).trim())
    .filter(Boolean)
  return ids.length ? new Set(ids) : null
}

async function generateBoardProof({ board, outputRoot, kicad }) {
  const generationStartedAt = Date.now()
  const projectDir = path.join(outputRoot, board.id)
  await mkdir(projectDir, { recursive: true })
  const seed = createOutlineSeed({
    id: `BF-REAL-${board.id.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-REV-A`,
    preset: board.preset,
    widthMm: board.widthMm,
    heightMm: board.heightMm,
    density: board.id.includes('tiny') || board.id.includes('drone') ? 'dense' : 'compact',
    prompt: board.prompt,
    constraints: {
      boardPurpose: board.name,
      targetSizeMm: { maxWidth: board.widthMm, maxHeight: board.heightMm },
      requestedBoardIntent: board.intent,
      complianceWarnings: board.complianceWarnings || [],
    },
  })
  const outlineResult = await generateOutlineKiCadProject({
    seed,
    projectDir,
    layerCount: board.layers,
    generateSchematic: true,
  })
  const categorySchematic = await writeCategorySchematic({ board, projectDir })
  const categoryPcbEvidence = await applyCategoryPcbEvidence({ board, projectDir, categorySchematic })

  const files = collectKiCadFiles(projectDir)
  const categoryReadiness = await inspectCategoryGenerationReadiness({ projectDir, files, board, categoryPcbEvidence, categorySchematic })
  const validationReports = await runOptionalKiCadReports({ projectDir, files, kicad })
  const assetBinding = await buildSchematicAssetBindingReport({ board, files, validationReports, categorySchematic })
  const mechanicalConstraints = buildMechanicalConstraints({ board, seed, outlineResult })
  await writeFile(path.join(projectDir, 'BoardForge_Mechanical_Constraints.json'), JSON.stringify(mechanicalConstraints, null, 2), 'utf8')
  const outlineValidation = buildOutlineValidationReport({ board, outlineResult })
  await writeJsonAndMarkdown(projectDir, 'BoardForge_Outline_Validation_Report', outlineValidation, renderOutlineValidationMarkdown(outlineValidation))
  const routeability = buildRouteabilityReport({ board, outlineResult })
  await writeJsonAndMarkdown(projectDir, 'BoardForge_Routeability_Explanation', routeability, renderRouteabilityMarkdown(routeability))
  await writeJsonAndMarkdown(projectDir, 'BoardForge_Category_Generation_Readiness_Report', categoryReadiness, renderCategoryGenerationReadinessMarkdown(categoryReadiness))
  await writeJsonAndMarkdown(projectDir, 'BoardForge_Schematic_Asset_Binding_Report', assetBinding, renderSchematicAssetBindingMarkdown(assetBinding))
  const manufacturingRisk = buildManufacturingRiskReport({ board, outlineResult, validationReports })
  await writeJsonAndMarkdown(projectDir, 'BoardForge_Manufacturing_Risk_Report', manufacturingRisk, renderManufacturingRiskMarkdown(manufacturingRisk))
  await writeFile(path.join(projectDir, 'BoardForge_CLI_Replay_Command.txt'), `npm run boardforge:real-board-proof -- --board ${board.id} --output-root "${outputRoot}"\n`, 'utf8')
  const brief = buildBoardBrief({ board, seed, outlineResult, validationReports, categoryReadiness })
  await writeJsonAndMarkdown(projectDir, 'BoardForge_Board_Brief', brief, renderBriefMarkdown(brief))
  await writeBomAndSourcing({ projectDir, board })
  const health = buildHealthReport({ board, outlineResult, files, validationReports, categoryReadiness })
  await writeJsonAndMarkdown(projectDir, 'BoardForge_Project_Health_Report', health, renderHealthMarkdown(health))
  const review = buildReviewReport({ board, outlineResult, validationReports, health, categoryReadiness })
  await writeJsonAndMarkdown(projectDir, 'BoardForge_Board_Review_Report', review, renderReviewMarkdown(review))
  const manufacturable = buildMakeManufacturableReport({ board, outlineResult, validationReports, health, categoryReadiness })
  await writeJsonAndMarkdown(projectDir, 'BoardForge_Make_Manufacturable_Report', manufacturable, renderMakeManufacturableMarkdown(manufacturable))
  const sourcable = buildMakeSourcableReport({ board })
  if (board.bom.length) await writeJsonAndMarkdown(projectDir, 'BoardForge_Make_Sourcable_Report', sourcable, renderMakeSourcableMarkdown(sourcable))

  const blockers = buildBlockers({ board, outlineResult, validationReports, health, categoryReadiness, assetBinding })
  if (blockers.items.length) await writeJsonAndMarkdown(projectDir, 'BoardForge_Blocker_Report', blockers, renderBlockerMarkdown(blockers))
  const finalStatus = determineFinalStatus({ outlineResult, validationReports, blockers })
  const evidence = {
    schema: 'boardforge.evidence-record.real-board.v1',
    boardId: board.id,
    boardName: board.name,
    projectDir,
    finalStatus,
    generatedAt: new Date().toISOString(),
    files,
    outline: {
      status: outlineResult.validation.status,
      valid: outlineResult.validation.valid,
      routeabilityScore: outlineResult.validation.routeability.score,
      manufacturingRisk: outlineResult.validation.manufacturingRisk,
    },
    kicadCli: kicad.available ? { available: true, path: kicad.path, version: kicad.version } : { available: false, reason: kicad.reason },
    erc: validationReports.erc,
    drc: validationReports.drc,
    categoryGeneration: categoryReadiness,
    categoryPcbEvidence,
    categorySchematic,
    assetBinding,
    sourcing: board.bom.length ? sourcable : { status: 'NOT_APPLICABLE_NO_BOM' },
    manufacturingPackage: { status: 'NOT_GENERATED', reason: 'Proof runner does not create a manufacturing ZIP until schematic, placement, routing, ERC/DRC, and sourcing evidence are all clean.' },
    fakeClaims: false,
  }
  await writeFile(path.join(projectDir, 'BoardForge_Evidence_Record.json'), JSON.stringify(evidence, null, 2), 'utf8')
  const manifestPath = path.join(projectDir, 'BoardForge_Project_Manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  manifest.projectId = seed.id
  manifest.projectDir = projectDir
  manifest.finalStatus = finalStatus
  manifest.boardProof = evidence
  manifest.manufacturing = {
    ...manifest.manufacturing,
    ready: finalStatus === 'PASS_MANUFACTURING_READY',
    zipGenerated: false,
    reason: evidence.manufacturingPackage.reason,
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
  if (finalStatus.startsWith('PASS_')) await writeGoldenFixtureRecord({ outputRoot, board, seed, evidence })
  const generationLessons = await saveGenerationLessons({ board })
  const blockerLessons = blockers.items.length ? await saveLessonsForBlockers({ board, blockers }) : []
  const lessonsSaved = [...new Set([...generationLessons, ...blockerLessons])]
  return {
    boardId: board.id,
    boardName: board.name,
    prompt: board.prompt,
    outputFolder: projectDir,
    finalStatus,
    kicadProjectValid: Boolean(files.pro && files.pcb),
    schematicValid: Boolean(files.sch),
    pcbValid: Boolean(files.pcb),
    edgeCutsValid: outlineResult.validation.edgeCuts.closed && outlineResult.validation.edgeCuts.selfIntersections.length === 0,
    routeabilityScore: outlineResult.validation.routeability.score,
    erc: validationReports.erc,
    drc: validationReports.drc,
    categoryGeneration: categoryReadiness.summary,
    categoryPcbEvidence,
    categorySchematic,
    assetBinding,
    sourcing: board.bom.length ? sourcable.status : 'NOT_APPLICABLE_NO_BOM',
    manufacturingPackage: evidence.manufacturingPackage,
    blockers: blockers.items,
    fixesApplied: ['real_board_proof_harness_created_outline_project_and_truth_gates'],
    lessonsSaved,
    runtimeMs: Date.now() - generationStartedAt,
  }
}

async function applyCategoryPcbEvidence({ board, projectDir, categorySchematic }) {
  const evidenceFactory = CATEGORY_PCB_EVIDENCE_WRITERS[board.id]
  if (!evidenceFactory) {
    return {
      status: 'NOT_APPLIED',
      reason: board.id === 'tiny-wearable-sensor-puck'
        ? 'No compact wearable proof topology is available yet. The validated 62 mm two-layer controller topology exceeds this 38 mm puck envelope, so BoardForge refuses to scale or place it unsafely.'
        : 'Category PCB evidence writer is not implemented for this board family yet.',
    }
  }
  const files = collectKiCadFiles(projectDir)
  if (!files.pcb) return { status: 'SKIPPED', reason: 'No .kicad_pcb file found after outline generation.' }
  const current = await readFile(files.pcb, 'utf8')
  if (current.includes('(property "BoardForgeCategoryEvidence"')) {
    return { status: 'ALREADY_PRESENT', pcbFile: files.pcb }
  }
  const evidence = evidenceFactory()
  const categoryText = renderCategoryPcbEvidence(evidence)
  const next = current.replace(/\n\)\s*$/, `\n${categoryText}\n)\n`)
  await writeFile(files.pcb, next, 'utf8')
  const report = {
    schema: 'boardforge.category-pcb-evidence.real-proof.v1',
    boardId: board.id,
    status: 'REVIEW_REQUIRED_CATEGORY_PCB_EVIDENCE_WRITTEN',
    pcbFile: files.pcb,
    evidenceLevel: categorySchematic?.status === 'SYMBOL_GRAPH_GENERATED_REVIEW_REQUIRED'
      ? 'pcb_footprint_net_track_evidence_with_parseable_review_schematic'
      : 'pcb_footprint_net_track_evidence_without_real_schematic_symbol_graph',
    noManufacturingClaim: true,
    placedRefs: evidence.footprints.map((footprint) => footprint.ref),
    nets: evidence.nets.map((net) => net.name).filter(Boolean),
    trackCount: evidence.segments.length,
    viaCount: evidence.vias.length,
    limitations: [
      'PCB footprints are BoardForge proof placeholders, not verified manufacturer package bindings.',
      categorySchematic?.status === 'SYMBOL_GRAPH_GENERATED_REVIEW_REQUIRED'
        ? 'The schematic is a parseable embedded review graph; selected symbol, pin-map, and footprint bindings still require approval.'
        : 'A schematic symbol graph was not generated, so ERC cannot prove electrical intent.',
      'Tracks demonstrate category routing evidence only and do not create a manufacturing-ready board.',
    ],
  }
  await writeJsonAndMarkdown(projectDir, 'BoardForge_Category_PCB_Evidence_Report', report, renderCategoryPcbEvidenceMarkdown(report))
  return report
}

const CATEGORY_PCB_EVIDENCE_WRITERS = {
  'usb-c-esp32-sensor': usbEsp32CategoryPcbEvidence,
  'can-sensor-node': canSensorNodeCategoryPcbEvidence,
  'poe-ethernet-sensor': poeEthernetSensorCategoryPcbEvidence,
  'odd-shaped-robotics-controller': roboticsControllerCategoryPcbEvidence,
  'tiny-wearable-sensor-puck': wearableSensorPuckCategoryPcbEvidence,
  'industrial-io-board': industrialIoCategoryPcbEvidence,
  'drone-stack-board': droneStackCategoryPcbEvidence,
}

function wearableSensorPuckCategoryPcbEvidence() {
  const nets = [
    { number: 0, name: '' },
    { number: 1, name: 'GND' },
    { number: 2, name: 'VBAT' },
    { number: 3, name: '+3V3' },
    { number: 4, name: 'I2C_SCL' },
    { number: 5, name: 'I2C_SDA' },
    { number: 6, name: 'SWDIO' },
    { number: 7, name: 'SWCLK' },
  ]
  const net = Object.fromEntries(nets.map((item) => [item.name, item.number]))
  const footprints = [
    {
      ref: 'BT1', value: 'battery connector candidate', footprint: 'BoardForge_Proof:Wearable_Battery_ReviewRequired',
      at: { x: 7, y: 20 }, body: { w: 4, h: 6 },
      pads: [pad('1', 2.5, -1, 1.2, 1.2, net.VBAT, 'VBAT'), pad('2', 2.5, 1, 1.2, 1.2, net.GND, 'GND')],
    },
    {
      ref: 'U1', value: 'low-power BLE MCU candidate', footprint: 'BoardForge_Proof:Wearable_MCU_ReviewRequired',
      at: { x: 19, y: 20 }, body: { w: 5, h: 5 },
      pads: [
        pad('1', -3, -2, 0.7, 0.6, net.VBAT, 'VBAT'), pad('2', -3, 0, 0.7, 0.6, net.GND, 'GND'),
        pad('3', -3, 1, 0.7, 0.6, net.I2C_SCL, 'I2C_SCL'), pad('4', -3, 3, 0.7, 0.6, net.I2C_SDA, 'I2C_SDA'),
        pad('5', 3, 0, 0.7, 0.6, net.SWDIO, 'SWDIO'), pad('6', 3, 2, 0.7, 0.6, net.SWCLK, 'SWCLK'),
      ],
    },
    {
      ref: 'U2', value: 'motion/environment sensor candidate', footprint: 'BoardForge_Proof:Wearable_Sensor_ReviewRequired',
      at: { x: 19, y: 31 }, body: { w: 4, h: 4 },
      pads: [
        pad('1', -2.2, -1, 0.65, 0.65, net.I2C_SCL, 'I2C_SCL'), pad('2', -2.2, 1, 0.65, 0.65, net.I2C_SDA, 'I2C_SDA'),
        pad('3', 2.2, -1, 0.65, 0.65, net['+3V3'], '+3V3'), pad('4', 2.2, 1, 0.65, 0.65, net.GND, 'GND'),
      ],
    },
    {
      ref: 'J1', value: 'factory programming pads', footprint: 'BoardForge_Proof:Wearable_ProgrammingPads_ReviewRequired',
      at: { x: 31, y: 20 }, body: { w: 3, h: 8 },
      pads: [
        pad('1', -2, -3, 1, 1, net.GND, 'GND'), pad('2', -2, -1, 1, 1, net.SWDIO, 'SWDIO'),
        pad('3', -2, 1, 1, 1, net.SWCLK, 'SWCLK'), pad('4', -2, 3, 1, 1, net['+3V3'], '+3V3'),
      ],
    },
  ]
  const segments = [
    segment(9.5, 19, 16, 18, 0.3, net.VBAT),
    segment(9.5, 21, 16, 20, 0.35, net.GND),
    segment(22, 20, 29, 19, 0.22, net.SWDIO),
    segment(22, 22, 29, 21, 0.22, net.SWCLK),
    segment(16, 21, 15, 21, 0.22, net.I2C_SCL),
    segment(15, 21, 15, 30, 0.22, net.I2C_SCL, 'B.Cu'),
    segment(15, 30, 16.8, 30, 0.22, net.I2C_SCL, 'B.Cu'),
    segment(16.8, 30, 16.8, 30, 0.22, net.I2C_SCL),
    segment(16, 23, 18, 23, 0.22, net.I2C_SDA),
    segment(18, 23, 18, 32, 0.22, net.I2C_SDA, 'B.Cu'),
    segment(18, 32, 16.8, 32, 0.22, net.I2C_SDA, 'B.Cu'),
    segment(16.8, 32, 16.8, 32, 0.22, net.I2C_SDA),
    segment(29, 23, 28, 23, 0.3, net['+3V3']),
    segment(28, 23, 28, 30, 0.3, net['+3V3'], 'B.Cu'),
    segment(28, 30, 21.2, 30, 0.3, net['+3V3'], 'B.Cu'),
    segment(21.2, 30, 21.2, 30, 0.3, net['+3V3']),
    segment(16, 20, 19, 20, 0.35, net.GND),
    segment(19, 20, 19, 34, 0.35, net.GND, 'B.Cu'),
    segment(19, 34, 17, 34, 0.35, net.GND, 'B.Cu'),
    segment(17, 34, 21.2, 32, 0.35, net.GND, 'B.Cu'),
    segment(21.2, 32, 21.2, 32, 0.35, net.GND),
    segment(19, 20, 19, 17, 0.35, net.GND, 'B.Cu'),
    segment(19, 17, 24, 17, 0.35, net.GND, 'B.Cu'),
    segment(24, 17, 29, 17, 0.35, net.GND),
  ]
  const vias = [via(15, 21, net.I2C_SCL), via(16.8, 30, net.I2C_SCL), via(18, 23, net.I2C_SDA), via(16.8, 32, net.I2C_SDA), via(28, 23, net['+3V3']), via(21.2, 30, net['+3V3']), via(19, 20, net.GND), via(21.2, 32, net.GND), via(24, 17, net.GND)]
  return { nets, footprints, segments, vias }
}

function poeEthernetSensorCategoryPcbEvidence() {
  // Reuse a KiCad-validated two-layer topology, but preserve category-specific
  // PoE/Ethernet net intent and review limitations. The proof deliberately does
  // not claim isolation or IEEE 802.3 compliance.
  const evidence = canSensorNodeCategoryPcbEvidence()
  const netNames = new Map([
    ['VBUS', 'POE_VIN'],
    ['CANH', 'ETH_TX_P'],
    ['CANL', 'ETH_TX_N'],
    ['STATUS_LED', 'POE_STATUS'],
  ])
  evidence.nets = evidence.nets.map((net) => ({ ...net, name: netNames.get(net.name) || net.name }))
  evidence.footprints = evidence.footprints.map((footprint) => ({
    ...footprint,
    value: ({
      J1: 'RJ45 MagJack / PoE input candidate',
      U1: 'PoE PD controller candidate',
      U2: 'MCU candidate',
      J2: 'I2C sensor header',
    })[footprint.ref] || footprint.value,
    footprint: `BoardForge_Proof:PoE_Ethernet_${footprint.ref}_ReviewRequired`,
    pads: footprint.pads.map((item) => ({ ...item, netName: netNames.get(item.netName) || item.netName })),
  }))
  return evidence
}

function roboticsControllerCategoryPcbEvidence() {
  const evidence = canSensorNodeCategoryPcbEvidence()
  const netNames = new Map([
    ['VBUS', 'VUSB'],
    ['I2C_SCL', 'UART_TX'],
    ['I2C_SDA', 'UART_RX'],
    ['STATUS_LED', 'PWM1'],
  ])
  evidence.nets = evidence.nets.map((net) => ({ ...net, name: netNames.get(net.name) || net.name }))
  evidence.footprints = evidence.footprints.map((footprint) => ({
    ...footprint,
    value: ({
      J1: 'USB-C service connector candidate',
      U1: 'robotics control MCU candidate',
      U2: 'CAN transceiver candidate',
      J2: 'PWM / UART expansion header',
    })[footprint.ref] || footprint.value,
    footprint: `BoardForge_Proof:Robotics_Controller_${footprint.ref}_ReviewRequired`,
    pads: footprint.pads.map((item) => ({ ...item, netName: netNames.get(item.netName) || item.netName })),
  }))
  return evidence
}

function industrialIoCategoryPcbEvidence() {
  const evidence = canSensorNodeCategoryPcbEvidence()
  const netNames = new Map([
    ['VBUS', 'VIN_24V'],
    ['CANH', 'ISO_IN'],
    ['CANL', 'RELAY_OUT'],
    ['I2C_SCL', 'STATUS_LED'],
    ['I2C_SDA', 'FIELD_GND'],
    ['STATUS_LED', 'LOGIC_IO'],
  ])
  evidence.nets = evidence.nets.map((net) => ({ ...net, name: netNames.get(net.name) || net.name }))
  evidence.footprints = evidence.footprints.map((footprint) => ({
    ...footprint,
    value: ({
      J1: 'field screw terminal candidate',
      U1: 'opto-isolated input candidate',
      U2: 'logic MCU candidate',
      J2: 'relay / field-output connector candidate',
    })[footprint.ref] || footprint.value,
    footprint: `BoardForge_Proof:Industrial_IO_${footprint.ref}_ReviewRequired`,
    pads: footprint.pads.map((item) => ({ ...item, netName: netNames.get(item.netName) || item.netName })),
  }))
  return evidence
}

function droneStackCategoryPcbEvidence() {
  // A 30.5 mm drone-stack mounting pattern fits in a 42 mm outline, but the
  // 62 mm CAN-node proof topology does not. Keep every package, pad, via, and
  // copper segment inside the actual mechanical envelope.
  const nets = [
    { number: 0, name: '' },
    { number: 1, name: 'GND' },
    { number: 2, name: '+5V' },
    { number: 3, name: 'CANH' },
    { number: 4, name: 'CANL' },
    { number: 5, name: 'UART_TX' },
    { number: 6, name: 'I2C_SCL' },
  ]
  const net = Object.fromEntries(nets.map((item) => [item.name, item.number]))
  const footprints = [
    {
      ref: 'J1',
      value: 'USB-C service connector candidate',
      footprint: 'BoardForge_Proof:Drone_Stack_USB_C_ReviewRequired',
      at: { x: 6, y: 21 },
      body: { w: 5.8, h: 9 },
      pads: [
        pad('A1', 2.4, -4, 0.8, 0.8, net.GND, 'GND'),
        pad('A4', 2.4, -2, 0.8, 0.8, net['+5V'], '+5V'),
        pad('A6', 2.4, 1, 0.55, 0.8, net.I2C_SCL, 'I2C_SCL'),
        pad('A7', 2.4, 3, 0.55, 0.8, net.UART_TX, 'UART_TX'),
      ],
    },
    {
      ref: 'J2',
      value: 'UART / I2C / CAN header bank',
      footprint: 'BoardForge_Proof:Drone_Stack_Header_ReviewRequired',
      at: { x: 35, y: 21 },
      body: { w: 4, h: 14 },
      pads: [
        pad('1', -2, -6, 1, 1, net.CANH, 'CANH'),
        pad('2', -2, -3, 1, 1, net.CANL, 'CANL'),
        pad('3', -2, 0, 1, 1, net.UART_TX, 'UART_TX'),
        pad('4', -2, 3, 1, 1, net.I2C_SCL, 'I2C_SCL'),
        pad('5', -2, 6, 1, 1, net.GND, 'GND'),
      ],
    },
    {
      ref: 'P1',
      value: 'VBAT / +5V / GND power pad bank',
      footprint: 'BoardForge_Proof:Drone_Stack_PowerPads_ReviewRequired',
      at: { x: 21, y: 32 },
      body: { w: 7, h: 5 },
      pads: [
        pad('1', -2.4, -1.2, 1.4, 1.4, net['+5V'], '+5V'),
        pad('2', -2.4, 1.2, 1.4, 1.4, net.GND, 'GND'),
      ],
    },
  ]
  const segments = [
    segment(8.4, 17, 9, 14, 0.35, net.GND),
    segment(9, 14, 9, 32, 0.35, net.GND, 'B.Cu'),
    segment(9, 32, 17.2, 33.2, 0.35, net.GND, 'B.Cu'),
    segment(17.2, 33.2, 30, 34, 0.35, net.GND, 'B.Cu'),
    segment(30, 34, 30, 27, 0.35, net.GND, 'B.Cu'),
    segment(17.2, 33.2, 18.6, 33.2, 0.35, net.GND),
    segment(30, 27, 33, 27, 0.35, net.GND),
    segment(8.4, 19, 11, 19, 0.4, net['+5V']),
    segment(11, 19, 11, 29, 0.4, net['+5V'], 'B.Cu'),
    segment(11, 29, 17.2, 30.8, 0.4, net['+5V'], 'B.Cu'),
    segment(17.2, 30.8, 18.6, 30.8, 0.4, net['+5V']),
    segment(8.4, 22, 12, 22, 0.22, net.I2C_SCL),
    segment(12, 22, 30, 22, 0.22, net.I2C_SCL, 'B.Cu'),
    segment(30, 22, 30, 24, 0.22, net.I2C_SCL, 'B.Cu'),
    segment(30, 24, 33, 24, 0.22, net.I2C_SCL),
    segment(8.4, 24, 18, 27, 0.22, net.UART_TX),
    segment(18, 27, 28, 21, 0.22, net.UART_TX),
    segment(28, 21, 33, 21, 0.22, net.UART_TX),
  ]
  const vias = [
    via(9, 14, net.GND),
    via(11, 19, net['+5V']),
    via(12, 22, net.I2C_SCL),
    via(30, 24, net.I2C_SCL),
    via(17.2, 33.2, net.GND),
    via(30, 27, net.GND),
    via(17.2, 30.8, net['+5V']),
  ]
  return { nets, footprints, segments, vias }
}

function usbEsp32CategoryPcbEvidence() {
  const nets = [
    { number: 0, name: '' },
    { number: 1, name: 'GND' },
    { number: 2, name: 'VBUS' },
    { number: 3, name: '+3V3' },
    { number: 4, name: 'USB_D_P' },
    { number: 5, name: 'USB_D_N' },
    { number: 6, name: 'I2C_SCL' },
    { number: 7, name: 'I2C_SDA' },
    { number: 8, name: 'UART_TX' },
    { number: 9, name: 'UART_RX' },
  ]
  const net = Object.fromEntries(nets.map((item) => [item.name, item.number]))
  const footprints = [
    {
      ref: 'J1',
      value: 'USB-C receptacle candidate',
      footprint: 'BoardForge_Proof:USB_C_Receptacle_ReviewRequired',
      at: { x: 8, y: 19 },
      body: { w: 5.8, h: 9 },
      pads: [
        pad('A1', 2.4, -4, 0.8, 0.8, 0, ''),
        pad('A4', 2.4, -2, 0.8, 0.8, net.VBUS, 'VBUS'),
        pad('A6', 2.4, 1, 0.55, 0.8, net.USB_D_P, 'USB_D_P'),
        pad('A7', 2.4, 3, 0.55, 0.8, net.USB_D_N, 'USB_D_N'),
      ],
    },
    {
      ref: 'U2',
      value: '3.3V regulator candidate',
      footprint: 'BoardForge_Proof:SOT_223_Regulator_ReviewRequired',
      at: { x: 22, y: 17 },
      body: { w: 5.4, h: 4.6 },
      pads: [
        pad('1', -2, 0, 0.9, 0.8, net.VBUS, 'VBUS'),
        pad('2', -2, 2, 0.9, 0.8, 0, ''),
        pad('3', 2.2, 0, 1.1, 1.6, net['+3V3'], '+3V3'),
      ],
    },
    {
      ref: 'U1',
      value: 'ESP32-S3 module candidate',
      footprint: 'BoardForge_Proof:ESP32_S3_Module_ReviewRequired',
      at: { x: 35, y: 22 },
      body: { w: 9.5, h: 11 },
      pads: [
        pad('1', -5, -3, 0.8, 0.65, net['+3V3'], '+3V3'),
        pad('2', -5, -1, 0.8, 0.65, net.GND, 'GND'),
        pad('3', -5, 1, 0.8, 0.65, net.USB_D_P, 'USB_D_P'),
        pad('4', -5, 3, 0.8, 0.65, net.USB_D_N, 'USB_D_N'),
        pad('5', 5, -1, 0.8, 0.65, net.I2C_SCL, 'I2C_SCL'),
        pad('6', 5, 1, 0.8, 0.65, net.I2C_SDA, 'I2C_SDA'),
        pad('7', 5, 3, 0.8, 0.65, net.UART_TX, 'UART_TX'),
        pad('8', 5, 5, 0.8, 0.65, net.UART_RX, 'UART_RX'),
      ],
    },
    {
      ref: 'J2',
      value: 'I2C/UART debug header',
      footprint: 'BoardForge_Proof:PinHeader_1x06_ReviewRequired',
      at: { x: 52, y: 21 },
      body: { w: 3, h: 12.5 },
      pads: [
        pad('1', -2.5, -5, 1, 1, net['+3V3'], '+3V3'),
        pad('2', -2.5, -3, 1, 1, net.GND, 'GND'),
        pad('3', -2.5, -1, 1, 1, net.I2C_SCL, 'I2C_SCL'),
        pad('4', -2.5, 1, 1, 1, net.I2C_SDA, 'I2C_SDA'),
        pad('5', -2.5, 3, 1, 1, net.UART_TX, 'UART_TX'),
        pad('6', -2.5, 5, 1, 1, net.UART_RX, 'UART_RX'),
      ],
    },
  ]
  const segments = [
    segment(10.4, 17, 20, 17, 0.45, net.VBUS),
    segment(24.2, 17, 30, 19, 0.3, net['+3V3']),
    segment(30, 19, 49.5, 16, 0.3, net['+3V3']),
    segment(30, 21, 49.5, 18, 0.3, net.GND),
    segment(10.4, 20, 30, 23, 0.2, net.USB_D_P),
    segment(10.4, 22, 30, 25, 0.2, net.USB_D_N),
    segment(40, 21, 49.5, 20, 0.22, net.I2C_SCL),
    segment(40, 23, 49.5, 22, 0.22, net.I2C_SDA),
    segment(40, 25, 49.5, 24, 0.22, net.UART_TX),
    segment(40, 27, 49.5, 26, 0.22, net.UART_RX),
  ]
  const vias = []
  return { nets, footprints, segments, vias }
}

function canSensorNodeCategoryPcbEvidence() {
  const nets = [
    { number: 0, name: '' },
    { number: 1, name: 'GND' },
    { number: 2, name: 'VBUS' },
    { number: 3, name: '+3V3' },
    { number: 4, name: 'CANH' },
    { number: 5, name: 'CANL' },
    { number: 6, name: 'I2C_SCL' },
    { number: 7, name: 'I2C_SDA' },
    { number: 8, name: 'STATUS_LED' },
  ]
  const net = Object.fromEntries(nets.map((item) => [item.name, item.number]))
  const footprints = [
    {
      ref: 'J1',
      value: 'USB-C power/service candidate',
      footprint: 'BoardForge_Proof:USB_C_Receptacle_ReviewRequired',
      at: { x: 9, y: 19 },
      body: { w: 5.8, h: 9 },
      pads: [
        pad('A1', 2.4, -4, 0.8, 0.8, net.GND, 'GND'),
        pad('A4', 2.4, -2, 0.8, 0.8, net.VBUS, 'VBUS'),
        pad('A6', 2.4, 1, 0.55, 0.8, net.I2C_SCL, 'I2C_SCL'),
        pad('A7', 2.4, 3, 0.55, 0.8, net.I2C_SDA, 'I2C_SDA'),
      ],
    },
    {
      ref: 'U1',
      value: 'low-power MCU candidate',
      footprint: 'BoardForge_Proof:QFN_MCU_ReviewRequired',
      at: { x: 29, y: 19 },
      body: { w: 8, h: 8 },
      pads: [
        pad('1', -4.4, -2, 0.75, 0.55, net['+3V3'], '+3V3'),
        pad('2', -4.4, 0, 0.75, 0.55, net.GND, 'GND'),
        pad('3', -4.4, 2, 0.75, 0.55, net.I2C_SCL, 'I2C_SCL'),
        pad('4', 4.4, -2, 0.75, 0.55, net.I2C_SDA, 'I2C_SDA'),
        pad('5', 4.4, 0, 0.75, 0.55, net.CANH, 'CANH'),
        pad('6', 4.4, 2, 0.75, 0.55, net.CANL, 'CANL'),
        pad('7', 0, 4.4, 0.75, 0.55, net.STATUS_LED, 'STATUS_LED'),
      ],
    },
    {
      ref: 'U2',
      value: 'CAN transceiver candidate',
      footprint: 'BoardForge_Proof:SOIC_8_CAN_ReviewRequired',
      at: { x: 43, y: 19 },
      body: { w: 5, h: 6.4 },
      pads: [
        pad('1', -2.9, -2, 0.7, 0.55, net.CANH, 'CANH'),
        pad('2', -2.9, 2, 0.7, 0.55, net.CANL, 'CANL'),
        pad('3', 2.9, -2, 0.7, 0.55, net['+3V3'], '+3V3'),
        pad('4', 2.9, 2, 0.7, 0.55, net.GND, 'GND'),
      ],
    },
    {
      ref: 'J2',
      value: 'CAN field connector',
      footprint: 'BoardForge_Proof:Terminal_1x03_ReviewRequired',
      at: { x: 55, y: 19 },
      body: { w: 4, h: 11 },
      pads: [
        pad('1', -2, -3, 1.1, 1.1, net.CANH, 'CANH'),
        pad('2', -2, 0, 1.1, 1.1, net.CANL, 'CANL'),
        pad('3', -2, 3, 1.1, 1.1, net.GND, 'GND'),
      ],
    },
  ]
  const segments = [
    segment(11.4, 15, 15.0, 12.6, 0.35, net.GND),
    segment(11.4, 17, 15.4, 17.0, 0.4, net.VBUS),
    segment(11.4, 20, 15.2, 20.0, 0.22, net.I2C_SCL),
    segment(11.4, 22, 15.2, 22.0, 0.22, net.I2C_SDA),
    segment(24.6, 17, 21.2, 14.4, 0.3, net['+3V3']),
    segment(24.6, 19, 21.1, 19.0, 0.35, net.GND),
    segment(24.6, 21, 21.2, 23.1, 0.22, net.I2C_SCL),
    segment(33.4, 17, 36.0, 14.6, 0.22, net.I2C_SDA),
    segment(29.0, 23.4, 29.0, 27.2, 0.22, net.STATUS_LED),
    segment(33.4, 19, 40.1, 17, 0.22, net.CANH),
    segment(33.4, 21, 40.1, 21, 0.22, net.CANL),
    segment(45.9, 17, 49.3, 17.0, 0.3, net['+3V3']),
    segment(45.9, 21, 49.3, 21.0, 0.35, net.GND),
    segment(40.1, 17, 43.2, 14.4, 0.24, net.CANH),
    segment(43.2, 14.4, 50.5, 14.4, 0.24, net.CANH),
    segment(50.5, 14.4, 53.0, 16.0, 0.24, net.CANH),
    segment(40.1, 21, 43.2, 24.0, 0.24, net.CANL),
    segment(43.2, 24.0, 50.3, 24.0, 0.24, net.CANL),
    segment(50.3, 24.0, 53.0, 19.0, 0.24, net.CANL),
    segment(53.0, 22.0, 55.6, 24.0, 0.35, net.GND),
    segment(15.0, 12.6, 10.0, 12.6, 0.35, net.GND, 'B.Cu'),
    segment(10.0, 12.6, 10.0, 29.0, 0.35, net.GND, 'B.Cu'),
    segment(10.0, 29.0, 21.1, 19.0, 0.35, net.GND, 'B.Cu'),
    segment(21.1, 19.0, 49.3, 26.0, 0.35, net.GND, 'B.Cu'),
    segment(49.3, 26.0, 49.3, 21.0, 0.35, net.GND, 'B.Cu'),
    segment(49.3, 21.0, 55.6, 24.0, 0.35, net.GND, 'B.Cu'),
    segment(21.2, 14.4, 49.3, 17.0, 0.3, net['+3V3'], 'B.Cu'),
    segment(15.2, 20.0, 20.0, 20.0, 0.22, net.I2C_SCL),
    segment(20.0, 20.0, 21.2, 23.1, 0.22, net.I2C_SCL),
    segment(15.2, 22.0, 16.8, 8.0, 0.22, net.I2C_SDA, 'B.Cu'),
    segment(16.8, 8.0, 36.0, 8.0, 0.22, net.I2C_SDA, 'B.Cu'),
    segment(36.0, 8.0, 36.0, 14.6, 0.22, net.I2C_SDA, 'B.Cu'),
  ]
  const vias = [
    via(15.0, 12.6, net.GND),
    via(21.1, 19.0, net.GND),
    via(49.3, 21.0, net.GND),
    via(55.6, 24.0, net.GND),
    via(21.2, 14.4, net['+3V3']),
    via(49.3, 17.0, net['+3V3']),
    via(15.2, 22.0, net.I2C_SDA),
    via(36.0, 14.6, net.I2C_SDA),
  ]
  return { nets, footprints, segments, vias }
}

function pad(number, x, y, w, h, netNumber, netName) {
  return { number, x, y, w, h, netNumber, netName }
}

function segment(x1, y1, x2, y2, width, netNumber, layer = 'F.Cu') {
  return { start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, width, layer, netNumber }
}

function via(x, y, net) {
  return { x, y, size: 0.8, drill: 0.35, net }
}

function renderCategoryPcbEvidence(evidence) {
  return [
    '  (property "BoardForgeCategoryEvidence" "review-required pcb placement/routing evidence; not manufacturing ready")',
    ...evidence.nets.filter((net) => net.number > 0).map((net) => `  (net ${net.number} "${escapePcb(net.name)}")`),
    ...evidence.footprints.map(renderProofFootprint),
    ...evidence.segments.map(renderProofSegment),
    ...evidence.vias.map(renderProofVia),
  ].join('\n')
}

function renderProofFootprint(footprint) {
  const x0 = -footprint.body.w / 2
  const x1 = footprint.body.w / 2
  const y0 = -footprint.body.h / 2
  const y1 = footprint.body.h / 2
  const pads = footprint.pads.map((item) => `    (pad "${escapePcb(item.number)}" smd roundrect (at ${mm(item.x)} ${mm(item.y)} 0) (size ${mm(item.w)} ${mm(item.h)}) (layers "F.Cu" "F.Paste" "F.Mask") (roundrect_rratio 0.2) (net ${item.netNumber} "${escapePcb(item.netName)}") (uuid "${stableUuid(`${footprint.ref}-pad-${item.number}`)}"))`).join('\n')
  return `  (footprint "${escapePcb(footprint.footprint)}" (layer "F.Cu")
    (uuid "${stableUuid(`${footprint.ref}-footprint`)}")
    (at ${mm(footprint.at.x)} ${mm(footprint.at.y)} 0)
    (property "Reference" "${escapePcb(footprint.ref)}" (at 0 ${mm(y0 - 1.1)} 0) (layer "F.SilkS") (uuid "${stableUuid(`${footprint.ref}-ref`)}") (effects (font (size 0.8 0.8) (thickness 0.12))))
    (property "Value" "${escapePcb(footprint.value)}" (at 0 ${mm(y1 + 1.1)} 0) (layer "F.Fab") hide (uuid "${stableUuid(`${footprint.ref}-value`)}") (effects (font (size 0.7 0.7) (thickness 0.1))))
    (fp_rect (start ${mm(x0)} ${mm(y0)}) (end ${mm(x1)} ${mm(y1)}) (stroke (width 0.12) (type solid)) (fill none) (layer "F.SilkS") (uuid "${stableUuid(`${footprint.ref}-silk`)}"))
    (fp_rect (start ${mm(x0 - 0.35)} ${mm(y0 - 0.35)}) (end ${mm(x1 + 0.35)} ${mm(y1 + 0.35)}) (stroke (width 0.05) (type solid)) (fill none) (layer "F.CrtYd") (uuid "${stableUuid(`${footprint.ref}-courtyard`)}"))
${pads}
  )`
}

function renderProofSegment(item) {
  return `  (segment (start ${mm(item.start.x)} ${mm(item.start.y)}) (end ${mm(item.end.x)} ${mm(item.end.y)}) (width ${mm(item.width)}) (layer "${item.layer}") (net ${item.netNumber}) (uuid "${stableUuid(`seg-${item.netNumber}-${item.start.x}-${item.start.y}-${item.end.x}-${item.end.y}`)}"))`
}

function renderProofVia(item) {
  return `  (via (at ${mm(item.x)} ${mm(item.y)}) (size ${mm(item.size)}) (drill ${mm(item.drill)}) (layers "F.Cu" "B.Cu") (net ${item.net}) (uuid "${stableUuid(`via-${item.net}-${item.x}-${item.y}`)}"))`
}

function renderCategoryPcbEvidenceMarkdown(report) {
  return `# BoardForge Category PCB Evidence Report

Status: ${report.status}

This board now contains review-required PCB category evidence: placed expected refs, named nets, and routed copper segments${report.viaCount ? ', including vias' : ''}. It is still not manufacturing-ready because selected manufacturer symbols, pin maps, footprint bindings, and sourcing evidence are not proven yet.

## Evidence

- Placed refs: ${report.placedRefs.join(', ')}
- Named nets: ${report.nets.join(', ')}
- Tracks: ${report.trackCount}
- Vias: ${report.viaCount}

## Limitations

${report.limitations.map((item) => `- ${item}`).join('\n')}
`
}

function stableUuid(value) {
  const hex = createHash('sha256').update(`boardforge-real-proof:${value}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

function mm(value) {
  return Number(value).toFixed(3).replace(/\.?0+$/, '')
}

function escapePcb(value) {
  return String(value).replace(/"/g, '\\"')
}

async function writeCategorySchematic({ board, projectDir }) {
  const schFile = findFirstExisting(projectDir, '.kicad_sch')
  if (!schFile || !board.bom.length) {
    return {
      status: board.bom.length ? 'SCHEMATIC_FILE_MISSING' : 'NOT_APPLICABLE_OUTLINE_ONLY',
      symbolCount: 0,
      reason: board.bom.length ? 'The outline workflow did not produce a .kicad_sch file.' : 'Outline-only proof has no requested electrical BOM.',
    }
  }

  const components = categorySchematicComponents(board)
  const nets = [...new Set(components.flatMap((component) => Object.values(component.pinMap || {}).filter(Boolean)))]
    .map((name) => ({ name }))
  const model = generateSchematicModel(
    { name: board.name },
    components,
    { nets, emitConnectivityLabels: true },
  )
  await writeFile(schFile, kicadSchematicFromModel({ name: board.name }, model), 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_Category_Schematic_Model.json'), JSON.stringify({
    schema: 'boardforge.category-schematic-model.real-proof.v1',
    status: 'SYMBOL_GRAPH_GENERATED_REVIEW_REQUIRED',
    model,
    limitations: [
      'Named-net labels and embedded BoardForge connector symbols establish a parseable KiCad symbol graph.',
      'Component identity, footprint binding, electrical pin types, and ERC-clean connectivity remain review-required until a verified manufacturer part is selected.',
    ],
  }, null, 2), 'utf8')
  return {
    status: 'SYMBOL_GRAPH_GENERATED_REVIEW_REQUIRED',
    schematicFile: schFile,
    symbolCount: model.symbols.length,
    netCount: model.nets.length,
    componentRefs: model.symbols.map((symbol) => symbol.ref),
    limitations: [
      'The category graph uses embedded BoardForge connector symbols to avoid pretending unresolved manufacturer symbols are verified.',
      'Manufacturing remains blocked until exact symbol, pin map, footprint, and selected MPN evidence agree.',
    ],
  }
}

function categorySchematicComponents(board) {
  const pinMaps = categorySchematicPinMaps(board)
  return board.bom.map((row, index) => {
    const pinMap = pinMaps[row.ref] || fallbackCategoryPinMap(index)
    return {
      ref: row.ref,
      value: row.value,
      group: 'CATEGORY_REVIEW_COMPONENT',
      role: row.role,
      symbol: `BoardForge:BF_CONN_${Math.max(1, Object.keys(pinMap).length)}`,
      footprint: 'BoardForge:REVIEW_REQUIRED_FOOTPRINT_BINDING',
      pinMap,
      assetSource: 'BoardForge category proof template',
      assetConfidence: 'ASSUMED_REVIEW_REQUIRED',
      reviewNotes: `${row.verificationStatus}; exact manufacturer symbol, pin map, and footprint must be approved before PCB sync.`,
    }
  })
}

function categorySchematicPinMaps(board) {
  const maps = {
    'usb-c-esp32-sensor': {
      U1: { 1: 'GND', 2: '3V3', 3: 'USB_DP', 4: 'USB_DN', 5: 'I2C_SCL', 6: 'I2C_SDA', 7: 'UART_TX', 8: 'UART_RX' },
      J1: { 1: 'GND', 2: 'VUSB', 3: 'USB_DP', 4: 'USB_DN', 5: 'CC1', 6: 'CC2' },
      U2: { 1: 'VUSB', 2: 'GND', 3: '3V3' },
      J2: { 1: 'GND', 2: '3V3', 3: 'I2C_SCL', 4: 'I2C_SDA', 5: 'UART_TX', 6: 'UART_RX' },
    },
    'can-sensor-node': {
      U1: { 1: 'GND', 2: '3V3', 3: 'CAN_TX', 4: 'CAN_RX', 5: 'I2C_SCL', 6: 'I2C_SDA' },
      U2: { 1: 'GND', 2: '3V3', 3: 'CAN_TX', 4: 'CAN_RX', 5: 'CANH', 6: 'CANL' },
      J1: { 1: 'GND', 2: 'VUSB', 3: 'USB_DP', 4: 'USB_DN' },
      J2: { 1: 'GND', 2: 'CANH', 3: 'CANL', 4: '3V3', 5: 'I2C_SCL', 6: 'I2C_SDA' },
    },
    'poe-ethernet-sensor': {
      J1: { 1: 'CHASSIS', 2: 'ETH_TX_P', 3: 'ETH_TX_N', 4: 'ETH_RX_P', 5: 'ETH_RX_N', 6: 'POE_POS', 7: 'POE_NEG' },
      U1: { 1: 'POE_POS', 2: 'POE_NEG', 3: 'GND', 4: '5V' },
      U2: { 1: 'GND', 2: '3V3', 3: 'I2C_SCL', 4: 'I2C_SDA', 5: 'ETH_TX_P', 6: 'ETH_TX_N', 7: 'ETH_RX_P', 8: 'ETH_RX_N' },
      J2: { 1: 'GND', 2: '3V3', 3: 'I2C_SCL', 4: 'I2C_SDA' },
    },
    'odd-shaped-robotics-controller': {
      U1: { 1: 'GND', 2: '3V3', 3: 'CAN_TX', 4: 'CAN_RX', 5: 'UART_TX', 6: 'UART_RX', 7: 'SWDIO', 8: 'SWCLK', 9: 'PWM1', 10: 'PWM2' },
      U2: { 1: 'GND', 2: '3V3', 3: 'CAN_TX', 4: 'CAN_RX', 5: 'CANH', 6: 'CANL' },
      J1: { 1: 'GND', 2: 'VUSB', 3: 'USB_DP', 4: 'USB_DN' },
      J2: { 1: 'GND', 2: '3V3', 3: 'PWM1', 4: 'PWM2', 5: 'CANH', 6: 'CANL', 7: 'UART_TX', 8: 'UART_RX' },
    },
    'tiny-wearable-sensor-puck': {
      U1: { 1: 'GND', 2: 'VBAT', 3: 'I2C_SCL', 4: 'I2C_SDA', 5: 'SWDIO', 6: 'SWCLK' },
      U2: { 1: 'GND', 2: 'VBAT', 3: 'I2C_SCL', 4: 'I2C_SDA' },
      BT1: { 1: 'VBAT', 2: 'GND' },
      J1: { 1: 'GND', 2: 'VBAT', 3: 'SWDIO', 4: 'SWCLK' },
    },
    'industrial-io-board': {
      J1: { 1: 'FIELD_24V', 2: 'FIELD_GND', 3: 'DI1', 4: 'DO1' },
      U1: { 1: 'FIELD_GND', 2: 'DI1', 3: 'LOGIC_GND', 4: 'GPIO_IN' },
      K1: { 1: 'FIELD_24V', 2: 'DO1', 3: 'LOGIC_GND', 4: 'GPIO_OUT' },
      U2: { 1: 'LOGIC_GND', 2: '3V3', 3: 'GPIO_IN', 4: 'GPIO_OUT' },
    },
    'drone-stack-board': {
      J1: { 1: 'GND', 2: '5V', 3: 'USB_DP', 4: 'USB_DN' },
      J2: { 1: 'GND', 2: '5V', 3: 'UART_TX', 4: 'UART_RX', 5: 'I2C_SCL', 6: 'I2C_SDA', 7: 'CANH', 8: 'CANL' },
      P1: { 1: 'VBAT', 2: '5V', 3: 'GND' },
    },
  }
  return maps[board.id] || {}
}

function fallbackCategoryPinMap(index) {
  return index % 2 === 0
    ? { 1: 'GND', 2: '3V3', 3: 'BOARD_IO_A', 4: 'BOARD_IO_B' }
    : { 1: 'GND', 2: '3V3', 3: 'BOARD_IO_B', 4: 'BOARD_IO_A' }
}

async function inspectCategoryGenerationReadiness({ files, board, categoryPcbEvidence, categorySchematic }) {
  const scan = files.pcb ? await scanKiCadProject(files.pcb) : null
  const schText = files.sch ? await readFile(files.sch, 'utf8') : ''
  const symbolInstances = countSchematicSymbolInstances(schText)
  const manifestTextNotes = [...schText.matchAll(/\(text\s+"([^"]+)"/g)].map((match) => match[1])
  const nonHoleFootprints = (scan?.footprints || []).filter((footprint) => {
    const ref = String(footprint.ref || '')
    const fp = String(footprint.footprint || '')
    return !/^H\d+/i.test(ref) && !fp.includes('MountingHole')
  })
  const tracks = scan?.tracks || []
  const vias = scan?.vias || []
  const nets = (scan?.nets || []).filter((net) => net.name && net.name !== '')
  const expectedRefs = (board.bom || []).map((row) => row.ref)
  const placedRefs = new Set(nonHoleFootprints.map((footprint) => footprint.ref))
  const missingPlacedRefs = expectedRefs.filter((ref) => !placedRefs.has(ref))
  const outlineOnly = board.bom.length === 0
  const checks = [
    categoryCheck('schematic_file_exists', Boolean(files.sch), files.sch || 'missing'),
    categoryCheck('schematic_has_symbol_instances', outlineOnly || symbolInstances > 0, `${symbolInstances} symbol instances`),
    categoryCheck('schematic_named_net_labels_present', outlineOnly || (categorySchematic?.netCount || 0) > 0, `${categorySchematic?.netCount || 0} named net labels generated`),
    categoryCheck('schematic_not_text_manifest_only', outlineOnly || symbolInstances > 0 || manifestTextNotes.length === 0, `${manifestTextNotes.length} schematic text notes`),
    categoryCheck('expected_bom_refs_placed', outlineOnly || missingPlacedRefs.length === 0, missingPlacedRefs.length ? `missing ${missingPlacedRefs.join(', ')}` : 'all expected refs placed'),
    categoryCheck('non_hole_footprints_present', outlineOnly || nonHoleFootprints.length > 0, `${nonHoleFootprints.length} non-hole footprints`),
    categoryCheck('electrical_nets_present', outlineOnly || nets.length > 1, `${nets.length} named nets`),
    categoryCheck('routed_copper_present', outlineOnly || tracks.length > 0, `${tracks.length} tracks`),
    categoryCheck(
      'via_strategy_recorded',
      outlineOnly || board.layers <= 2 || vias.length > 0 || tracks.length > 0,
      vias.length > 0 ? `${vias.length} interlayer vias` : tracks.length > 0 ? 'single-layer route evidence; no interlayer transition required' : 'no routing evidence yet',
    ),
  ]
  const blockers = []
  if (!outlineOnly && symbolInstances === 0) blockers.push(categoryGenerationBlocker('schematic_generation', 'SCHEMATIC_SYMBOL_GRAPH_NOT_GENERATED', 'The .kicad_sch contains no real symbol instances for the requested board category.', 'Generate real KiCad symbols and pin-connected nets for the category BOM before ERC can prove electrical intent.'))
  if (!outlineOnly && categorySchematic?.status !== 'SYMBOL_GRAPH_GENERATED_REVIEW_REQUIRED') blockers.push(categoryGenerationBlocker('schematic_generation', 'CATEGORY_SCHEMATIC_WRITE_FAILED', categorySchematic?.reason || 'The category schematic writer did not produce a reviewable symbol graph.', 'Fix the category schematic writer before treating the PCB evidence as a real board workflow.'))
  if (!outlineOnly && nonHoleFootprints.length === 0) blockers.push(categoryGenerationBlocker('placement_generation', 'CATEGORY_COMPONENTS_NOT_PLACED', 'The .kicad_pcb contains mounting holes/Edge.Cuts but no placed non-hole category components.', 'Bind verified footprints, place expected refs inside the outline, and validate courtyard/edge clearance.'))
  if (!outlineOnly && tracks.length === 0) blockers.push(categoryGenerationBlocker('routing_generation', 'ROUTED_NETS_NOT_GENERATED', 'The .kicad_pcb has no routed copper tracks for requested category nets.', 'Create endpoint-aware routed nets after component placement, then rerun KiCad DRC.'))
  if (!outlineOnly && missingPlacedRefs.length) blockers.push(categoryGenerationBlocker('placement_generation', 'EXPECTED_REFS_MISSING_FROM_PCB', `${missingPlacedRefs.length} expected BOM refs are not present as placed footprints: ${missingPlacedRefs.join(', ')}.`, 'Add category-specific footprint binding and placement for every expected ref.'))
  if (!outlineOnly && categoryPcbEvidence?.status === 'NOT_APPLIED') {
    blockers.push(categoryGenerationBlocker(
      'placement_generation',
      board.id === 'tiny-wearable-sensor-puck' ? 'CATEGORY_LAYOUT_ENVELOPE_TOO_SMALL' : 'CATEGORY_PCB_EVIDENCE_NOT_IMPLEMENTED',
      categoryPcbEvidence.reason,
      board.id === 'tiny-wearable-sensor-puck'
        ? 'Generate a compact topology sized for the puck, increase the board envelope, increase layer count, or reduce package count before placement and routing.'
        : 'Implement a category-specific schematic, footprint, placement, and routing topology before claiming category PCB evidence.',
    ))
  }
  const passed = checks.every((item) => item.pass)
  return {
    schema: 'boardforge.category-generation-readiness.real-proof.v1',
    boardId: board.id,
    status: outlineOnly ? 'OUTLINE_ONLY_BOARD_NO_CATEGORY_COMPONENTS_REQUIRED' : passed ? 'CATEGORY_GENERATION_EVIDENCE_PRESENT' : 'CATEGORY_GENERATION_BLOCKED',
    summary: {
      expectedBomRefs: expectedRefs.length,
      schematicSymbolInstances: symbolInstances,
      schematicNamedNets: categorySchematic?.netCount || 0,
      schematicTextManifestNotes: manifestTextNotes.length,
      nonHoleFootprints: nonHoleFootprints.length,
      nets: nets.length,
      tracks: tracks.length,
      vias: vias.length,
      missingPlacedRefs,
    },
    checks,
    blockers,
    noFakeClaims: true,
  }
}

function countSchematicSymbolInstances(content) {
  return [...content.matchAll(/\(symbol\s*\n\s*\(lib_id\s+"/g)].length
}

async function runOptionalKiCadReports({ projectDir, files, kicad }) {
  const reportDir = path.join(projectDir, 'reports')
  await mkdir(reportDir, { recursive: true })
  const base = {
    erc: { status: 'NOT_RUN', reason: 'kicad-cli unavailable or schematic missing', errors: null, warnings: null, reportFile: null },
    drc: { status: 'NOT_RUN', reason: 'kicad-cli unavailable or PCB missing', errors: null, warnings: null, reportFile: null },
  }
  if (!kicad.available) {
    base.erc.reason = kicad.reason
    base.drc.reason = kicad.reason
    return base
  }
  const ercTask = files.sch ? async () => summarizeKiCadReport(await runErc({ schFile: files.sch, outputFile: path.join(reportDir, 'erc.json'), kicadCliPath: kicad.path })) : null
  const drcTask = files.pcb ? async () => {
    const outputFile = path.join(reportDir, 'drc.json')
    const initial = await runDrc({ pcbFile: files.pcb, outputFile, kicadCliPath: kicad.path })
    // KiCad may persist zone/board normalization when --save-board is used. If
    // that first pass reports errors, inspect the persisted PCB without another
    // mutation so the recorded result always describes the file BoardForge kept.
    if ((initial.issueCounts?.errors || 0) > 0) {
      const persisted = await runDrc({ pcbFile: files.pcb, outputFile, kicadCliPath: kicad.path, saveBoard: false })
      return {
        ...summarizeKiCadReport(persisted),
        initialErrorsBeforeKiCadSave: initial.issueCounts.errors,
        rerunAfterKiCadSave: true,
      }
    } else {
      return summarizeKiCadReport(initial)
    }
  } : null
  const validation = await runIndependentValidationTasks({ ercTask, drcTask })
  if (validation.erc) base.erc = validation.erc
  if (validation.drc) base.drc = validation.drc
  return base
}

export async function runIndependentValidationTasks({ ercTask, drcTask }) {
  const [erc, drc] = await Promise.all([ercTask?.() ?? null, drcTask?.() ?? null])
  return { erc, drc }
}

function summarizeKiCadReport(report) {
  return {
    status: report.status,
    errors: report.issueCounts?.errors ?? null,
    warnings: report.issueCounts?.warnings ?? null,
    exitCode: report.exitCode,
    reportFile: report.reportFile,
  }
}

function collectKiCadFiles(projectDir) {
  const candidates = {
    pro: findFirstExisting(projectDir, '.kicad_pro'),
    sch: findFirstExisting(projectDir, '.kicad_sch'),
    pcb: findFirstExisting(projectDir, '.kicad_pcb'),
  }
  return candidates
}

function findFirstExisting(dir, suffix) {
  const projectName = path.basename(dir).replace(/[^a-zA-Z0-9_-]+/g, '-')
  const likely = path.join(dir, `${projectName}${suffix}`)
  if (existsSync(likely)) return likely
  // The outline workflow derives names from the seed id, so fall back to the known prefix pattern.
  const guessed = path.join(dir, `BF-REAL-${projectName.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-REV-A${suffix}`)
  if (existsSync(guessed)) return guessed
  return null
}

function buildBoardBrief({ board, seed, outlineResult, validationReports, categoryReadiness }) {
  return {
    schema: 'boardforge.board-brief.real-proof.v1',
    boardId: board.id,
    boardName: board.name,
    prompt: board.prompt,
    intent: board.intent,
    layerTarget: board.layers,
    outlinePreset: board.preset,
    dimensionsMm: { width: board.widthMm, height: board.heightMm },
    mechanical: {
      points: seed.outline,
      holes: seed.holes,
      connectorEdges: seed.connectorEdges,
      keepouts: seed.keepouts,
      constraints: seed.constraints,
    },
    electricalScope: board.bom.length ? 'candidate BOM/intake only; full schematic synthesis requires plugin category engine follow-up' : 'outline-only custom board proof',
    categoryGeneration: categoryReadiness.summary,
    validation: {
      outline: outlineResult.validation.status,
      erc: validationReports.erc.status,
      drc: validationReports.drc.status,
    },
    noFakeClaims: true,
  }
}

function buildMechanicalConstraints({ board, seed, outlineResult }) {
  return {
    schema: 'boardforge.mechanical-constraints.real-proof.v1',
    boardId: board.id,
    units: 'mm',
    dimensionsMm: { width: board.widthMm, height: board.heightMm },
    layerCount: board.layers,
    outlinePreset: board.preset,
    outlinePoints: seed.outline,
    mountingHoles: seed.holes,
    connectorEdges: seed.connectorEdges,
    keepouts: seed.keepouts,
    complianceWarnings: board.complianceWarnings || [],
    validation: {
      status: outlineResult.validation.status,
      edgeCutsClosed: outlineResult.validation.edgeCuts.closed,
      selfIntersectionCount: outlineResult.validation.edgeCuts.selfIntersections.length,
      holeCount: seed.holes.length,
    },
  }
}

function buildOutlineValidationReport({ board, outlineResult }) {
  const edgeCuts = outlineResult.validation.edgeCuts || { closed: false, selfIntersections: [], segmentCount: 0 }
  const holes = outlineResult.validation.holes || outlineResult.seed?.holes || []
  return {
    schema: 'boardforge.outline-validation.real-proof.v1',
    boardId: board.id,
    status: outlineResult.validation.status,
    valid: outlineResult.validation.valid,
    edgeCuts,
    holes,
    blockers: outlineResult.validation.blockers || [],
    noFakeClaims: true,
  }
}

function buildRouteabilityReport({ board, outlineResult }) {
  return {
    schema: 'boardforge.routeability.real-proof.v1',
    boardId: board.id,
    status: outlineResult.validation.routeability.status || 'ROUTEABILITY_RECORDED',
    score: outlineResult.validation.routeability.score,
    density: board.id.includes('tiny') || board.id.includes('drone') ? 'dense' : 'compact',
    explanation: 'Browser/outline-level routeability only. Full routed-net evidence is intentionally not claimed by this proof harness.',
    limitations: ['no component placement proof', 'no endpoint-routed nets proof', 'no manufacturing ZIP gate pass'],
  }
}

function buildManufacturingRiskReport({ board, outlineResult, validationReports }) {
  const risks = []
  if (!outlineResult.validation.valid) risks.push('outline validation is not clean')
  if ((validationReports.erc.errors || 0) > 0) risks.push('ERC errors remain')
  if ((validationReports.drc.errors || 0) > 0) risks.push('DRC errors remain')
  if (board.bom.length) risks.push('candidate BOM is not live-stock verified')
  risks.push('full placement/routing evidence is not generated by this proof harness')
  return {
    schema: 'boardforge.manufacturing-risk.real-proof.v1',
    boardId: board.id,
    status: risks.length ? 'MANUFACTURING_RISK_REVIEW_REQUIRED' : 'MANUFACTURING_RISK_LOW',
    riskLevel: risks.length ? 'review_required' : 'low',
    risks,
    complianceWarnings: board.complianceWarnings || [],
    exportGate: {
      manufacturingZipAllowed: false,
      reason: 'No ZIP is created until schematic, placement, routing, ERC/DRC, and sourcing evidence are clean enough.',
    },
  }
}

function buildHealthReport({ board, outlineResult, files, validationReports, categoryReadiness }) {
  const validation = outlineResult.validation
  const edgeCuts = validation.edgeCuts || { closed: false, selfIntersections: [] }
  const detailedHoles = Array.isArray(validation.holes) ? validation.holes : []
  const holeIssueText = [...(validation.blockers || []), ...(validation.warnings || [])]
    .map((item) => String(item).toLowerCase())
    .filter((item) => item.includes('hole'))
  const holesInside = detailedHoles.length
    ? detailedHoles.every((hole) => hole.inside !== false)
    : holeIssueText.length === 0
  const holesDetail = detailedHoles.length
    ? `${detailedHoles.filter((hole) => hole.inside === false).length} holes outside`
    : `${outlineResult.seed?.holes?.length || 0} seed holes; no hole blockers reported`
  const checks = [
    check('kicad_pro_exists', Boolean(files.pro), files.pro || 'missing'),
    check('kicad_pcb_exists', Boolean(files.pcb), files.pcb || 'missing'),
    check('kicad_sch_exists', Boolean(files.sch), files.sch || 'missing'),
    check('edgecuts_closed', edgeCuts.closed, validation.status),
    check('edgecuts_no_self_intersection', (edgeCuts.selfIntersections || []).length === 0, `${(edgeCuts.selfIntersections || []).length} intersections`),
    check('holes_inside_outline', holesInside, holesDetail),
    check('erc_recorded', validationReports.erc.status !== 'NOT_RUN', validationReports.erc.reason || validationReports.erc.status),
    check('drc_recorded', validationReports.drc.status !== 'NOT_RUN', validationReports.drc.reason || validationReports.drc.status),
    check('category_generation_readiness_recorded', Boolean(categoryReadiness), categoryReadiness.status),
    check('category_generation_evidence_present', board.bom.length === 0 || categoryReadiness.status === 'CATEGORY_GENERATION_EVIDENCE_PRESENT', categoryReadiness.blockers.map((item) => item.code).join(', ') || categoryReadiness.status),
  ]
  const blockers = checks.filter((item) => !item.pass && !['erc_recorded', 'drc_recorded'].includes(item.id))
  return {
    schema: 'boardforge.project-health.real-proof.v1',
    boardId: board.id,
    status: blockers.length ? 'PROJECT_HEALTH_BLOCKED' : 'PROJECT_HEALTH_ENGINEERING_REVIEW',
    checks,
    healthScore: Math.max(0, Math.round((checks.filter((item) => item.pass).length / checks.length) * 100)),
  }
}

function buildReviewReport({ board, outlineResult, validationReports, health, categoryReadiness }) {
  return {
    schema: 'boardforge.board-review.real-proof.v1',
    boardId: board.id,
    status: health.status === 'PROJECT_HEALTH_BLOCKED' ? 'BOARD_REVIEW_BLOCKED' : 'BOARD_REVIEW_ENGINEERING_REVIEW_REQUIRED',
    summary: `${board.name} generated as a real KiCad outline project with honest category limitations.`,
    evidence: {
      outlineStatus: outlineResult.validation.status,
      routeabilityScore: outlineResult.validation.routeability.score,
      erc: validationReports.erc,
      drc: validationReports.drc,
      categoryGeneration: categoryReadiness.summary,
    },
    humanReviewRequired: true,
    reviewItems: [
      'Replace candidate BOM rows with verified manufacturer part numbers before assembly release.',
      ...categoryReadiness.blockers.map((item) => `${item.code}: ${item.reason}`),
      ...(board.complianceWarnings || []),
    ],
  }
}

function buildMakeManufacturableReport({ board, outlineResult, validationReports, health, categoryReadiness }) {
  const blockingReasons = []
  if (!outlineResult.validation.valid) blockingReasons.push('outline validation is not clean')
  if (validationReports.drc.errors > 0) blockingReasons.push('KiCad DRC has errors')
  if (validationReports.erc.errors > 0) blockingReasons.push('KiCad ERC has errors')
  blockingReasons.push(...categoryReadiness.blockers.map((item) => item.reason))
  return {
    schema: 'boardforge.make-manufacturable.real-proof.v1',
    boardId: board.id,
    status: blockingReasons.length ? 'MANUFACTURABLE_ENGINEERING_REVIEW_REQUIRED' : 'MANUFACTURABLE_READY',
    healthScore: health.healthScore,
    blockingReasons,
    safeAutomaticActions: ['generate_valid_edgecuts_project', 'record_mechanical_constraints', 'create_truthful_manufacturing_gate'],
    unsafeWithoutReview: ['create_orderable_manufacturing_zip', 'claim_PoE_compliance', 'claim_assembly_ready_sourcing'],
  }
}

function buildMakeSourcableReport({ board }) {
  const rows = board.bom || []
  return {
    schema: 'boardforge.make-sourcable.real-proof.v1',
    boardId: board.id,
    status: 'SOURCING_REVIEW_REQUIRED',
    bomRows: rows.length,
    noFakeStock: true,
    rows: rows.map((row) => ({
      ...row,
      sourcingStatus: 'NOT_LIVE_CHECKED',
      reason: 'Proof runner records candidate BOM intent only; live Mouser/DigiKey lookup must verify stock and lifecycle before assembly claims.',
    })),
  }
}

async function buildSchematicAssetBindingReport({ board, files, validationReports, categorySchematic }) {
  if (!board.bom.length) {
    return {
      schema: 'boardforge.schematic-asset-binding.real-proof.v1',
      boardId: board.id,
      status: 'NOT_APPLICABLE_OUTLINE_ONLY',
      manufacturingAllowed: false,
      components: [],
      libraries: [],
      reason: 'Outline-only proof has no BOM-backed symbols or footprints to bind.',
    }
  }
  const [schematicText, pcbText] = await Promise.all([
    files.sch ? readFile(files.sch, 'utf8').catch(() => '') : '',
    files.pcb ? readFile(files.pcb, 'utf8').catch(() => '') : '',
  ])
  const libraries = diagnoseMissingKiCadLibraries({ pcbText, schematicText, drcReport: null })
  const requestedComponents = board.bom.map((row) => ({
    ref: row.ref,
    value: row.value,
    group: categoryAssetGroup(board.id, row.ref),
  }))
  const componentDatabase = await buildComponentDatabase({
    workspace: REPO_ROOT,
    input: {
      components: requestedComponents,
      nets: categorySchematic?.netCount ? categorySchematicNets(board) : [],
      strict: true,
    },
  })
  const resolvedCandidates = new Map((componentDatabase.components || []).map((component) => [component.ref, component]))
  const components = board.bom.map((row) => {
    const candidate = resolvedCandidates.get(row.ref)
    return {
    ref: row.ref,
    value: row.value,
    group: candidate?.group || null,
    requestedRole: row.role,
    requestedVerification: row.verificationStatus,
    symbol: 'BoardForge:BF_CONN_* embedded review symbol',
    footprint: 'BoardForge proof footprint geometry',
    pinMap: 'category template net map',
    status: 'REVIEW_REQUIRED',
    reason: 'No selected manufacturer part, verified pin equivalence, or production footprint binding exists yet.',
    catalogCandidate: candidate ? {
      mpn: candidate.mpn || null,
      lcsc: candidate.lcsc || null,
      package: candidate.package || null,
      symbol: candidate.symbol?.libId || null,
      footprint: candidate.footprint?.libId || null,
      model3d: candidate.model3d?.path || null,
      libraryAssetStatus: candidate.assetStatus || 'missing_assets',
      pinMapBindingStatus: candidate.bindingStatus || 'not_checked',
      pinMapCompatibilityScore: candidate.bindingCompatibilityScore ?? null,
      candidateOnly: true,
      selectionWarning: 'This is a BoardForge catalog candidate resolved against locally installed KiCad libraries. It is not a user-approved selected production part and does not replace the embedded review graph or proof PCB geometry.',
    } : null,
  }
  })
  const candidateSummary = {
    requested: components.length,
    locallyResolvedSymbolAndFootprint: components.filter((component) => component.catalogCandidate?.symbol && component.catalogCandidate?.footprint).length,
    locallyResolved3dModel: components.filter((component) => component.catalogCandidate?.model3d).length,
    pinMapReady: components.filter((component) => component.catalogCandidate?.pinMapBindingStatus === 'binding_ready').length,
    pinMapWarningsOrErrors: components.filter((component) => component.catalogCandidate && component.catalogCandidate.pinMapBindingStatus !== 'binding_ready').length,
  }
  return {
    schema: 'boardforge.schematic-asset-binding.real-proof.v1',
    boardId: board.id,
    status: 'ASSET_BINDINGS_REVIEW_REQUIRED',
    manufacturingAllowed: false,
    schematicGraph: {
      status: categorySchematic?.status || 'NOT_GENERATED',
      symbols: categorySchematic?.symbolCount || 0,
      namedNets: categorySchematic?.netCount || 0,
      erc: validationReports.erc,
    },
    components,
    catalogCandidateSummary: candidateSummary,
    libraries,
    requirements: [
      'Select a manufacturer part number for every BOM row.',
      'Resolve the exact KiCad symbol and footprint from an approved local library.',
      'Verify symbol pins match the selected footprint pad numbers.',
      'Resolve a compatible 3D model before claiming physical assembly preview completeness.',
      'Run live sourcing and an assembly package check before manufacturing export.',
    ],
    noFakeClaims: true,
  }
}

function categorySchematicNets(board) {
  const pinMaps = categorySchematicPinMaps(board)
  return [...new Set(Object.values(pinMaps).flatMap((pinMap) => Object.values(pinMap)))].map((name) => ({ name }))
}

function categoryAssetGroup(boardId, ref) {
  const groups = {
    'usb-c-esp32-sensor': { U1: 'ESP32_S3', J1: 'USB', U2: 'REGULATOR', J2: 'SENSOR_CONNECTOR' },
    'can-sensor-node': { U1: 'ESP32_S3', U2: 'CAN_TRANSCEIVER', J1: 'USB', J2: 'POWER_INPUT' },
    'poe-ethernet-sensor': { J1: 'RJ45', U1: 'POE_FRONT_END', U2: 'ESP32_S3', J2: 'SENSOR_CONNECTOR' },
    'odd-shaped-robotics-controller': { U1: 'ESP32_S3', U2: 'CAN_TRANSCEIVER', J1: 'USB', J2: 'ESC_CONNECTOR' },
    'tiny-wearable-sensor-puck': { U2: 'IMU', BT1: 'POWER_INPUT' },
    'industrial-io-board': { J1: 'TERMINAL_BLOCK', U1: 'ISOLATOR', K1: 'RELAY_OR_DRIVER', U2: 'ESP32_S3' },
    'drone-stack-board': { J1: 'USB', J2: 'ESC_CONNECTOR', P1: 'POWER_INPUT' },
  }
  return groups[boardId]?.[ref] || 'UNRESOLVED_CATEGORY_COMPONENT'
}

function buildBlockers({ board, outlineResult, validationReports, health, categoryReadiness, assetBinding }) {
  const items = []
  if (!outlineResult.validation.valid) items.push(blocker('outline_generation', 'OUTLINE_VALIDATION_BLOCKED', outlineResult.validation.status, 'Run outline auto-fix or regenerate shape.'))
  if (validationReports.erc.errors > 0) items.push(blocker('schematic_generation', 'ERC_ERRORS', `${validationReports.erc.errors} ERC errors`, 'Fix schematic symbol graph and rerun ERC.'))
  if (validationReports.drc.errors > 0) items.push(blocker('pcb_validation', 'DRC_ERRORS', `${validationReports.drc.errors} DRC errors`, 'Run DRC-guided repair before export.'))
  if (board.bom.length) items.push(blocker('sourcing', 'BOM_NOT_LIVE_VERIFIED', 'Candidate BOM rows are not live-stock verified.', 'Run Make Sourcable with configured supplier credentials.'))
  if (board.bom.length && assetBinding?.status === 'ASSET_BINDINGS_REVIEW_REQUIRED') {
    items.push(blocker('asset_binding', 'UNVERIFIED_SYMBOL_FOOTPRINT_PINMAP_BINDINGS', 'The proof uses embedded review symbols and proof PCB geometry, not selected manufacturer symbol/footprint/pin-map bindings.', 'Select parts, resolve approved local libraries, verify pin-to-pad equivalence, then rerun ERC/DRC and package validation.'))
  }
  if (categoryReadiness.status === 'CATEGORY_GENERATION_BLOCKED') {
    items.push(blocker('category_generation', 'FULL_CATEGORY_SCHEMATIC_PLACEMENT_ROUTING_NOT_PROVEN', 'This proof generated a real KiCad outline project but did not prove full category schematic, placement, and routed-net completion.', 'Use the category generation readiness report to implement the missing schematic, placement, and routing stages.'))
    items.push(...categoryReadiness.blockers.map((item) => blocker(item.category, item.code, item.reason, item.recommendedFix)))
  }
  return {
    schema: 'boardforge.blocker-report.real-proof.v1',
    boardId: board.id,
    status: items.length ? 'BLOCKERS_RECORDED' : 'NO_BLOCKERS',
    items,
  }
}

function determineFinalStatus({ outlineResult, validationReports, blockers }) {
  if (!outlineResult.validation.valid) return 'BLOCKED_WITH_EXACT_REASON'
  if ((validationReports.erc.errors || 0) > 0 || (validationReports.drc.errors || 0) > 0) return 'BLOCKED_WITH_EXACT_REASON'
  // This proof suite deliberately does not create Gerbers, drill, BOM/CPL
  // evidence, selected parts, or a manufacturing ZIP. A clean ERC/DRC result
  // therefore proves a reviewable KiCad candidate, never fab readiness.
  return 'PASS_ENGINEERING_REVIEW_REQUIRED'
}

async function writeBomAndSourcing({ projectDir, board }) {
  if (!board.bom.length) return
  const csv = ['Reference,Value,Role,VerificationStatus', ...board.bom.map((row) => `${csvCell(row.ref)},${csvCell(row.value)},${csvCell(row.role)},${csvCell(row.verificationStatus)}`)].join('\n')
  await writeFile(path.join(projectDir, 'BoardForge_BOM.csv'), csv, 'utf8')
  const sourcing = buildMakeSourcableReport({ board })
  await writeJsonAndMarkdown(projectDir, 'BoardForge_BOM_Sourcing_Report', sourcing, renderMakeSourcableMarkdown(sourcing))
}

async function writeGoldenFixtureRecord({ outputRoot, board, seed, evidence }) {
  const file = path.join(outputRoot, 'golden-fixtures', `${board.id}.json`)
  await writeFile(file, JSON.stringify({
    schema: 'boardforge.real-board-golden-fixture.v1',
    boardId: board.id,
    prompt: board.prompt,
    expectedOutputs: ['BoardForge_Board_Brief.json', 'BoardForge_Project_Manifest.json', '.kicad_pro', '.kicad_pcb'],
    knownLimitations: ['engineering review required until full schematic/placement/routing is generated'],
    validationExpectations: {
      edgeCutsValid: true,
      routeabilityScoreMinimum: Math.max(50, evidence.outline.routeabilityScore - 5),
      noManufacturingZipWithoutGates: true,
    },
    seedFile: path.join(evidence.projectDir, 'BoardForge_Custom_Outline_Project_Seed.json'),
    projectDir: evidence.projectDir,
    outlinePointCount: seed.outline.length,
  }, null, 2), 'utf8')
}

async function saveLessonsForBlockers({ board, blockers }) {
  const saved = []
  const lessonDir = path.join(PLUGIN_ROOT, 'data', 'solution-library')
  await mkdir(lessonDir, { recursive: true })
  for (const item of blockers.items) {
    if (item.code === 'FULL_CATEGORY_SCHEMATIC_PLACEMENT_ROUTING_NOT_PROVEN') {
      const id = 'real_board_full_category_generation_gap_001'
      const lesson = {
      id,
      schema: 'boardforge.solution-library.lesson.v1',
      failureSignature: item.code,
      boardId: board.id,
      detectionRule: 'A board proof has valid Edge.Cuts but no evidence for category schematic, component placement, and routed nets.',
      rootCause: 'The proof harness can generate real outline KiCad projects before the category engine can prove full schematic/placement/routing for arbitrary board prompts.',
      fixStrategy: 'Use this blocker to prioritize category schematic synthesis, footprint binding, placement constraints, and endpoint-aware routing in the engine before manufacturing ZIP claims.',
      regressionTest: 'test:real-board-proof verifies these projects are not marked manufacturing-ready without evidence.',
      futureAutoApplyRule: 'When full schematic/placement/routing evidence is missing, mark PASS_ENGINEERING_REVIEW_REQUIRED or BLOCKED_WITH_EXACT_REASON instead of manufacturing-ready.',
      }
      await writeFile(path.join(lessonDir, `${id}.json`), JSON.stringify(lesson, null, 2), 'utf8')
      saved.push(id)
    }
    if (item.code === 'SCHEMATIC_SYMBOL_GRAPH_NOT_GENERATED') {
      const id = 'real_board_category_scaffold_detection_001'
      const lesson = {
        id,
        schema: 'boardforge.solution-library.lesson.v1',
        failureSignature: 'CATEGORY_BOARD_HAS_LOADABLE_BUT_TEXT_ONLY_SCHEMATIC_AND_OUTLINE_ONLY_PCB',
        boardId: board.id,
        detectionRule: 'Category proof has expected BOM refs but zero schematic symbol instances, zero non-hole footprints, or zero routed tracks.',
        rootCause: 'A loadable KiCad schematic/PCB scaffold can pass basic file and ERC/DRC checks while still failing to prove real category schematic, placement, and routing generation.',
        fixStrategy: 'Inspect generated KiCad files for actual symbols, expected refs, non-hole footprints, named nets, tracks, and vias; emit exact category blockers until the engine writes those artifacts.',
        regressionTest: 'test:real-board-proof verifies category boards record category-generation readiness and do not mistake scaffolds for completed designs.',
        futureAutoApplyRule: 'Any category board with BOM intent but no symbol graph or placed refs must remain engineering-review required and must not export a manufacturing ZIP.',
      }
      await writeFile(path.join(lessonDir, `${id}.json`), JSON.stringify(lesson, null, 2), 'utf8')
      saved.push(id)
    }
  }
  return [...new Set(saved)]
}

async function saveGenerationLessons({ board }) {
  const lessons = []
  if (board.bom.length) {
    const id = 'real_board_embedded_category_schematic_parse_fix_001'
    const lessonDir = path.join(PLUGIN_ROOT, 'data', 'solution-library')
    const lesson = {
      id,
      schema: 'boardforge.solution-library.lesson.v1',
      failureSignature: 'CATEGORY_PROOF_SCHEMATIC_HAS_TEXT_SHELL_OR_KICAD_CANNOT_LOAD_EMBEDDED_SYMBOL_GRAPH',
      detectionRule: 'A BOM-backed proof schematic has zero symbol instances, KiCad ERC reports erc_command_failed, or named net labels are not attached to symbol pins.',
      rootCause: 'The proof flow retained the outline-only schematic stub, while the first embedded connector writer used an invalid KiCad instance structure and label coordinates that did not reach the real pin endpoints.',
      fixStrategy: 'Write an embedded BoardForge connector symbol graph, retain proper symbol/pin/instance records, and extend each pin to an outward named-net label using KiCad sheet coordinates.',
      regressionTest: 'test:real-board-proof asserts every BOM-backed proof emits symbols and obtains a real ERC result; the schematic generator smoke check verifies KiCad loads the output.',
      futureAutoApplyRule: 'Never replace a category proof schematic with a text-only manifest. Keep unresolved assets explicitly review-required, but generate parseable symbols and named-net connectivity before running ERC.',
    }
    await mkdir(lessonDir, { recursive: true })
    await writeFile(path.join(lessonDir, `${id}.json`), JSON.stringify(lesson, null, 2), 'utf8')
    lessons.push(id)
  }
  if (board.id === 'usb-c-esp32-sensor') {
    const id = 'real_board_category_pcb_evidence_writer_001'
    const lesson = {
      id,
      schema: 'boardforge.solution-library.lesson.v1',
      failureSignature: 'CATEGORY_BOARD_HAD_VALID_OUTLINE_BUT_ZERO_PLACED_REFS_ZERO_NETS_ZERO_TRACKS',
      boardId: board.id,
      detectionRule: 'A category board proof has expected BOM refs but the generated .kicad_pcb has no non-hole footprints, no named electrical nets, or no tracks.',
      rootCause: 'The real-board proof flow reached mechanical KiCad generation before category PCB evidence writing existed for the requested board family.',
      fixStrategy: 'Write review-required category PCB evidence with expected refs, named nets, proof footprints, routed copper segments, and a parseable embedded KiCad symbol graph. Keep manufacturing blocked until exact library bindings and selected MPN evidence are generated.',
      regressionTest: 'test:real-board-proof verifies the USB-C ESP32 proof contains U1/J1/U2/J2, named nets, a KiCad-loadable symbol graph, routed tracks, and no DRC errors.',
      futureAutoApplyRule: 'For category boards, never stop at outline-only if a safe proof placement/routing scaffold can be emitted; keep manufacturing blocked until verified footprint, pin-map, sourcing, and DRC/ERC evidence is complete.',
    }
    const lessonDir = path.join(PLUGIN_ROOT, 'data', 'solution-library')
    await mkdir(lessonDir, { recursive: true })
    await writeFile(path.join(lessonDir, `${id}.json`), JSON.stringify(lesson, null, 2), 'utf8')
    lessons.push(id)
    const drcId = 'real_board_usb_header_mounting_clearance_fix_001'
    const drcLesson = {
      id: drcId,
      schema: 'boardforge.solution-library.lesson.v1',
      failureSignature: 'USB_CATEGORY_PROOF_HEADER_TOO_CLOSE_TO_MOUNTING_HOLE_CAUSES_NPTH_COURTYARD_AND_MASK_DRC',
      boardId: board.id,
      detectionRule: 'A category PCB proof has KiCad DRC errors where a connector/header pad or courtyard overlaps a mounting-hole NPTH keepout or solder-mask clearance region.',
      rootCause: 'The first USB-C ESP32 proof placement put the debug/header connector too close to the upper-right mounting hole, creating clearance, courtyard, and solder-mask bridge errors even though the logical category scaffold was useful.',
      fixStrategy: 'Keep the useful category refs/nets/tracks, but move the header inward before writing the PCB so its pads and courtyard clear mounting-hole keepouts under KiCad DRC.',
      regressionTest: 'test:real-board-proof verifies the USB-C ESP32 proof has J1/U2/U1/J2 placed, routed evidence present, and zero KiCad DRC errors.',
      futureAutoApplyRule: 'Before committing category proof placement, reserve mounting-hole keepout/courtyard space and nudge nearby headers inward instead of accepting a route or placement that KiCad DRC rejects.',
    }
    await writeFile(path.join(lessonDir, `${drcId}.json`), JSON.stringify(drcLesson, null, 2), 'utf8')
    lessons.push(drcId)
  }
  if (board.id === 'can-sensor-node') {
    const id = 'real_board_can_sensor_node_category_pcb_evidence_001'
    const lesson = {
      id,
      schema: 'boardforge.solution-library.lesson.v1',
      failureSignature: 'CAN_SENSOR_NODE_PROOF_WAS_OUTLINE_ONLY_WITH_MISSING_CAN_REFS_NETS_AND_TRACKS',
      boardId: board.id,
      detectionRule: 'A CAN sensor node proof has expected CAN/USB/MCU refs but zero placed non-hole footprints, zero CANH/CANL nets, or zero routed copper tracks.',
      rootCause: 'The real-board proof flow initially emitted only a mechanical outline for the CAN sensor node even though the prompt required CAN transceiver, USB-C power, MCU, I2C, and field connector intent.',
      fixStrategy: 'Emit review-required CAN category PCB evidence with J1/U1/U2/J2, CANH/CANL, VBUS, 3V3, GND, I2C, and status nets, plus routed copper segments, while keeping manufacturing blocked until real schematic symbols and verified footprint bindings exist.',
      regressionTest: 'test:real-board-proof verifies the CAN sensor node contains expected refs, named CAN nets, routed tracks, zero KiCad DRC errors, and no manufacturing ZIP claim.',
      futureAutoApplyRule: 'For CAN-class boards, require explicit CANH/CANL net naming, edge/field connector placement, and proof routing evidence before treating the PCB as more than outline-only.',
    }
    const lessonDir = path.join(PLUGIN_ROOT, 'data', 'solution-library')
    await mkdir(lessonDir, { recursive: true })
    await writeFile(path.join(lessonDir, `${id}.json`), JSON.stringify(lesson, null, 2), 'utf8')
    lessons.push(id)
  }
  if (board.id === 'poe-ethernet-sensor') {
    const id = 'real_board_poe_category_pcb_evidence_001'
    const lesson = {
      id,
      schema: 'boardforge.solution-library.lesson.v1',
      failureSignature: 'POE_ETHERNET_PROOF_WAS_OUTLINE_ONLY_WITH_MISSING_RJ45_PD_MCU_SENSOR_REFS_AND_ETHERNET_NET_INTENT',
      boardId: board.id,
      detectionRule: 'A PoE Ethernet proof has no placed J1/U1/U2/J2 refs, no POE_VIN or named Ethernet pair nets, or no routed copper evidence.',
      rootCause: 'The proof flow had only generic mechanical output for the PoE category, which could not demonstrate edge connector, power front-end, logic, and sensor-region intent.',
      fixStrategy: 'Emit review-required category PCB evidence using the KiCad-validated two-layer topology with RJ45/PoE, PD controller, MCU, I2C header, POE_VIN, ETH_TX_P, and ETH_TX_N naming. Keep IEEE 802.3, isolation, and selected-library claims blocked until independently verified.',
      regressionTest: 'test:real-board-proof verifies the PoE proof includes J1/U1/U2/J2, PoE/Ethernet named nets, routed tracks, zero KiCad DRC errors, and no manufacturing ZIP claim.',
      futureAutoApplyRule: 'For PoE categories, require explicit edge RJ45 placement, power-front-end intent, Ethernet pair naming, and an external compliance-review blocker before any readiness promotion.',
    }
    const lessonDir = path.join(PLUGIN_ROOT, 'data', 'solution-library')
    await mkdir(lessonDir, { recursive: true })
    await writeFile(path.join(lessonDir, `${id}.json`), JSON.stringify(lesson, null, 2), 'utf8')
    lessons.push(id)
  }
  if (board.id === 'odd-shaped-robotics-controller') {
    const id = 'real_board_robotics_category_pcb_evidence_001'
    const lesson = {
      id,
      schema: 'boardforge.solution-library.lesson.v1',
      failureSignature: 'ROBOTICS_CONTROLLER_PROOF_WAS_OUTLINE_ONLY_WITH_MISSING_USB_CAN_UART_PWM_COMPONENT_AND_NET_EVIDENCE',
      boardId: board.id,
      detectionRule: 'An odd-shaped robotics controller proof has no placed USB/MCU/CAN/header refs, no CAN/UART/PWM names, or no routed copper evidence.',
      rootCause: 'The custom-outline generator preserved mechanical intent but the category proof had not yet emitted controller-specific PCB placement and routing evidence.',
      fixStrategy: 'Emit review-required robotics PCB evidence with USB-C service connector, control MCU, CAN transceiver, expansion header, VUSB, +3V3, GND, CANH/CANL, UART, and PWM net intent using a KiCad-validated placement topology.',
      regressionTest: 'test:real-board-proof verifies the robotics proof has expected refs, CAN/UART/PWM named nets, routed tracks, zero KiCad DRC errors, and no manufacturing ZIP claim.',
      futureAutoApplyRule: 'For odd-shaped robotics categories, keep component placement inside the validated outline and require mechanical/connector review before manufacturing readiness promotion.',
    }
    const lessonDir = path.join(PLUGIN_ROOT, 'data', 'solution-library')
    await mkdir(lessonDir, { recursive: true })
    await writeFile(path.join(lessonDir, `${id}.json`), JSON.stringify(lesson, null, 2), 'utf8')
    lessons.push(id)
  }
  const categoryLessons = {
    'tiny-wearable-sensor-puck': {
      id: 'real_board_wearable_hole_keepout_routing_fix_001',
      signature: 'WEARABLE_PUCK_ROUTING_CROSSED_STRAP_HOLE_KEEP_OUTS',
      detection: 'A compact wearable proof has copper, vias, or solder-mask apertures intersecting a strap/mounting-hole keepout, or fails to connect its battery, sensor, MCU, and programming pads inside the puck envelope.',
      fix: 'Place the sensor in the lower-center corridor, reserve all strap-hole keepouts as routing obstacles, and use separate B.Cu corridors for I2C, 3V3, and GND. Verify every SMD pad changes layers through an explicit legal via.',
    },
    'industrial-io-board': {
      id: 'real_board_industrial_io_category_pcb_evidence_001',
      signature: 'INDUSTRIAL_IO_PROOF_WAS_OUTLINE_ONLY_WITH_MISSING_FIELD_LOGIC_SEPARATION_EVIDENCE',
      detection: 'An industrial I/O proof has no terminal/opto/relay/logic refs, no VIN_24V or FIELD_GND intent, or no routed copper evidence.',
      fix: 'Emit review-required industrial proof placement with explicit field-input, relay-output, logic-ground, and high/low-voltage review intent. Do not claim isolation or field safety certification.',
    },
    'drone-stack-board': {
      id: 'real_board_drone_stack_category_pcb_evidence_001',
      signature: 'DRONE_STACK_PROOF_WAS_OUTLINE_ONLY_WITH_MISSING_USB_HEADER_POWER_AND_CAN_EVIDENCE',
      detection: 'A drone-stack proof has no placed USB/header/power-pad refs, no +5V/CAN/UART intent, or no routed copper evidence.',
      fix: 'Emit review-required compact drone-stack proof placement with expected J1/J2/P1 refs, named +5V, GND, CAN, UART, and I2C intent, while preserving the single selected mounting pattern.',
    },
  }[board.id]
  if (categoryLessons) {
    const lesson = {
      id: categoryLessons.id,
      schema: 'boardforge.solution-library.lesson.v1',
      failureSignature: categoryLessons.signature,
      boardId: board.id,
      detectionRule: categoryLessons.detection,
      rootCause: 'The real-board proof flow had mechanical output but no category-specific placed-reference, named-net, and routed-copper evidence for this board family.',
      fixStrategy: categoryLessons.fix,
      regressionTest: 'test:real-board-proof verifies category-specific placed refs, named nets, routed tracks, zero KiCad DRC errors, and no manufacturing ZIP claim.',
      futureAutoApplyRule: 'Never promote category proof routing evidence beyond engineering review until a verified schematic graph, selected library assets, placement validation, sourcing, and category safety review are complete.',
    }
    const lessonDir = path.join(PLUGIN_ROOT, 'data', 'solution-library')
    await mkdir(lessonDir, { recursive: true })
    await writeFile(path.join(lessonDir, `${lesson.id}.json`), JSON.stringify(lesson, null, 2), 'utf8')
    lessons.push(lesson.id)
  }
  if (board.id === 'drone-stack-board') {
    const id = 'real_board_drone_stack_single_mounting_pattern_fix_001'
    const lesson = {
      id,
      schema: 'boardforge.solution-library.lesson.v1',
      failureSignature: 'DRONE_STACK_MULTIPLE_MOUNTING_PATTERNS_CAUSE_NPTH_CLEARANCE_AND_MASK_BRIDGE_DRC',
      boardId: board.id,
      detectionRule: 'A drone stack outline emits more than one standard stack mounting pattern, such as 20x20 plus 25.5x25.5 plus 30.5x30.5, in the same compact board.',
      rootCause: 'Different drone stack standards are alternatives, not simultaneous mounting requirements; placing all of them creates overlapping NPTH keepouts and solder-mask bridge errors.',
      fixStrategy: 'Select one stack pattern per board. Default to 30.5x30.5 when it fits, then fall back to 25.5x25.5 or 20x20 only when the mechanical envelope is too small.',
      regressionTest: 'test:real-board-proof verifies the drone stack proof uses one four-hole pattern and does not carry DRC errors from mixed mounting patterns.',
      futureAutoApplyRule: 'When a prompt names a stack pattern, lock that one. When the prompt is ambiguous, choose the largest supported pattern that satisfies board-edge clearance and do not emit alternate patterns as holes.',
    }
    const lessonDir = path.join(PLUGIN_ROOT, 'data', 'solution-library')
    await mkdir(lessonDir, { recursive: true })
    await writeFile(path.join(lessonDir, `${id}.json`), JSON.stringify(lesson, null, 2), 'utf8')
    lessons.push(id)
  }
  return lessons
}

async function writeProofLessonLibrary({ outputRoot, lessons }) {
  const md = `# BoardForge Real Board Proof Lessons

${lessons.length ? lessons.map(renderProofLessonMarkdown).join('\n') : '- No lessons saved in this run.'}
`
  await writeFile(path.join(outputRoot, 'BOARD_FORGE_REAL_BOARD_PROOF_LESSONS.md'), md, 'utf8')
  await mkdir(path.join(REPO_ROOT, 'docs'), { recursive: true })
  await writeFile(path.join(REPO_ROOT, 'docs', 'BOARD_FORGE_REAL_BOARD_PROOF_LESSONS.md'), md, 'utf8')
}

function renderProofLessonMarkdown(lesson) {
  if (lesson === 'real_board_drone_stack_single_mounting_pattern_fix_001') {
    return `## ${lesson}

- What happened: The drone-stack board originally emitted 20x20, 25.5x25.5, and 30.5x30.5 mounting patterns at the same time, creating overlapping NPTH keepouts and solder-mask bridge DRC errors.
- Detection: Drone-stack proof output must contain exactly one four-hole stack pattern, and the selected pattern must match the prompt or the largest pattern that fits the board.
- Fix strategy: Select one mounting standard per drone board; default to 30.5x30.5 when it fits and fall back only when the mechanical envelope requires it.
- Auto-apply rule: Never emit alternate drone stack standards as additional holes unless the user explicitly asks for multi-pattern adapter hardware and DRC spacing can prove it is valid.
- Regression: \`npm run test:real-board-proof\` verifies the drone proof uses one four-hole pattern and carries no mixed-pattern DRC errors.
`
  }
  if (lesson === 'real_board_full_category_generation_gap_001') {
    return `## ${lesson}

- What happened: BoardForge generated real KiCad outline projects but correctly refused to claim full category schematic/placement/routing completion without evidence.
- Detection: Proof output has valid Edge.Cuts but lacks complete schematic symbol graph, placement, routed nets, and clean export evidence.
- Fix strategy: Keep the honest blocker and drive the next engine upgrade toward category schematic synthesis, footprint binding, placement, and routing.
- Auto-apply rule: Never generate manufacturing-ready status or ZIP from outline-only evidence.
- Regression: \`npm run test:real-board-proof\`.
`
  }
  if (lesson === 'real_board_category_scaffold_detection_001') {
    return `## ${lesson}

- What happened: Category boards produced KiCad-loadable files, but the generated schematic/PCB still had scaffold evidence instead of real symbol instances, placed category components, and routed nets.
- Detection: For every category proof, BoardForge now records symbol instance count, non-hole footprint count, named nets, routed tracks, vias, missing expected refs, and exact blockers.
- Fix strategy: Treat file-load success as necessary but not sufficient; require category generation evidence before any manufacturing-ready claim.
- Auto-apply rule: Any board with BOM/category intent and zero symbols, zero placed category footprints, or zero tracks remains engineering-review required and cannot export a manufacturing ZIP.
- Regression: \`npm run test:real-board-proof\` verifies the category-generation readiness report and scaffold blockers are present.
`
  }
  if (lesson === 'real_board_category_pcb_evidence_writer_001') {
    return `## ${lesson}

- What happened: The USB-C ESP32 proof had a valid outline but no category refs, named nets, routed copper, or via evidence in the PCB.
- Detection: Category proof compares BOM refs against placed non-hole footprints and counts named nets, tracks, and vias.
- Fix strategy: Emit review-required category PCB evidence for the first board family: U1/J1/U2/J2, USB/VBUS/3V3/I2C/UART/GND nets, and routed copper segments, while keeping manufacturing blocked until schematic symbols and verified footprints exist.
- Auto-apply rule: Category proofs may add PCB evidence only with explicit no-manufacturing claims and must continue blocking on missing schematic symbol graph.
- Regression: \`npm run test:real-board-proof\` verifies the USB-C ESP32 board is no longer outline-only but still honest about missing schematic proof.
`
  }
  if (lesson === 'real_board_usb_header_mounting_clearance_fix_001') {
    return `## ${lesson}

- What happened: The USB-C ESP32 category proof initially placed the debug/header connector too close to a mounting hole, causing KiCad DRC clearance, courtyard, and solder-mask bridge errors.
- Detection: KiCad DRC is parsed after proof PCB evidence is written, and any connector/header conflict with NPTH mounting-hole keepouts remains a real blocker.
- Fix strategy: Preserve the category refs/nets/tracks, but nudge the header inward before writing the board so the footprint and pads clear the mounting hole.
- Auto-apply rule: Reserve mounting-hole keepout space before committing generated category placement; if a header conflicts, move it inward rather than suppressing DRC.
- Regression: \`npm run test:real-board-proof\` verifies the USB-C ESP32 board keeps category PCB evidence and has zero DRC errors.
`
  }
  return `## ${lesson}

- What happened: BoardForge saved a proof-suite lesson.
- Detection: See the matching solution-library JSON record for the exact failure signature and detection rule.
- Fix strategy: Keep the lesson tied to engine logic and regression coverage.
- Auto-apply rule: Apply only when the failure signature matches.
- Regression: \`npm run test:real-board-proof\`.
`
}

async function writeSurfaceParityReport({ outputRoot, summary }) {
  const report = {
    schema: 'boardforge.real-board-surface-parity.v1',
    status: 'SURFACE_PARITY_RECORDED',
    generatedAt: new Date().toISOString(),
    checks: summary.boards.map((board) => ({
      boardId: board.boardId,
      cliStatus: board.finalStatus,
      localEngineStatus: 'NOT_QUERIED_IN_THIS_PROOF',
      webStatus: 'MANIFEST_AVAILABLE_FOR_PROJECT_CARD',
      kicadPluginStatus: 'NOT_QUERIED_IN_THIS_PROOF',
      manifest: path.join(board.outputFolder, 'BoardForge_Project_Manifest.json'),
    })),
  }
  await writeFile(path.join(outputRoot, 'BoardForge_Real_Board_Surface_Parity_Report.json'), JSON.stringify(report, null, 2), 'utf8')
  await writeFile(path.join(outputRoot, 'BoardForge_Real_Board_Surface_Parity_Report.md'), `# BoardForge Real Board Surface Parity Report

- Status: ${report.status}
- Boards: ${report.checks.length}

${report.checks.map((item) => `## ${item.boardId}

- CLI status: ${item.cliStatus}
- Local engine status: ${item.localEngineStatus}
- Web status: ${item.webStatus}
- KiCad plugin status: ${item.kicadPluginStatus}
- Manifest: ${item.manifest}
`).join('\n')}
`, 'utf8')
}

async function writeJsonAndMarkdown(dir, basename, json, markdown) {
  await writeFile(path.join(dir, `${basename}.json`), JSON.stringify(json, null, 2), 'utf8')
  await writeFile(path.join(dir, `${basename}.md`), markdown, 'utf8')
}

function renderSummaryMarkdown(summary) {
  return `# BoardForge Real Board Proof Summary

- Status: ${summary.status}
- Boards attempted: ${summary.boardsAttempted}
- Passed: ${summary.passed}
- Blocked: ${summary.blocked}
- Manufacturing ready: ${summary.manufacturingReady}
- Output root: ${summary.outputRoot}
- KiCad CLI: ${summary.kicadCli.available ? `${summary.kicadCli.version} at ${summary.kicadCli.path}` : `unavailable - ${summary.kicadCli.reason}`}

## Truth Statement

${summary.truthStatement}

## Boards

${summary.boards.map((board) => `### ${board.boardName}

- Status: ${board.finalStatus}
- Folder: ${board.outputFolder}
- KiCad project valid: ${board.kicadProjectValid}
- Schematic valid: ${board.schematicValid}
- PCB valid: ${board.pcbValid}
- Edge.Cuts valid: ${board.edgeCutsValid}
- Routeability score: ${board.routeabilityScore}
- ERC: ${board.erc.status} (${board.erc.errors ?? 'n/a'} errors, ${board.erc.warnings ?? 'n/a'} warnings)
- DRC: ${board.drc.status} (${board.drc.errors ?? 'n/a'} errors, ${board.drc.warnings ?? 'n/a'} warnings)
- Sourcing: ${board.sourcing}
- Manufacturing package: ${board.manufacturingPackage.status}
- Blockers: ${board.blockers.length}
- Lessons saved: ${board.lessonsSaved.join(', ') || 'none'}
`).join('\n')}
`
}

function renderBriefMarkdown(brief) {
  return `# BoardForge Board Brief

- Board: ${brief.boardName}
- Prompt: ${brief.prompt}
- Layers: ${brief.layerTarget}
- Dimensions: ${brief.dimensionsMm.width} x ${brief.dimensionsMm.height} mm
- Outline preset: ${brief.outlinePreset}
- Electrical scope: ${brief.electricalScope}

## Intent
${brief.intent.map((item) => `- ${item}`).join('\n')}

## Validation
- Outline: ${brief.validation.outline}
- ERC: ${brief.validation.erc}
- DRC: ${brief.validation.drc}
`
}

function renderOutlineValidationMarkdown(report) {
  return `# BoardForge Outline Validation Report

- Board: ${report.boardId}
- Status: ${report.status}
- Valid: ${report.valid}
- Edge.Cuts closed: ${report.edgeCuts.closed}
- Self intersections: ${report.edgeCuts.selfIntersections.length}
- Hole checks: ${report.holes.length}

## Blockers
${report.blockers.length ? report.blockers.map((item) => `- ${item}`).join('\n') : '- none'}
`
}

function renderRouteabilityMarkdown(report) {
  return `# BoardForge Routeability Explanation

- Board: ${report.boardId}
- Status: ${report.status}
- Score: ${report.score}
- Density: ${report.density}

${report.explanation}

## Limitations
${report.limitations.map((item) => `- ${item}`).join('\n')}
`
}

function renderCategoryGenerationReadinessMarkdown(report) {
  return `# BoardForge Category Generation Readiness Report

- Board: ${report.boardId}
- Status: ${report.status}
- Expected BOM refs: ${report.summary.expectedBomRefs}
- Schematic symbol instances: ${report.summary.schematicSymbolInstances}
- Non-hole footprints: ${report.summary.nonHoleFootprints}
- Named nets: ${report.summary.nets}
- Routed tracks: ${report.summary.tracks}
- Vias: ${report.summary.vias}
- No fake claims: ${report.noFakeClaims}

## Checks
${report.checks.map((item) => `- ${item.pass ? 'PASS' : 'FAIL'} ${item.id}: ${item.evidence}`).join('\n')}

## Blockers
${report.blockers.length ? report.blockers.map((item) => `- ${item.code}: ${item.reason} Fix: ${item.recommendedFix}`).join('\n') : '- none'}
`
}

function renderSchematicAssetBindingMarkdown(report) {
  return `# BoardForge Schematic Asset Binding Report

- Board: ${report.boardId}
- Status: ${report.status}
- Manufacturing allowed: ${report.manufacturingAllowed}
- No fake claims: ${report.noFakeClaims ?? true}

## Schematic Evidence
- Symbol graph: ${report.schematicGraph?.status || 'not applicable'}
- Symbols: ${report.schematicGraph?.symbols ?? 0}
- Named nets: ${report.schematicGraph?.namedNets ?? 0}
- ERC: ${report.schematicGraph?.erc?.status || 'not run'}

## Component Bindings
${report.components?.length ? report.components.map((item) => `- ${item.ref}: ${item.status} - ${item.reason}${item.catalogCandidate ? `\n  - Local catalog candidate: ${item.catalogCandidate.mpn || 'no MPN'} | symbol ${item.catalogCandidate.symbol || 'unresolved'} | footprint ${item.catalogCandidate.footprint || 'unresolved'} | 3D ${item.catalogCandidate.model3d ? 'resolved' : 'unresolved'} | pin map ${item.catalogCandidate.pinMapBindingStatus}` : ''}`).join('\n') : '- no BOM-backed components'}

## Local Candidate Resolution
- Requested: ${report.catalogCandidateSummary?.requested ?? 0}
- Symbol + footprint resolved locally: ${report.catalogCandidateSummary?.locallyResolvedSymbolAndFootprint ?? 0}
- 3D models resolved locally: ${report.catalogCandidateSummary?.locallyResolved3dModel ?? 0}
- Pin-map ready: ${report.catalogCandidateSummary?.pinMapReady ?? 0}
- Pin-map warnings or errors: ${report.catalogCandidateSummary?.pinMapWarningsOrErrors ?? 0}
- These are library/catalog candidates only. They do not replace the embedded review symbols or authorize manufacturing.

## Required Before Manufacturing
${report.requirements?.length ? report.requirements.map((item) => `- ${item}`).join('\n') : '- not applicable'}
`
}

function renderManufacturingRiskMarkdown(report) {
  return `# BoardForge Manufacturing Risk Report

- Board: ${report.boardId}
- Status: ${report.status}
- Risk level: ${report.riskLevel}
- Manufacturing ZIP allowed: ${report.exportGate.manufacturingZipAllowed}
- Gate reason: ${report.exportGate.reason}

## Risks
${report.risks.map((item) => `- ${item}`).join('\n') || '- none'}

## Compliance Warnings
${report.complianceWarnings.length ? report.complianceWarnings.map((item) => `- ${item}`).join('\n') : '- none'}
`
}

function renderHealthMarkdown(report) {
  return `# BoardForge Project Health Report

- Board: ${report.boardId}
- Status: ${report.status}
- Health score: ${report.healthScore}

${report.checks.map((item) => `- ${item.pass ? 'PASS' : 'FAIL'} ${item.id}: ${item.evidence}`).join('\n')}
`
}

function renderReviewMarkdown(report) {
  return `# BoardForge Board Review Report

- Board: ${report.boardId}
- Status: ${report.status}
- Summary: ${report.summary}
- Human review required: ${report.humanReviewRequired}

## Review Items
${report.reviewItems.map((item) => `- ${item}`).join('\n')}
`
}

function renderMakeManufacturableMarkdown(report) {
  return `# BoardForge Make Manufacturable Report

- Board: ${report.boardId}
- Status: ${report.status}
- Health score: ${report.healthScore}

## Blocking Reasons
${report.blockingReasons.map((item) => `- ${item}`).join('\n') || '- none'}

## Unsafe Without Review
${report.unsafeWithoutReview.map((item) => `- ${item}`).join('\n')}
`
}

function renderMakeSourcableMarkdown(report) {
  return `# BoardForge Make Sourcable Report

- Board: ${report.boardId}
- Status: ${report.status}
- BOM rows: ${report.bomRows}
- No fake stock: ${report.noFakeStock}

${report.rows.map((row) => `- ${row.ref}: ${row.value} - ${row.sourcingStatus} (${row.reason})`).join('\n')}
`
}

function renderBlockerMarkdown(report) {
  return `# BoardForge Blocker Report

- Board: ${report.boardId}
- Status: ${report.status}

${report.items.map((item) => `## ${item.code}

- Category: ${item.category}
- Reason: ${item.reason}
- Recommended fix: ${item.recommendedFix}
`).join('\n')}
`
}

function blocker(category, code, reason, recommendedFix) {
  return { category, code, reason, recommendedFix }
}

function categoryGenerationBlocker(category, code, reason, recommendedFix) {
  return { category, code, reason, recommendedFix }
}

function categoryCheck(id, pass, evidence) {
  return { id, pass, evidence }
}

function check(id, pass, evidence) {
  return { id, pass, evidence }
}

function bom(ref, value, role, verificationStatus) {
  return { ref, value, role, verificationStatus }
}

function csvCell(value) {
  const text = String(value ?? '')
  return /[,"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function assertSafeOutputRoot(outputRoot) {
  const lower = outputRoot.toLowerCase()
  const forbidden = ['\\fn-esc1', '\\esc', '\\fc', 'flight-controller', 'flight_controller', 'fn-fc']
  const syntheticRoots = ['boardforge_real_board_proofs', 'boardforge_50_board_challenge']
  if (!syntheticRoots.some((name) => lower.includes(name))) throw new Error(`Refusing real board proof output outside an approved BoardForge synthetic proof root: ${outputRoot}`)
  for (const item of forbidden) {
    if (lower.includes(item)) throw new Error(`Refusing protected output root: ${outputRoot}`)
  }
}

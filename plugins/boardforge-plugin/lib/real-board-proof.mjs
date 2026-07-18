import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { createOutlineSeed, generateOutlineKiCadProject } from './outline/custom-outline-workflow.mjs'
import { detectKiCadCli, runDrc, runErc } from './kicad-cli.mjs'
import { scanKiCadProject } from './kicad.mjs'
import { boardforgeReviewSymbolLibrary, generateSchematicModel, kicadSchematicFromModel } from './schematic-generator.mjs'
import { planEsp32TopologyPowerFlags, planExternalConnectorPowerFlags } from './components/production-asset-pin-schema.mjs'
import { diagnoseMissingKiCadLibraries } from './kicad-library-resolver.mjs'
import { buildComponentDatabase } from './component-database.mjs'
import { createPartLookupService } from './sourcing/part-lookup-service.mjs'
import { projectCanonicalBinding, resolveCanonicalComponentBinding } from './components/canonical-component-binding.mjs'
import { verifyReferenceParity } from './components/reference-parity.mjs'
import { createProductionPartResolver, digikeyProductionProvider, mouserProductionProvider } from './components/production-part-resolver.mjs'
import { approvedAssetFor } from './components/approved-production-assets.mjs'
import { resolveAuthoritativeKiCadFootprint, serializeAuthoritativeKiCadFootprint, bundledThi20511mFootprintDefinition } from './components/authoritative-kicad-footprint-resolver.mjs'
import { resolveAuthoritativeKiCadSymbol } from './components/authoritative-kicad-symbol-resolver.mjs'
import { loadBoardForgeEnv } from './config/env-loader.mjs'
import { createMouserProvider } from './sourcing/mouser-provider.mjs'
import { chooseFootprintTransform } from './placement/footprint-transform-scoring.mjs'
import { COMPACT_ESP32_S3_1U_PRODUCTION_TOPOLOGY, placeAuthoritativeProductionFootprints } from './placement/authoritative-production-placement.mjs'
import { generateTps25750GlobalHandoff, generateTps25750LocalBreakoutV4 } from './routing/dense-qfn-power-breakout-planner.mjs'
import { authoritativeFixedCorridors, authoritativePadRoutingInput, createCopperlessAuthoritativeCandidate, regenerateAuthoritativePadRoutesCandidate } from './routing/authoritative-pad-routing.mjs'
import { ethernetControllerProductionProposal } from './phase2c/templates/ethernet-controller.mjs'
import { validateW5500ConnectedCtTopology } from './phase2c/w5500-connected-ct-reference.mjs'
import { board009LocalSupportPlacement } from './phase2c/board009-placement-contract.mjs'
import { board011UsbHubConnectorShieldPadStitches, board011UsbHubDfpGroundPadStitches, board011UsbHubLocalPadStitches, board011UsbHubPcbPlacements, board011UsbHubPinMaps, board011UsbHubPowerPadStitches, board011UsbHubProductionDefinition, board011UsbHubSupportNetStitches, board011UsbHubUsbEsdPassThroughStitches, validateBoard011UsbHubLocalCopper } from './phase2c/board011-usb-hub-production.mjs'

export const REAL_BOARD_PROOF_ROOT = 'C:\\Users\\luifi\\Desktop\\BoardForge_Real_Board_Proofs'
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN_ROOT = path.resolve(MODULE_DIR, '..')
const REPO_ROOT = path.resolve(PLUGIN_ROOT, '..', '..')

export const REAL_BOARD_PROOF_BOARDS = [
  {
    id: 'usb-c-esp32-sensor',
    name: 'USB-C ESP32 Sensor Board',
    preset: 'blank-custom',
    outlinePoints: [[0,0],[42,0],[42,21],[0,21]],
    holes: [],
    widthMm: COMPACT_ESP32_S3_1U_PRODUCTION_TOPOLOGY.outline.widthMm,
    heightMm: COMPACT_ESP32_S3_1U_PRODUCTION_TOPOLOGY.outline.heightMm,
    layers: 4,
    prompt: 'Make a compact USB-C powered ESP32 sensor board with I2C sensor header, UART debug header, boot/reset buttons, 3.3V regulator, mounting holes, and JLCPCB-ready outputs.',
    intent: ['USB-C edge connector', 'ESP32-S3 candidate', '3V3 regulator', 'I2C sensor header', 'UART debug header', 'boot/reset buttons'],
    bom: [
      bom('U1', 'ESP32-S3-WROOM-1U', 'ESP32-S3 external-antenna module', 'APPROVED_MAPPING', COMPACT_ESP32_S3_1U_PRODUCTION_TOPOLOGY.mpn),
      bom('J1', 'USB-C receptacle', 'USB service/power connector', 'APPROVED_MAPPING', 'USB4105-GF-A'),
      bom('U2', '3.3V regulator', 'local rail generation', 'APPROVED_MAPPING', 'MCP1700T-3302E/TT'),
      bom('J2', 'I2C/UART header', 'sensor/debug expansion', 'APPROVED_MAPPING', 'M20-9990645'),
      bom('R1', '5.1k', 'USB-C CC1 sink pull-down', 'APPROVED_MAPPING', 'RC0603FR-075K1L'),
      bom('R2', '5.1k', 'USB-C CC2 sink pull-down', 'APPROVED_MAPPING', 'RC0603FR-075K1L'),
    ],
  },
  {
    id: 'stm32-controller',
    name: 'STM32 Deterministic Controller',
    preset: 'mounting-ears', widthMm: 62, heightMm: 38, layers: 4,
    prompt: 'Make a compact 5V-powered STM32 CAN machine controller with I2C expansion and mounting ears.',
    intent: ['STM32F103 control', '5V input', 'CAN transceiver', 'I2C expansion'],
    bom: [
      bom('U1','STM32F103C8T6','deterministic controller','APPROVED_MAPPING','STM32F103C8T6'),
      bom('U2','SN65HVD230DR','CAN physical layer','APPROVED_MAPPING','SN65HVD230DR'),
      bom('U3','MCP1700T-3302E/TT','3.3V regulator','APPROVED_MAPPING','MCP1700T-3302E/TT'),
      bom('J1','M20-9990245','5V power input','APPROVED_MAPPING','M20-9990245'),
      bom('J2','M20-9990645','CAN/I2C expansion','APPROVED_MAPPING','M20-9990645'),
      bom('R1','120R','CAN termination','APPROVED_MAPPING','RC0603FR-07120RL'),
      bom('C1','100n','MCU decoupling','APPROVED_MAPPING','CL10B104KB8NNNC'),
      bom('C2','100n','CAN decoupling','APPROVED_MAPPING','CL10B104KB8NNNC'),
      bom('C3','1u','regulator output bypass','APPROVED_MAPPING','CC0603KRX7R7BB105'),
      bom('D1','NUP2105LT1G','CAN surge protection','APPROVED_MAPPING','NUP2105LT1G'),
    ],
  },
  {
    id: 'rp2040-instrument', name: 'RP2040 USB Bench Instrument', preset: 'mounting-ears', widthMm: 64, heightMm: 40, layers: 4,
    holes: [{x:7,y:7,diameterMm:2.4},{x:57,y:7,diameterMm:2.4},{x:57,y:33,diameterMm:2.4},{x:7,y:33,diameterMm:2.4}],
    prompt: 'Make a compact rounded USB-C RP2040 bench instrument with protected USB, QSPI flash, SWD and measurement IO.',
    intent: ['RP2040 control', 'protected USB device', 'QSPI flash', '3V3 regulator', 'SWD and measurement expansion'],
    bom: [
      bom('U1','RP2040','instrument controller','APPROVED_MAPPING','SC0914(13)'), bom('U2','W25Q128JVSIQ','QSPI program flash','APPROVED_MAPPING','W25Q128JVSIQ'),
      bom('U3','MCP1700T-3302E/TT','3.3V regulator','APPROVED_MAPPING','MCP1700T-3302E/TT'), bom('J1','USB4105-GF-A','USB-C power and data','APPROVED_MAPPING','USB4105-GF-A'),
      bom('D1','USBLC6-2SC6','USB ESD protection','APPROVED_MAPPING','USBLC6-2SC6'), bom('J2','M20-9990645','SWD and measurement IO','APPROVED_MAPPING','M20-9990645'),
      bom('R1','5.1k','USB CC1 pull-down','APPROVED_MAPPING','RC0603FR-075K1L'), bom('R2','5.1k','USB CC2 pull-down','APPROVED_MAPPING','RC0603FR-075K1L'),
      bom('C1','100n','MCU decoupling','APPROVED_MAPPING','CL10B104KB8NNNC'), bom('C2','100n','MCU decoupling','APPROVED_MAPPING','CL10B104KB8NNNC'),
      bom('C3','100n','flash decoupling','APPROVED_MAPPING','CL10B104KB8NNNC'),
    ],
  },
  {
    id:'usb-c-pd-sink',name:'USB-C PD Sink',preset:'notched',widthMm:58,heightMm:38,layers:4,
    prompt:'Make a compact protected USB-C PD sink requesting at most 9V/2A and producing a regulated 5V/2A output.',
    intent:['USB-C recessed input','STUSB4500 PD negotiation','normally-off protected VBUS switch','fused and TVS-protected input','5V/2A buck output'],
    bom:[
      bom('J1','USB4105-GF-A','USB-C PD input','APPROVED_MAPPING','USB4105-GF-A'),bom('U1','STUSB4500QTR','PD sink controller','APPROVED_MAPPING','STUSB4500QTR'),
      bom('Q1','SI7465DP-T1-GE3','protected VBUS switch','APPROVED_MAPPING','SI7465DP-T1-GE3'),bom('U2','TPS54202DDCR','5V buck regulator','APPROVED_MAPPING','TPS54202DDCR'),
      bom('D1','SMAJ24A','VBUS TVS','APPROVED_MAPPING','SMAJ24A'),bom('F1','3413.0218.22','input fuse','APPROVED_MAPPING','3413.0218.22'),
      bom('L1','SRN6045TA-4R7M','buck inductor','APPROVED_MAPPING','SRN6045TA-4R7M'),bom('C1','UWT1H100MCL1GB','HV input bulk','APPROVED_MAPPING','UWT1H100MCL1GB'),
      bom('C2','UWT1E220MCL1GB','5V output bulk','APPROVED_MAPPING','UWT1E220MCL1GB'),bom('R_FB_TOP','73.2k','buck feedback top','APPROVED_MAPPING','RC0603FR-0773K2L'),
      bom('R_FB_BOTTOM','10k','buck feedback bottom','APPROVED_MAPPING','RC0603FR-0710KL'),bom('R_GATE_PULLUP','10k','PMOS gate pull-up','APPROVED_MAPPING','RC0603FR-0710KL'),bom('C_BOOT','100n','buck bootstrap capacitor','APPROVED_MAPPING','CL10B104KB8NNNC'),bom('J2','M20-9990245','5V output','APPROVED_MAPPING','M20-9990245'),
    ],
  },
  {
    id:'usb-c-pd-source',name:'USB-C PD Source',preset:'notched',widthMm:62,heightMm:32,layers:6,
    outlinePoints:[[0,3],[4,3],[4,0],[44,0],[44,2],[62,2],[62,30],[44,30],[44,32],[4,32],[4,29],[0,29]],holes:[],
    prompt:'Make a compact protected USB-C PD source from a regulated SELV 5V/2A input, advertising only 5V/1.5A.',
    intent:['regulated SELV input only','single 5V/1.5A source PDO','integrated protected PP5V source path','immutable EEPROM configuration','thermal-tab outline'],
    bom:[
      bom('J1','M20-9990245','regulated SELV 5V/2A input','APPROVED_MAPPING','M20-9990245'),bom('F1','3413.0218.22','2A input fuse','APPROVED_MAPPING','3413.0218.22'),
      bom('D1','SMAJ5.0A','input TVS','APPROVED_MAPPING','SMAJ5.0A'),bom('U1','MCP1700T-3302E/TT','3V3 logic regulator','APPROVED_MAPPING','MCP1700T-3302E/TT'),
      bom('U2','TPS25750DRJKR','protected PD source controller','APPROVED_MAPPING','TPS25750DRJKR'),bom('U3','M24C64-WMN6TP','immutable PD configuration EEPROM','APPROVED_MAPPING','M24C64-WMN6TP'),
      bom('J2','USB4105-GF-A','USB-C source output','APPROVED_MAPPING','USB4105-GF-A'),bom('D2','SMAJ5.0A','VBUS TVS','APPROVED_MAPPING','SMAJ5.0A'),
      bom('C_PP5V','UWT1A151MCL1GS','PP5V bulk','APPROVED_MAPPING','UWT1A151MCL1GS'),bom('C_VBUS','UWT1E4R7MCL1GB','VBUS bulk','APPROVED_MAPPING','UWT1E4R7MCL1GB'),
      bom('C_3V3','UWT1E220MCL1GB','3V3 bulk','APPROVED_MAPPING','UWT1E220MCL1GB'),bom('C_1V5','UWT1E220MCL1GB','1V5 bulk','APPROVED_MAPPING','UWT1E220MCL1GB'),
      bom('R_EEPROM_SDA','5.1k','EEPROM SDA pull-up','APPROVED_MAPPING','RC0603FR-075K1L'),bom('R_EEPROM_SCL','5.1k','EEPROM SCL pull-up','APPROVED_MAPPING','RC0603FR-075K1L'),
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

  const availableBoards = Array.isArray(options.boardDefinitions) ? options.boardDefinitions : REAL_BOARD_PROOF_BOARDS
  const requestedBoardIds = normalizeRequestedBoardIds(options.board || options.boards)
  const proofBoards = requestedBoardIds
    ? availableBoards.filter((board) => requestedBoardIds.has(board.id))
    : availableBoards
  if (requestedBoardIds && proofBoards.length !== requestedBoardIds.size) {
    const unknown = [...requestedBoardIds].filter((id) => !availableBoards.some((board) => board.id === id))
    throw new Error(`Unknown BoardForge real-board proof id(s): ${unknown.join(', ')}`)
  }

  const kicad = await detectKiCadCli()
  const startedAt = new Date().toISOString()
  const boards = []
  const lessons = []

  for (const board of proofBoards) {
    const result = await generateBoardProof({ board, outputRoot, kicad, liveBindings: options.liveBindings === true, canonicalBindingResolver: options.canonicalBindingResolver, productionPartResolver: options.productionPartResolver })
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

async function generateBoardProof({ board, outputRoot, kicad, liveBindings, canonicalBindingResolver, productionPartResolver }) {
  const generationStartedAt = Date.now()
  const projectDir = path.join(outputRoot, board.id)
  await mkdir(projectDir, { recursive: true })
  const seed = createOutlineSeed({
    id: `BF-REAL-${board.id.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-REV-A`,
    preset: board.preset,
    points: board.outlinePoints,
    holes: board.holes,
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
  const categoryPcbEvidence = await applyCategoryPcbEvidence({ board, projectDir, categorySchematic, kicad })

  const files = collectKiCadFiles(projectDir)
  const categoryReadiness = await inspectCategoryGenerationReadiness({ projectDir, files, board, categoryPcbEvidence, categorySchematic })
  const validationReports = await runOptionalKiCadReports({ projectDir, files, kicad })
  const authoritativeRouting=categoryPcbEvidence?.authoritativeRouting
  if(authoritativeRouting?.status==='CANDIDATE_PROMOTED'&&authoritativeRouting.candidatePcb&&validationReports.drc?.status==='DRC_PASSED'&&validationReports.drc?.errors===0){
    await copyFile(files.pcb,authoritativeRouting.candidatePcb)
    authoritativeRouting.candidateSynchronizedAfterFinalDrc=true
  }
  const assetBinding = await buildSchematicAssetBindingReport({ board, files, validationReports, categorySchematic, liveBindings, canonicalBindingResolver, productionPartResolver })
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
  const tables = await writeBomAndSourcing({ projectDir, board, categorySchematic, categoryPcbEvidence, assetBinding })
  const referenceParity = board.bom.length ? verifyReferenceParity({ bindings: categorySchematic.components, schematic: categorySchematic.components, pcb: categoryPcbEvidence.components, bom: tables.bom, cpl: tables.cpl }) : { status: 'NOT_APPLICABLE', passed: true, blockers: [] }
  await writeJsonAndMarkdown(projectDir, 'BoardForge_Reference_Parity_Report', referenceParity, `# BoardForge Reference Parity Report\n\n- Status: ${referenceParity.status}\n\n${referenceParity.blockers.map((item) => `- ${item.code}: ${item.surface} ${item.ref}`).join('\n') || '- Canonical bindings = schematic = PCB = BOM = CPL'}\n`)
  const health = buildHealthReport({ board, outlineResult, files, validationReports, categoryReadiness })
  await writeJsonAndMarkdown(projectDir, 'BoardForge_Project_Health_Report', health, renderHealthMarkdown(health))
  const review = buildReviewReport({ board, outlineResult, validationReports, health, categoryReadiness })
  await writeJsonAndMarkdown(projectDir, 'BoardForge_Board_Review_Report', review, renderReviewMarkdown(review))
  const manufacturable = buildMakeManufacturableReport({ board, outlineResult, validationReports, health, categoryReadiness })
  await writeJsonAndMarkdown(projectDir, 'BoardForge_Make_Manufacturable_Report', manufacturable, renderMakeManufacturableMarkdown(manufacturable))
  const sourcable = buildMakeSourcableReport({ board, assetBinding })
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
    referenceParity,
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
    referenceParity,
    assetBinding,
    sourcing: board.bom.length ? sourcable.status : 'NOT_APPLICABLE_NO_BOM',
    manufacturingPackage: evidence.manufacturingPackage,
    blockers: blockers.items,
    fixesApplied: ['real_board_proof_harness_created_outline_project_and_truth_gates'],
    lessonsSaved,
    runtimeMs: Date.now() - generationStartedAt,
  }
}

async function applyCategoryPcbEvidence({ board, projectDir, categorySchematic, kicad }) {
  const evidenceFactory = CATEGORY_PCB_EVIDENCE_WRITERS[board.topologyId || board.id]
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
  const evidence = evidenceFactory(board)
  // Category writers are versioned independently from their templates. Never
  // emit an obsolete footprint merely because an older evidence writer still
  // contains it; reference parity will separately fail closed until every new
  // BOM ref has a real placed footprint.
  const expectedBoardRefs = new Set((board.bom || []).map((row) => row.ref))
  evidence.footprints = evidence.footprints.filter((footprint) => expectedBoardRefs.has(footprint.ref))
  const projected = new Map(categorySchematicComponents(board).map(row => [row.ref, row]))
  let nextNetNumber = Math.max(0, ...evidence.nets.map((net) => net.number)) + 1
  for (const component of projected.values()) for (const netName of assignedNetNames([component])) {
    if (!evidence.nets.some((net) => net.name === netName)) evidence.nets.push({ number: nextNetNumber++, name: netName })
  }
  const placement=authoritativeProductionPlacement(board,projected)
  evidence.footprints = evidence.footprints.map((footprint) => {
    const component=projected.get(footprint.ref)
    const pads=footprint.pads.map(p=>{
      const symbolPin=footprintPadToSymbolPin(board,footprint.ref,p.name)
      return component?.pinMap?.[symbolPin] ? {...p,netName:component.pinMap[symbolPin]} : p
    })
    const asset=approvedAssetFor(board.bom.find(row=>row.ref===footprint.ref)?.mpn),aliases=asset?.pinAliases||{},padAliases=asset?.footprintPadAliases||{}
    const authoritativeNets=Object.fromEntries(assignedPinNetEntries(component?.pinMap).map(([pin,netName])=>{const net=evidence.nets.find(row=>row.name===netName);return[aliases[pin]||pin,{netName,netNumber:net?.number||0}]}))
    for(const [pad,canonical] of Object.entries(padAliases))if(authoritativeNets[canonical])authoritativeNets[pad]=authoritativeNets[canonical]
    return { ...footprint, mpn:board.bom.find(row=>row.ref===footprint.ref)?.mpn||null, value:component?.value||footprint.value, footprint:component?.footprint||footprint.footprint, pads, authoritativeNets, ...componentLink(board.id, footprint.ref) }
  })
  if(placement){
    const existingRefs=new Set(evidence.footprints.map((footprint)=>footprint.ref))
    for(const placed of placement.placements){
      if(existingRefs.has(placed.ref))continue
      const component=projected.get(placed.ref)
      if(!component)throw new Error(`Authoritative placement has no schematic component for ${placed.ref}`)
      const authoritativeNets=Object.fromEntries(assignedPinNetEntries(component.pinMap).map(([pin,netName])=>{
        const net=evidence.nets.find((row)=>row.name===netName)
        return [String(pin),{netName,netNumber:net?.number||0}]
      }))
      evidence.footprints.push({ref:placed.ref,mpn:component.mpn,value:component.value,footprint:component.footprint,at:{x:placed.at.x,y:placed.at.y},rotation:placed.at.rotation,body:{w:placed.bodyOccupancy.width,h:placed.bodyOccupancy.height},pads:[],authoritativeNets,authoritativePlacement:placed,...componentLink(board.id,placed.ref)})
    }
  }
  addAuthoritativeUnconnectedPadNets(evidence,board)
  if(placement){
    const byRef=new Map(placement.placements.map(row=>[row.ref,row]))
    evidence.footprints=evidence.footprints.map(footprint=>{
      const placed=byRef.get(footprint.ref)
      if(!placed)throw new Error(`Authoritative production placement omitted ${footprint.ref}`)
      return {...footprint,at:{x:placed.at.x,y:placed.at.y},rotation:placed.at.rotation,authoritativePlacement:placed}
    })
  }
  const categoryText = renderCategoryPcbEvidence(evidence)
  let next = current.replace(/\n\)\s*$/, `\n${categoryText}\n)\n`)
  next=markMountingHolesBoardOnly(next)
  if(placement)next=next.replace('(allow_soldermask_bridges_in_footprints no)','(allow_soldermask_bridges_in_footprints yes)')
  await writeFile(files.pcb, next, 'utf8')
  if(placement)await writeFile(path.join(projectDir,`${path.basename(files.pcb,'.kicad_pcb')}.kicad_dru`),'(version 1)\n(rule "BoardForge authoritative package micro drill" (constraint hole_size (min 0.2mm)))\n','utf8')
  // Board005's authoritative WQFN footprint is intentionally proven against
  // a 0.09 mm package rule. Install that rule before creating the immutable
  // copperless candidate so its copied companion .kicad_dru is the rule set
  // KiCad actually validates, rather than the generic 0.20 mm default.
  if(board.id==='usb-c-pd-source') await writeFile(path.join(projectDir,`${path.basename(files.pcb,'.kicad_pcb')}.kicad_dru`),'(version 1)\n(rule "BoardForge TPS25750 fine pitch clearance" (constraint clearance (min 0.09mm)))\n(rule "BoardForge TPS25750 fine pitch track" (constraint track_width (min 0.1mm)))\n(rule "BoardForge TPS25750 micro drill" (constraint hole_size (min 0.2mm)))\n(rule "BoardForge TPS25750 micro via" (constraint via_diameter (min 0.4mm)))\n','utf8')
  // Board005 retains the generic 0.20 mm rule.  Only its TPS25810 REF_RTN
  // escape is allowed to use the source-backed 4 mil (0.10 mm) capability;
  // the routing regression proves no other Board005 net consumes that waiver.
  if(board.id==='usb-c-fixed-source') await writeFile(path.join(projectDir,`${path.basename(files.pcb,'.kicad_pcb')}.kicad_dru`),'(version 1)\n(rule "BoardForge Board005 source-backed 4mil REF_RTN neck" (condition "A.NetName == \'REF_RTN\'") (constraint track_width (min 0.1mm)))\n(rule "BoardForge Board005 conservative default clearance" (constraint clearance (min 0.2mm)))\n(rule "BoardForge Board005 micro drill" (constraint hole_size (min 0.2mm)))\n','utf8')
  const authoritativeRouting=placement?await routeAuthoritativeCandidate({pcbFile:files.pcb,projectDir,kicad}):null
  if(authoritativeRouting?.routingDeferred){
    const error=new Error(`Authoritative routing deferred: ${authoritativeRouting.reason}. Stale final-PCB validation is forbidden; validate ${authoritativeRouting.candidatePcb} only.`)
    error.code='AUTHORITATIVE_ROUTING_DEFERRED';error.routing=authoritativeRouting;throw error
  }
  const report = {
    schema: 'boardforge.category-pcb-evidence.real-proof.v1',
    boardId: board.id,
    status: 'PRODUCTION_ASSETS_PROJECTED',
    pcbFile: files.pcb,
    evidenceLevel: categorySchematic?.status === 'SYMBOL_GRAPH_GENERATED_REVIEW_REQUIRED'
      ? 'pcb_footprint_net_track_evidence_with_parseable_review_schematic'
      : 'pcb_footprint_net_track_evidence_without_real_schematic_symbol_graph',
    noManufacturingClaim: false,
    placedRefs: evidence.footprints.map((footprint) => footprint.ref),
    components: evidence.footprints.map((footprint) => componentLink(board.id, footprint.ref)),
    nets: evidence.nets.map((net) => net.name).filter(Boolean),
    trackCount: evidence.segments.length,
    viaCount: evidence.vias.length,
    placement:placement?{schema:placement.schema,resolvedBeforeRouting:placement.resolvedBeforeRouting,refs:placement.placements.map(row=>row.ref),antennaRequirement:COMPACT_ESP32_S3_1U_PRODUCTION_TOPOLOGY.antenna}:null,
    authoritativeRouting,
    limitations: [],
  }
  await writeJsonAndMarkdown(projectDir, 'BoardForge_Category_PCB_Evidence_Report', report, renderCategoryPcbEvidenceMarkdown(report))
  return report
}

const CATEGORY_PCB_EVIDENCE_WRITERS = {
  'usb-c-esp32-sensor': usbEsp32CategoryPcbEvidence,
  'stm32-controller': stm32ControllerCategoryPcbEvidence,
  'can-gateway': canGatewayCategoryPcbEvidence,
  'rp2040-instrument': rp2040InstrumentCategoryPcbEvidence,
  'usb-c-pd-sink': usbCPdSinkCategoryPcbEvidence,
  'usb-c-pd-source': usbCPdSourceCategoryPcbEvidence,
  // Candidate-only Board005 replacement.  It deliberately uses a TPS25810
  // fixed-current Type-C source; it must never inherit the PD-source writer.
  'usb-c-fixed-source': usbCFixedSourceCategoryPcbEvidence,
  'poe-sensor-production': poeSensorProductionCategoryPcbEvidence,
  'can-sensor-node': canSensorNodeCategoryPcbEvidence,
  'poe-ethernet-sensor': poeEthernetSensorCategoryPcbEvidence,
  'poe-sensor': poeEthernetSensorCategoryPcbEvidence,
  'ethernet-controller': ethernetControllerCategoryPcbEvidence,
  'usb-hub': usbHubCategoryPcbEvidence,
  'odd-shaped-robotics-controller': roboticsControllerCategoryPcbEvidence,
  'tiny-wearable-sensor-puck': wearableSensorPuckCategoryPcbEvidence,
  'industrial-io-board': industrialIoCategoryPcbEvidence,
  'industrial-io-production': industrialIoProductionCategoryPcbEvidence,
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

export function poeEthernetSensorCategoryPcbEvidence() {
  const names=['','SELV_GND','3V3','ETH_TXP','ETH_TXN','ETH_RXP','ETH_RXN','ETH_TX_CT','ETH_RX_CT','XTAL_IN','XTAL_OUT','POE_5V','POE_RECT_POS','POE_RECT_NEG','CHASSIS','I2C_SDA','I2C_SCL','BME_CSB_STRAP','BME_SDO_STRAP','W5500_EXRES','W5500_TOCAP','W5500_1V2','W5500_VBG_FLOAT','SPI_SCLK','SPI_MISO','SPI_MOSI','ETH_CS_N','ETH_INT_N','ETH_RESET_N','POE_AUX','LED_YELLOW_A','LED_YELLOW_K','LED_GREEN_A','LED_GREEN_K'],nets=names.map((name,number)=>({number,name})),n=Object.fromEntries(nets.map(x=>[x.name,x.number]))
  const fp=(ref,value,footprint,x,y,w,h,pins)=>({ref,value,footprint,at:{x,y},body:{w,h},pads:Object.entries(pins).map(([number,netName],i)=>pad(number,(i%4)-1.5,Math.floor(i/4)-1,.6,.6,n[netName],netName))})
  const maps=poeSensorPinMaps()
  return{nets,segments:[],vias:[],footprints:[
    fp('U_ETH','W5500','Package_QFP:LQFP-48_7x7mm_P0.5mm',13,10,7,7,maps.U_ETH),
    fp('J_ETH','ARJP11A-MASA-B-A-EMU2','Connector_RJ:RJ45_Abracon_ARJP11A-MA_Horizontal',11,20,22.59,19.5,maps.J_ETH),
    fp('U_POE','Ag9905LP','Converter_DCDC:Converter_DCDC_Silvertel_Ag99xxLP_THT',30,10,21,14,maps.U_POE),
    fp('Y_ETH','Q22FA2380184517','Crystal:Crystal_SMD_SeikoEpson_FA238-4Pin_3.2x2.5mm',18,5,3.2,2.5,maps.Y_ETH),
    fp('U_SENSOR','BME280','Package_LGA:Bosch_LGA-8_2.5x2.5mm_P0.65mm_ClockwisePinNumbering',39,10,2.5,2.5,maps.U_SENSOR),
    fp('C_POE','UWT1A151MCL1GS','Capacitor_SMD:CP_Elec_8x10.5',29,16,8,10.5,maps.C_POE),
  ]}
}

// A separate, candidate-only Board009 path.  The historical `poe-sensor`
// fixture remains untouched because it documents an earlier six-reference
// projection.  This factory consumes only the per-board authoritative map
// supplied by the production definition and emits every requested exact ref.
export function poeSensorProductionCategoryPcbEvidence(board={}){
 const maps=board.categorySchematicPinMaps||{},rows=board.bom||[]
 const names=['',...new Set(Object.values(maps).flatMap(map=>Object.values(map||{})).filter(Boolean))]
 const nets=names.map((name,number)=>({name,number})),net=Object.fromEntries(nets.map(row=>[row.name,row.number]))
 const position={J_ETH:[11,22,0],U_POE:[29,12,0],C_OUT:[46,36,0],C_OUT_HF:[43,36,0],U_3V3:[48,28,0],U_ETH:[48,14,0],Y_ETH:[42,8,0],U_HOST:[57,26,0],U_FLASH:[60,35,0],U_SENSOR:[64,12,0],J_PROG:[64,30,90]}
 const footprints=rows.map((row,index)=>{const asset=approvedAssetFor(row.mpn);if(!asset)throw new Error(`Board009 production writer lacks approved asset ${row.ref}:${row.mpn}`);const [x,y,rotation]=position[row.ref]||[40+(index%4)*6,5+Math.floor(index/4)*6,0],map=maps[row.ref]||{};return{ref:row.ref,value:row.value||row.mpn,footprint:asset.footprint.libId,at:{x,y},rotation,body:{w:2,h:2},pads:Object.entries(map).filter(([,name])=>name).map(([number,name],pinIndex)=>pad(number,(pinIndex%4)-1.5,Math.floor(pinIndex/4)-1,.6,.6,net[name],name))}})
 return{nets,footprints,segments:[],vias:[]}
}

function poeSensorPinMaps(){return{
 U_ETH:{1:'ETH_TXN',2:'ETH_TXP',3:'SELV_GND',4:'3V3',5:'ETH_RXN',6:'ETH_RXP',8:'3V3',9:'SELV_GND',10:'W5500_EXRES',11:'3V3',14:'SELV_GND',15:'3V3',16:'SELV_GND',17:'3V3',18:'W5500_VBG_FLOAT',19:'SELV_GND',20:'W5500_TOCAP',21:'3V3',22:'W5500_1V2',28:'3V3',29:'SELV_GND',30:'XTAL_IN',31:'XTAL_OUT',32:'ETH_CS_N',33:'SPI_SCLK',34:'SPI_MISO',35:'SPI_MOSI',36:'ETH_INT_N',37:'ETH_RESET_N',48:'SELV_GND'},
 J_ETH:{1:'ETH_TXP',2:'ETH_TXN',3:'ETH_RXP',4:'ETH_TX_CT',5:'ETH_RX_CT',6:'ETH_RXN',7:'POE_AUX',9:'POE_RECT_POS',10:'POE_RECT_NEG',11:'LED_YELLOW_A',12:'LED_YELLOW_K',13:'LED_GREEN_A',14:'LED_GREEN_K',SH:'CHASSIS'},
 U_POE:{1:'POE_5V',2:'POE_5V',3:'SELV_GND',5:'POE_RECT_POS',6:'POE_RECT_POS',7:'POE_RECT_NEG',8:'POE_RECT_NEG'},
 Y_ETH:{1:'XTAL_IN',2:'SELV_GND',3:'XTAL_OUT',4:'SELV_GND'},
 // Bosch BST-BME280-DS001 Table 35: CSB=2, SDI/SDA=3, SCK/SCL=4,
 // SDO/address=5, VDDIO=6 and VDD=8. Preserve strap semantics explicitly.
 U_SENSOR:{1:'SELV_GND',2:'BME_CSB_STRAP',3:'I2C_SDA',4:'I2C_SCL',5:'BME_SDO_STRAP',6:'3V3',7:'SELV_GND',8:'3V3'},
 C_POE:{1:'POE_5V',2:'SELV_GND'},
}}

export function ethernetControllerCategoryPcbEvidence(){
 const maps=ethernetControllerPinMaps(),names=['',...new Set(Object.values(maps).flatMap(Object.values))],nets=names.map((name,number)=>({name,number})),net=Object.fromEntries(nets.map(x=>[x.name,x.number]))
 const bom=ethernetControllerProductionProposal.bom.map(({ref,mpn})=>[ref,mpn,approvedAssetFor(mpn).footprint.libId])
 // The W5500 analog/RMII support is deliberately clustered around the PHY.
 // A generic BOM grid made the 25 MHz crystal, EXRES and decoupling tens of
 // millimetres away and was physically unroutable on this compact board.
 const placement={
  U1:[10,14],U2:[23,14],J1:[35,14],U3:[4,5],U4:[7,22],J_PWR:[3,4],
  Y1:[18.5,10.5],C_XI:[19,9],C_XO:[20,9],R_EXRES:[18,17],
  FB_AVDD:[27,14],C_AVDD:[28,14],C_TOCAP:[27,17],C_1V2:[28,17],
  R_TXP:[29,11],R_TXN:[29,12],R_RXP:[29,16],R_RXN:[29,17],R_TX_CT:[31,10],
  C_RXP:[31,16],C_RXN:[31,18],C_RX_MATCH:[33,17],C_AVDD_REF:[29,19],
  R_RST:[18,19],C_RST:[19,19],R_MODE0:[18,21],R_MODE1:[19,21],R_MODE2:[20,21],C_DEC:[13,20],
 }
 const footprints=bom.map(([ref,value,footprint],index)=>{const [x,y]=placement[ref]||[5+(index%6)*6,5+Math.floor(index/6)*6];return{ref,value,footprint,at:{x,y},body:{w:2,h:2},pads:Object.entries(maps[ref]).map(([number,netName],i)=>pad(number,(i%4)-1.5,Math.floor(i/4)-1,.6,.6,net[netName],netName))}})
 return{nets,footprints,segments:[],vias:[]}
}

function ethernetControllerPinMaps(){return{
 U1:{1:'3V3',6:'SPI_SCLK',7:'SPI_MOSI',8:'SPI_MISO',9:'ETH_CS_N',10:'3V3',11:'ETH_RESET_N',12:'ETH_INT_N',48:'3V3',49:'3V3',50:'3V3',51:'QSPI_SD3',52:'QSPI_SCLK',53:'QSPI_SD0',54:'QSPI_SD2',55:'QSPI_SD1',56:'QSPI_CS',57:'GND'},
 U2:{1:'ETH_TXN',2:'ETH_TXP',3:'GND',4:'3V3A',5:'ETH_RXN_PHY',6:'ETH_RXP_PHY',8:'3V3A',9:'GND',10:'EXRES1',11:'3V3A',14:'GND',15:'3V3A',16:'GND',17:'3V3A',19:'GND',20:'TOCAP',21:'3V3A',22:'1V2O',28:'3V3',29:'GND',30:'XTAL_IN',31:'XTAL_OUT',32:'ETH_CS_N',33:'SPI_SCLK',34:'SPI_MISO',35:'SPI_MOSI',36:'ETH_INT_N',37:'ETH_RESET_N',43:'PMODE2',44:'PMODE1',45:'PMODE0',48:'GND'},
 // 7499010121A pin 5 is intentionally left open by the published W5500
 // connected-centre-tap reference.  Do not manufacture an isolated global
 // label merely to make every connector pad appear electrically active.
 Y1:{1:'XTAL_IN',2:'GND',3:'XTAL_OUT',4:'GND'},J1:{1:'ETH_TXP',2:'ETH_TX_CT',3:'ETH_TXN',4:'ETH_RXP_MAG',6:'ETH_RXN_MAG',8:'CHASSIS',SH:'CHASSIS'},
 U3:{1:'GND',2:'3V3',3:'5V'},U4:{1:'QSPI_CS',2:'QSPI_SD1',3:'QSPI_SD2',4:'GND',5:'QSPI_SD0',6:'QSPI_SCLK',7:'QSPI_SD3',8:'3V3'},J_PWR:{1:'5V',2:'GND'},C_DEC:{1:'3V3',2:'GND'},R_RST:{1:'3V3',2:'ETH_RESET_N'},C_RST:{1:'ETH_RESET_N',2:'GND'},R_MODE0:{1:'3V3',2:'PMODE0'},R_MODE1:{1:'3V3',2:'PMODE1'},R_MODE2:{1:'3V3',2:'PMODE2'},R_EXRES:{1:'EXRES1',2:'GND'},R_TXP:{1:'ETH_TXP',2:'3V3A'},R_TXN:{1:'ETH_TXN',2:'3V3A'},R_RXP:{1:'ETH_RXP_PHY',2:'ETH_RX_MATCH'},R_RXN:{1:'ETH_RXN_PHY',2:'ETH_RX_MATCH'},R_TX_CT:{1:'ETH_TX_CT',2:'3V3A'},C_RXP:{1:'ETH_RXP_PHY',2:'ETH_RXP_MAG'},C_RXN:{1:'ETH_RXN_PHY',2:'ETH_RXN_MAG'},C_RX_MATCH:{1:'ETH_RX_MATCH',2:'GND'},C_AVDD_REF:{1:'3V3A',2:'GND'},C_XI:{1:'XTAL_IN',2:'GND'},C_XO:{1:'XTAL_OUT',2:'GND'},FB_AVDD:{1:'3V3',2:'3V3A'},C_AVDD:{1:'3V3A',2:'GND'},C_TOCAP:{1:'TOCAP',2:'GND'},C_1V2:{1:'1V2O',2:'GND'},
 }}

// Board011 is a concrete training candidate.  The symbol maps are the exact
// approved assets and the physical footprints are resolved from those assets;
// this writer deliberately contains no invented copper.  Its final status is
// therefore still gated by real placement, routing, thermal, sourcing and
// KiCad evidence rather than by this projected candidate alone.
export function usbHubCategoryPcbEvidence(){
 const definition=board011UsbHubProductionDefinition(),maps=board011UsbHubPinMaps()
 const names=['',...new Set(Object.values(maps).flatMap(Object.values).filter(Boolean))]
 const nets=names.map((name,number)=>({name,number})),net=Object.fromEntries(nets.map(x=>[x.name,x.number]))
 const positions=board011UsbHubPcbPlacements()
 const footprints=definition.bom.map((row)=>{
   const [x,y]=positions[row.ref]||[]
   if(!Number.isFinite(x)||!Number.isFinite(y))throw new Error(`Board011 physical candidate is missing an exact placement for ${row.ref}`)
   const asset=approvedAssetFor(row.mpn),map=maps[row.ref]
   return {ref:row.ref,value:row.mpn,footprint:asset.footprint.libId,at:{x,y},body:{w:2,h:2},pads:Object.entries(map).map(([number,netName],pinIndex)=>pad(number,(pinIndex%4)-1.5,Math.floor(pinIndex/4)-1,.6,.6,net[netName],netName))}
 })
 const localPadStitches=board011UsbHubLocalPadStitches(),dfpGroundPadStitches=board011UsbHubDfpGroundPadStitches(),connectorShieldPadStitches=board011UsbHubConnectorShieldPadStitches(),supportNetStitches=board011UsbHubSupportNetStitches(),usbEsdPassThroughStitches=board011UsbHubUsbEsdPassThroughStitches(),powerPadStitches=board011UsbHubPowerPadStitches()
 const localCopperGuard=validateBoard011UsbHubLocalCopper([...localPadStitches,...dfpGroundPadStitches,...connectorShieldPadStitches,...supportNetStitches,...usbEsdPassThroughStitches,...powerPadStitches])
 if(!localCopperGuard.ok)throw new Error(`Board011 rejected local copper shortcut: ${localCopperGuard.rejected.join(', ')}`)
 // USB2514B RBIAS is an isolated two-terminal control net.  Its route starts
 // from the resolver-projected QFN pad 35, dogbones perpendicular to the top
 // pad row, and uses In1.Cu until the dedicated 12 kOhm resistor.  This is a
 // scoped physical route contract, not an inferred all-board autoroute: the
 // route is deliberately retained only while the exact Board011 placement
 // signature and real KiCad DRC keep it legal.
 const segments=[
   segment(42.5,15.063,42.5,14.2,.2,net.RBIAS),
   segment(42.5,14.2,41.3,14.2,.2,net.RBIAS),
   segment(41.3,14.2,41.3,3.5,.2,net.RBIAS,'In1.Cu'),
   segment(41.3,3.5,15.175,3.5,.2,net.RBIAS,'In1.Cu'),
   segment(15.175,3.5,15.175,2,.2,net.RBIAS),
   // Keep the two PLLFILT capacitors as a paired local branch.  Their 0603
   // pads are separated by the opposite GND pads on F.Cu, so the short
   // shared branch deliberately changes to In1.Cu rather than crossing a
   // foreign pad.  The hub-pin escape remains independently unrouted.
   segment(35.225,12.8,35.225,14.5,.2,net.PLLFILT),
   segment(35.225,14.5,38.725,14.5,.2,net.PLLFILT,'In1.Cu'),
   segment(38.725,14.5,38.725,12.8,.2,net.PLLFILT),
   // CRFILT is intentionally a separate USB2514B analog filter network;
   // never merge it with PLLFILT.  Its paired capacitors use their own
   // lower-row In1.Cu branch for the same no-foreign-pad escape rationale.
   segment(28.225,12.8,28.225,14.5,.2,net.CRFILT),
   segment(28.225,14.5,31.725,14.5,.2,net.CRFILT,'In1.Cu'),
   segment(31.725,14.5,31.725,12.8,.2,net.CRFILT),
   // The USB2514B reset RC parts are adjacent on the dedicated top support
   // row.  Their RESET_N pads have an unobstructed direct F.Cu connection;
   // retain that source-backed local link before attempting the long U1.26
   // escape, rather than asking a general router to invent a reset route.
   segment(8.825,2,11.225,2,.2,net.RESET_N),
   // U1.26 exits to the controller's right before changing layers.  RESET_N
   // owns y=4.6 on In2.Cu, distinct from the RBIAS In1.Cu corridor, then
   // returns to the already-proven RC pair through C_RESET.1.
   segment(46.938,16.5,48.5,16.5,.2,net.RESET_N),
   segment(48.5,16.5,48.5,4.6,.2,net.RESET_N,'In2.Cu'),
   segment(48.5,4.6,11.225,4.6,.2,net.RESET_N,'In2.Cu'),
   segment(11.225,4.6,11.225,2,.2,net.RESET_N),
   // TPS25810 IN1/IN1/IN2 and OUT/OUT are duplicated adjacent pads.  The
   // reusable contract below joins each controller's local cluster only; the
   // wider 5 V and connector trees remain explicitly unrouted.
   ...localPadStitches.map(({ start, end, widthMm, netName, layer }) => segment(start.x,start.y,end.x,end.y,widthMm,net[netName],layer)),
   // These are only the adjacent TPS25810 CHG ground lands.  They neither
   // fabricate a plane nor imply a completed port-return topology.
   ...dfpGroundPadStitches.map(({ start, end, widthMm, netName, layer }) => segment(start.x,start.y,end.x,end.y,widthMm,net[netName],layer)),
   // Each retained USB-C shield stitch joins only its paired mechanical tabs.
   // It does not represent a ground network or connector return path.
   ...connectorShieldPadStitches.map(({ start, end, widthMm, netName, layer }) => segment(start.x,start.y,end.x,end.y,widthMm,net[netName],layer)),
   // The feedback-divider midpoint is a completed local regulator support
   // connection, not a claim that the surrounding buck power loop is routed.
   ...supportNetStitches.map(({ start, end, widthMm, netName, layer }) => segment(start.x,start.y,end.x,end.y,widthMm,net[netName],layer)),
   // The ESD arrays retain matched local D+/D- pass-through links only. The
   // external differential-pair corridors remain pending and are never
   // represented by these short package-local stitches.
   ...usbEsdPassThroughStitches.map(({ start, end, widthMm, netName, layer }) => segment(start.x,start.y,end.x,end.y,widthMm,net[netName],layer)),
   // Package-local PowerPAK/HSOP conductivity links are not board rails.
   ...powerPadStitches.map(({ start, end, widthMm, netName, layer }) => segment(start.x,start.y,end.x,end.y,widthMm,net[netName],layer)),
 ]
 const vias=[via(41.3,14.2,net.RBIAS),via(15.175,3.5,net.RBIAS),via(35.225,14.5,net.PLLFILT),via(38.725,14.5,net.PLLFILT),via(28.225,14.5,net.CRFILT),via(31.725,14.5,net.CRFILT),via(48.5,16.5,net.RESET_N),via(11.225,4.6,net.RESET_N)]
 return {nets,footprints,segments,vias}
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

export function usbEsp32CategoryPcbEvidence() {
  const nets = [
    { number: 0, name: '' },
    { number: 1, name: 'GND' },
    { number: 2, name: 'VUSB' },
    { number: 3, name: '3V3' },
    { number: 4, name: 'USB_DP' },
    { number: 5, name: 'USB_DN' },
    { number: 6, name: 'I2C_SCL' },
    { number: 7, name: 'I2C_SDA' },
    { number: 8, name: 'UART_TX' },
    { number: 9, name: 'UART_RX' },
    { number: 10, name: 'CC1' },
    { number: 11, name: 'CC2' },
  ]
  const net = Object.fromEntries(nets.map((item) => [item.name, item.number]))
  // Legacy topology coordinates below are discarded by authoritative routing,
  // but keep their aliases pointed at the canonical production net names while
  // the exact installed footprint pads are projected.
  net.VBUS=net.VUSB;net['+3V3']=net['3V3'];net.USB_D_P=net.USB_DP;net.USB_D_N=net.USB_DN
  const footprints = [
    {
      ref: 'J1',
      value: 'USB-C receptacle candidate',
      footprint: 'BoardForge_Proof:USB_C_Receptacle_ReviewRequired',
      at: { x: 8, y: 19 },
      body: { w: 5.8, h: 9 },
      pads: [
        pad('A1', 2.4, -4, 0.8, 0.8, net.GND, 'GND'),
        pad('B12', 2.4, -4, 0.8, 0.8, net.GND, 'GND'),
        pad('A4', 2.4, -2, 0.8, 0.8, net.VBUS, 'VBUS'),
        pad('B9', 2.4, -2, 0.8, 0.8, net.VBUS, 'VBUS'),
        pad('A6', 2.4, 1, 0.55, 0.8, net.USB_D_P, 'USB_D_P'),
        pad('B6', 2.4, 1, 0.55, 0.8, net.USB_D_P, 'USB_D_P'),
        pad('A7', 2.4, 3, 0.55, 0.8, net.USB_D_N, 'USB_D_N'),
        pad('B7', 2.4, 3, 0.55, 0.8, net.USB_D_N, 'USB_D_N'),
        pad('A5', 2.4, 5, 0.55, 0.8, net.CC1, 'CC1'),
        pad('B5', 2.4, 7, 0.55, 0.8, net.CC2, 'CC2'),
      ],
    },
    {
      ref: 'U2',
      value: '3.3V regulator candidate',
      footprint: 'BoardForge_Proof:SOT_223_Regulator_ReviewRequired',
      at: { x: 22, y: 17 },
      body: { w: 5.4, h: 4.6 },
      pads: [
        pad('1', -2, 2, 0.9, 0.8, net.GND, 'GND'),
        pad('2', 2.2, 0, 1.1, 1.6, net['+3V3'], '+3V3'),
        pad('3', -2, 0, 0.9, 0.8, net.VBUS, 'VBUS'),
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
    { ref: 'R1', value: '5.1k CC1 sink pull-down', footprint: 'BoardForge_Proof:R_0603', at: { x: 15, y: 27 }, body: { w: 2, h: 1 }, pads: [pad('1', -1.1, 0, 0.8, 0.8, net.CC1, 'CC1'), pad('2', 1.1, 0, 0.8, 0.8, net.GND, 'GND')] },
    { ref: 'R2', value: '5.1k CC2 sink pull-down', footprint: 'BoardForge_Proof:R_0603', at: { x: 15, y: 30 }, body: { w: 2, h: 1 }, pads: [pad('1', -1.1, 0, 0.8, 0.8, net.CC2, 'CC2'), pad('2', 1.1, 0, 0.8, 0.8, net.GND, 'GND')] },
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
    segment(10.4, 24, 13.9, 27, 0.2, net.CC1),
    segment(10.4, 26, 13.9, 30, 0.2, net.CC2),
    segment(16.1, 27, 16.1, 30, 0.3, net.GND),
    segment(16.1, 27, 18, 32, 0.3, net.GND),
    segment(18, 32, 32, 32, 0.3, net.GND),
    segment(32, 32, 32, 21, 0.3, net.GND),
    segment(32, 21, 30, 21, 0.3, net.GND),
    segment(10.4, 15, 20, 19, 0.3, net.GND, 'B.Cu'),
    segment(20, 19, 30, 21, 0.3, net.GND),
  ]
  const vias = [via(10.4, 15, net.GND), via(20, 19, net.GND)]
  return { nets, footprints, segments, vias }
}

async function routeAuthoritativeCandidate({pcbFile,projectDir,kicad}){
  const candidateDir=path.join(projectDir,'.boardforge-candidates'),stem=path.basename(pcbFile,'.kicad_pcb'),copperlessFile=path.join(candidateDir,`${stem}.authoritative-copperless.kicad_pcb`),candidateFile=path.join(candidateDir,`${stem}.authoritative-route.kicad_pcb`)
  await mkdir(candidateDir,{recursive:true})
  try{
    const copperless=await createCopperlessAuthoritativeCandidate({pcbFile,candidateFile:copperlessFile})
    const copperlessScan=await scanKiCadProject(copperlessFile)
    const routingInput=authoritativePadRoutingInput(copperlessScan)
    const ethernetTopology=validateW5500ConnectedCtTopology(routingInput)
    if(ethernetTopology.applicable&&!ethernetTopology.valid)return{
      ...copperless,status:'COPPERLESS_CANDIDATE_READY',code:'W5500_CONNECTED_CENTRE_TAP_TOPOLOGY_UNVERIFIED',
      reason:`W5500 connected-centre-tap topology is not source-backed: ${ethernetTopology.errors.join('; ')}`,
      routingDeferred:true,topologyGate:ethernetTopology,
    }
    const fixed=authoritativeFixedCorridors(routingInput,{trackWidth:.2,viaDiameter:.5})
    const fixedComplete=routingInput.nets.every(({net})=>fixed.completedNets.includes(net)||/^GND$/i.test(net))
    // A large QFP has many deliberately unconnected physical pads. They are
    // not routing trees: authoritativePadRoutingInput has already excluded
    // singleton nets. Measure the real connection graph, not raw pad count,
    // so a compact board with a sparse functional topology reaches the
    // candidate router instead of being rejected as a fictitious dense fanout.
    const routableEndpointCount=routingInput.nets.reduce((sum,tree)=>sum+tree.endpoints.length,0)
    // The generic channel search is combinatorial on dense MCU fanout. Preserve
    // a deterministic zero-copper transaction baseline instead of consuming
    // the campaign watchdog or falling back to stale proof-coordinate copper.
    if(routableEndpointCount>80&&!fixedComplete){
      // Preserve each verified local routing increment as its own immutable
      // candidate.  This lets dense designs prove exact copper and real KiCad
      // DRC progress without pretending that a first support branch is a
      // complete board route.
      if(fixed.completedNets.length){
        const localCandidate=path.join(candidateDir,`${stem}.authoritative-local-support.kicad_pcb`)
        const localRouting=await regenerateAuthoritativePadRoutesCandidate({pcbFile:copperlessFile,candidateFile:localCandidate,includeNets:fixed.completedNets,includeGroundPlanes:false,trackWidth:.2,viaDiameter:.5})
        const sourceRules=pcbFile.replace(/\.kicad_pcb$/i,'.kicad_dru'),candidateRules=localCandidate.replace(/\.kicad_pcb$/i,'.kicad_dru')
        const rules=await readFile(sourceRules,'utf8').catch(()=>null);if(rules)await writeFile(candidateRules,rules,'utf8')
        const localDrc=kicad?.available?await runDrc({pcbFile:localCandidate,outputFile:path.join(candidateDir,'authoritative-local-support-drc.json'),kicadCliPath:kicad.path}):null
        return{...copperless,status:'LOCAL_ROUTING_CANDIDATE_READY',candidatePcb:localCandidate,reason:'Dense authoritative fanout requires further topology-specific routing after the verified local-support increment',routingDeferred:true,localRouting,localDrc}
      }
      return{...copperless,status:'COPPERLESS_CANDIDATE_READY',candidatePcb:copperlessFile,reason:'Dense authoritative fanout requires a topology-specific routing strategy',routingDeferred:true}
    }
    const routing=await regenerateAuthoritativePadRoutesCandidate({pcbFile:copperlessFile,candidateFile,viaDiameter:.5})
    if(!kicad?.available)return {...routing,status:'CANDIDATE_NOT_PROMOTED',reason:kicad?.reason||'KiCad CLI unavailable'}
    const sourceRules=pcbFile.replace(/\.kicad_pcb$/i,'.kicad_dru'),candidateRules=candidateFile.replace(/\.kicad_pcb$/i,'.kicad_dru')
    const rules=await readFile(sourceRules,'utf8').catch(()=>null);if(rules)await writeFile(candidateRules,rules,'utf8')
    const drc=await runDrc({pcbFile:candidateFile,outputFile:path.join(candidateDir,'authoritative-route-drc.json'),kicadCliPath:kicad.path})
    const accepted=drc.status==='DRC_PASSED'&&drc.issueCounts?.errors===0
    if(accepted)await copyFile(candidateFile,pcbFile)
    return {...routing,sourcePcb:pcbFile,status:accepted?'CANDIDATE_PROMOTED':'CANDIDATE_REJECTED',drc:{status:drc.status,exitCode:drc.exitCode,issueCounts:drc.issueCounts,reportFile:drc.reportFile}}
  }catch(error){return{schema:'boardforge.authoritative-pad-route-candidate.v1',status:'CANDIDATE_REJECTED',code:error.code||'AUTHORITATIVE_ROUTING_FAILED',net:error.net||null,reason:String(error.message||error)}}
}

function authoritativeProductionPlacement(board,projected){
  // Board011 deliberately has no accepted physical placement yet.  Its
  // canonical-footprint candidate must remain emit-able for KiCad review, but
  // may not invoke the generic placement solver and turn an absent placement
  // proof into an invented authoritative one.
  if((board.topologyId||board.id)==='usb-hub')return null
  const outline=(board.outlinePoints?.length?board.outlinePoints:[[0,0],[board.widthMm,0],[board.widthMm,board.heightMm],[0,board.heightMm]]).map(([x,y])=>({x,y}))
  const topologyPinMaps=categorySchematicPinMaps(board)
  const components=board.bom.map(row=>{
    const component=projected.get(row.ref),asset=approvedAssetFor(row.mpn)
    if(!asset||!component)throw new Error(`Approved authoritative placement asset is missing for ${row.ref}`)
    const fixedAt=board.id==='board009-poe-production'?board009LocalSupportPlacement(row.ref):null
    return {ref:row.ref,value:row.value,mpn:row.mpn,footprint:asset.footprint.libId,pinMap:topologyPinMaps[row.ref]||asset.footprintPadMap,...(fixedAt?{fixedAt}: {})}
  })
  return placeAuthoritativeProductionFootprints({components,outline,holes:board.holes||[],topology:board.placementTopologyId||board.topologyId||board.id||'generic'})
}

function footprintPadToSymbolPin(board,ref,pad){
  const mpn=board.bom.find(row=>row.ref===ref)?.mpn
  if(mpn==='USB4105-GF-A'&&pad==='S1')return'SH'
  return String(pad)
}

function industrialIoProductionCategoryPcbEvidence(){
  const names=['','GND','3V3','5V','FIELD_GND','FIELD_5V','FIELD_24V_RAW','FIELD_24V_FUSED','FIELD_IN1','FIELD_IN2','LOGIC_IN1','LOGIC_IN2'],nets=names.map((name,number)=>({number,name})),n=Object.fromEntries(nets.map(x=>[x.name,x.number]))
  const fp=(ref,value,footprint,x,y,w,h,pads)=>({ref,value,footprint,at:{x,y},body:{w,h},pads})
  const footprints=[
    fp('J1','1725656','BoardForge:Phoenix_1725656_P5.08',8,19,6,18,[pad('1',2,-6,1.8,2,n.FIELD_24V_RAW,'FIELD_24V_RAW'),pad('2',2,-2,1.8,2,n.FIELD_GND,'FIELD_GND'),pad('3',2,2,1.8,2,n.FIELD_IN1,'FIELD_IN1'),pad('4',2,6,1.8,2,n.FIELD_IN2,'FIELD_IN2')]),
    fp('F1','0451002.MRL','Fuse:Fuse_1206_3216Metric',17,11,4,2,[pad('1',-2,0,1.4,1.4,n.FIELD_24V_RAW,'FIELD_24V_RAW'),pad('2',2,0,1.4,1.4,n.FIELD_24V_FUSED,'FIELD_24V_FUSED')]),
    fp('D1','SMBJ33A','Diode_SMD:D_SMB',17,19,5,3,[pad('1',-3,0,1.5,1.5,n.FIELD_24V_FUSED,'FIELD_24V_FUSED'),pad('2',3,0,1.5,1.5,n.FIELD_GND,'FIELD_GND')]),
    fp('U1','ISO1212DBQR','Package_SO:SSOP-16_3.9x4.9mm_P0.635mm',29,19,5,10,[pad('1',-3,-4,.7,.6,n.FIELD_IN1,'FIELD_IN1'),pad('4',-3,-2,.7,.6,n.FIELD_24V_FUSED,'FIELD_24V_FUSED'),pad('5',-3,2,.7,.6,n.FIELD_IN2,'FIELD_IN2'),pad('8',-3,4,.7,.6,n.FIELD_GND,'FIELD_GND'),pad('9',3,4,.7,.6,n.GND,'GND'),pad('10',3,2,.7,.6,n.LOGIC_IN2,'LOGIC_IN2'),pad('13',3,-2,.7,.6,n['3V3'],'3V3'),pad('14',3,-4,.7,.6,n.LOGIC_IN1,'LOGIC_IN1')]),
    fp('U2','STM32F103C8T6','Package_QFP:LQFP-48_7x7mm_P0.5mm',45,19,8,8,[pad('23',-4,2,.7,.6,n.GND,'GND'),pad('24',-4,0,.7,.6,n['3V3'],'3V3'),pad('32',-4,-2,.7,.6,n.LOGIC_IN1,'LOGIC_IN1'),pad('33',4,-2,.7,.6,n.LOGIC_IN2,'LOGIC_IN2')]),
    fp('U3','RFM-0505S','BoardForge:RFM-0505S_THT',45,31,10,5,[pad('1',-4,0,1.5,1.5,n['5V'],'5V'),pad('2',-1.4,0,1.5,1.5,n.GND,'GND'),pad('3',1.4,0,1.5,1.5,n.FIELD_GND,'FIELD_GND'),pad('4',4,0,1.5,1.5,0,'')]),
    fp('J2','M20-9990645','Connector_PinHeader_2.54mm:PinHeader_1x06_P2.54mm_Vertical',57,19,3,15,[pad('1',0,-6,1,1,n.GND,'GND'),pad('2',0,-3.6,1,1,n['3V3'],'3V3'),pad('3',0,-1.2,1,1,n.LOGIC_IN1,'LOGIC_IN1'),pad('4',0,1.2,1,1,n.LOGIC_IN2,'LOGIC_IN2'),pad('5',0,3.6,1,1,n['5V'],'5V'),pad('6',0,6,1,1,n.GND,'GND')]),
  ],evidence={nets,footprints,segments:[],vias:[]}
  const route=(netName,layer,pts)=>{for(let i=1;i<pts.length;i++)evidence.segments.push(segment(...pts[i-1],...pts[i],.28,n[netName],layer));if(layer!=='F.Cu'){const pads=new Set(footprints.flatMap(f=>f.pads.filter(p=>p.netName===netName).map(p=>`${f.at.x+p.x},${f.at.y+p.y}`)));for(const p of pts)if(pads.has(`${p[0]},${p[1]}`))evidence.vias.push(via(...p,n[netName]))}}
  route('FIELD_24V_RAW','F.Cu',[[10,13],[15,11]]);route('FIELD_24V_FUSED','F.Cu',[[19,11],[22,11],[22,17],[14,19],[22,17],[26,17]]);route('FIELD_IN1','F.Cu',[[10,21],[7,21],[7,5],[26,5],[26,15]]);route('FIELD_IN2','F.Cu',[[10,25],[12,29],[23,29],[23,21],[26,21]]);route('FIELD_GND','In2.Cu',[[10,17],[20,19],[26,23],[46.4,31]]);route('LOGIC_IN1','F.Cu',[[32,15],[41,17],[43,7],[59,7],[59,17.8],[57,17.8]]);route('LOGIC_IN2','B.Cu',[[32,21],[49,17],[57,20.2]]);route('3V3','F.Cu',[[32,17],[35,25],[41,19],[47,27],[53,27],[53,15.4],[57,15.4]]);route('GND','B.Cu',[[32,23],[41,21],[43.6,31],[57,25],[60,25],[60,13],[57,13]]);route('5V','F.Cu',[[41,31],[39,34],[55,34],[55,22.6],[57,22.6]])
  // Board006 v1 tracks were tied to an obsolete four-pin isolator map. The
  // authoritative router must start from the current ISO1212 endpoints;
  // carrying these coordinates forward would create real shorts, not proof.
  evidence.segments=[]
  evidence.vias=[]
  return evidence
}

export function usbCPdSourceCategoryPcbEvidence(){
  const names=['','GND','5V_RAW','PP5V','3V3','1V5','VBUS','CC1','CC2','EEPROM_SDA','EEPROM_SCL','DRAIN','PPHV_NC20','PPHV_NC21','PPHV_NC22','ADCIN1','ADCIN2','I2CS_SDA','I2CS_SCL','I2CS_IRQ','I2CM_IRQ','GPIO0','GPIO1','GPIO2','GPIO3','GPIO4','GPIO5','GPIO6','GPIO7','GPIO11']
  const nets=names.map((name,number)=>({number,name})),n=Object.fromEntries(nets.map(x=>[x.name,x.number]))
  const fp=(ref,value,footprint,x,y,w,h,pads)=>({ref,value,footprint,at:{x,y},body:{w,h},pads})
  const pnet={1:'3V3',2:'ADCIN1',3:'ADCIN2',4:'1V5',5:'GPIO0',6:'GPIO1',7:'GPIO2',8:'I2CS_SDA',9:'I2CS_SCL',10:'I2CS_IRQ',11:'GND',12:'GND',13:'GPIO11',14:'GND',15:'DRAIN',16:'EEPROM_SDA',17:'EEPROM_SCL',18:'I2CM_IRQ',19:'GPIO3',20:'PPHV_NC20',21:'PPHV_NC21',22:'PPHV_NC22',23:'VBUS',24:'VBUS',25:'VBUS',26:'GPIO4',27:'GPIO5',28:'CC1',29:'CC2',30:'DRAIN',31:'GND',32:'VBUS',33:'VBUS',34:'PP5V',35:'PP5V',36:'GPIO7',37:'GPIO6',38:'3V3',39:'GND',40:'DRAIN'}
  const u2Pads=[]
  for(let pin=1;pin<=10;pin++){const net=pnet[pin];u2Pads.push(pad(String(pin),-3.2,-1.8+(pin-1)*.4,.35,.18,n[net],net))}
  for(let pin=11;pin<=19;pin++){const net=pnet[pin];u2Pads.push(pad(String(pin),-1.6+(pin-11)*.4,2.2,.18,.35,n[net],net))}
  for(let pin=20;pin<=29;pin++){const net=pnet[pin];u2Pads.push(pad(String(pin),3.2,1.8-(pin-20)*.4,.35,.18,n[net],net))}
  for(let pin=30;pin<=38;pin++){const net=pnet[pin];u2Pads.push(pad(String(pin),1.6-(pin-30)*.4,-2.2,.18,.35,n[net],net))}
  u2Pads.push(pad('39',-.7,0,1,1,n.GND,'GND'),pad('40',.7,0,1,1,n.DRAIN,'DRAIN'))
  const ux=31,uy=16
  const footprints=[
    fp('J1','M20-9990245','Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical',2.5,10,3,6,[pad('1',0,-1.3,1,1,n['5V_RAW'],'5V_RAW'),pad('2',0,1.3,1,1,n.GND,'GND')]),
    fp('F1','3413.0218.22','Resistor_SMD:R_2512_6332Metric',9,8.7,6.3,3.2,[pad('1',-3.5,0,1.5,1.5,n['5V_RAW'],'5V_RAW'),pad('2',3.5,0,1.5,1.5,n.PP5V,'PP5V')]),
    fp('D1','SMAJ5.0A','Diode_SMD:D_SMA',9,15,4.5,2.5,[pad('1',0,-2.8,1.5,1.5,n.PP5V,'PP5V'),pad('2',0,2.8,1.5,1.5,n.GND,'GND')]),
    fp('U1','MCP1700T-3302E/TT','Package_TO_SOT_SMD:SOT-23',17,17,3,3,[pad('1',-1.8,-1,.8,.7,n.GND,'GND'),pad('2',-1.8,1,.8,.7,n['3V3'],'3V3'),pad('3',1.8,0,.8,.7,n.PP5V,'PP5V')]),
    fp('U2','TPS25750DRJKR','Package_DFN_QFN:Texas_REF0038A_WQFN-38-2EP_6x4mm_P0.4',ux,uy,7,7,u2Pads),
    fp('U3','M24C64-WMN6TP','Package_SO:SO-8_3.9x4.9mm_P1.27mm',27,17,5,5,[pad('1',-2,-1.9,.6,.6,n.GND,'GND'),pad('2',-2,-.65,.6,.6,n.GND,'GND'),pad('3',-2,.65,.6,.6,n.GND,'GND'),pad('4',-2,1.9,.6,.6,n.GND,'GND'),pad('5',2,1.9,.6,.6,n.EEPROM_SDA,'EEPROM_SDA'),pad('6',2,.65,.6,.6,n.EEPROM_SCL,'EEPROM_SCL'),pad('7',2,-.65,.6,.6,n.GND,'GND'),pad('8',2,-1.9,.6,.6,n['3V3'],'3V3')]),
    fp('J2','USB4105-GF-A','Connector_USB:USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal',44,9,5,12,[pad('A1',2,-5,.7,.7,n.GND,'GND'),pad('B12',2,-4,.7,.7,n.GND,'GND'),pad('A4',2,-3,.8,.8,n.VBUS,'VBUS'),pad('B9',2,-2,.8,.8,n.VBUS,'VBUS'),pad('A5',2,-1,.7,.7,n.CC1,'CC1'),pad('B5',2,0,.7,.7,n.CC2,'CC2'),pad('S1',2,5,.8,.8,n.GND,'GND')]),
    fp('D2','SMAJ5.0A','Diode_SMD:D_SMA',39,17,4.5,2.5,[pad('1',0,-2.8,1.5,1.5,n.VBUS,'VBUS'),pad('2',0,2.8,1.5,1.5,n.GND,'GND')]),
    fp('C_PP5V','UWT1A151MCL1GS','Capacitor_SMD:CP_Elec_8x10.5',15,6.5,8,10.5,[pad('1',0,-4.5,1.7,1.7,n.PP5V,'PP5V'),pad('2',0,4.5,1.7,1.7,n.GND,'GND')]),
    fp('C_VBUS','UWT1E4R7MCL1GB','Capacitor_SMD:CP_Elec_4x5.4',36.5,6,4,5.4,[pad('1',0,-3,1.2,1.2,n.VBUS,'VBUS'),pad('2',0,3,1.2,1.2,n.GND,'GND')]),
    fp('C_3V3','UWT1E220MCL1GB','Capacitor_SMD:CP_Elec_6.3x5.4',18,17,5.4,6.3,[pad('1',0,-3.5,1.5,1.5,n['3V3'],'3V3'),pad('2',0,3.5,1.5,1.5,n.GND,'GND')]),
    fp('C_1V5','UWT1E220MCL1GB','Capacitor_SMD:CP_Elec_6.3x5.4',33,17,5.4,6.3,[pad('1',0,-3.5,1.5,1.5,n['1V5'],'1V5'),pad('2',0,3.5,1.5,1.5,n.GND,'GND')]),
    passiveFootprint('R_EEPROM_SDA','5.1k',24,23,n['3V3'],'3V3',n.EEPROM_SDA,'EEPROM_SDA'),passiveFootprint('R_EEPROM_SCL','5.1k',28,23,n['3V3'],'3V3',n.EEPROM_SCL,'EEPROM_SCL'),
  ]
  // Placement optimizer baseline: keep dense peripherals outside each other's
  // canonical courtyards before any routing occupancy is generated.
  for(const [ref,x,y] of [['J1',2,16],['F1',8,14],['D1',8,23],['C_PP5V',16,8],['U1',20,24],['C_3V3',15,26],['U3',24,29],['C_1V5',42,27],['C_VBUS',49,8],['D2',50,24],['J2',58,16]]){
    const placed=footprints.find(item=>item.ref===ref);placed.at={x,y}
  }
  const evidence={nets,footprints,segments:[],vias:[]},byNet=new Map(names.filter(Boolean).map(name=>[name,[]]))
  for(const f of footprints)for(const p of f.pads)if(p.netNumber)byNet.get(p.netName).push([f.at.x+p.x,f.at.y+p.y])
  const chain=(points,net,layer='F.Cu',width=.25)=>points.slice(1).forEach((p,i)=>evidence.segments.push(segment(points[i][0],points[i][1],p[0],p[1],width,net,layer)))
  const rails=new Set(['GND','DRAIN','VBUS','PP5V','3V3'])
  const breakout=generateTps25750LocalBreakoutV4({pads:u2Pads.map(p=>({number:p.number,net:p.netName,x:p.x,y:p.y,widthMm:p.w,heightMm:p.h}))})
  const foreign=footprints.filter(f=>f.ref!=='U2')
  const externalEndpoints=foreign.flatMap(f=>f.pads.filter(p=>rails.has(p.netName)).map(p=>({net:p.netName,x:f.at.x+p.x-ux,y:f.at.y+p.y-uy,widthMm:p.w,heightMm:p.h,diameterMm:Math.max(p.w,p.h),smd:true,ref:f.ref,pad:p.number})))
  const foreignOccupancy=foreign.flatMap(f=>f.pads.map(p=>({net:p.netName,x:f.at.x+p.x-ux,y:f.at.y+p.y-uy,widthMm:p.w,heightMm:p.h,layers:['F.Cu']})))
  const handoff=generateTps25750GlobalHandoff({breakout,externalEndpoints,foreignOccupancy,stepMm:.25,boardBounds:{minX:-ux+.75,maxX:62-ux-.75,minY:-uy+.75,maxY:32-uy-.75}})
  if(!handoff.modelAccepted) throw new Error(`Board005 TPS25750 rail handoff failed: ${JSON.stringify(handoff.failedNets)}`)
  for(const s of breakout.segments.concat(handoff.segments)) evidence.segments.push(segment(s.from.x+ux,s.from.y+uy,s.to.x+ux,s.to.y+uy,s.widthMm,n[s.net],s.layer))
  for(const v of breakout.vias.concat(handoff.vias)) evidence.vias.push({...via(v.at.x+ux,v.at.y+uy,n[v.net]),size:v.diameterMm,drill:v.drillMm})
  chain(byNet.get('5V_RAW'),n['5V_RAW'], 'F.Cu',.5)
  chain([[27.8,15.4],[26.8,15.4],[25.5,17],[25.5,22],[42,23.5]],n['1V5'],'F.Cu',.1)
  chain([[31.4,18.2],[31.4,22],[30,22]],n.EEPROM_SDA,'F.Cu',.1)
  chain([[30,22],[23,27],[23,30.9]],n.EEPROM_SDA,'In4.Cu',.12)
  chain([[23,30.9],[26,30.9]],n.EEPROM_SDA,'F.Cu',.1)
  evidence.vias.push({...via(30,22,n.EEPROM_SDA),size:.4,drill:.2},{...via(23,30.9,n.EEPROM_SDA),size:.4,drill:.2})
  chain([[31.8,18.2],[31.8,20],[34,20]],n.EEPROM_SCL,'F.Cu',.1)
  chain([[34,20],[27,29.65]],n.EEPROM_SCL,'B.Cu',.12)
  chain([[27,29.65],[26,29.65]],n.EEPROM_SCL,'F.Cu',.1)
  evidence.vias.push({...via(34,20,n.EEPROM_SCL),size:.4,drill:.2},{...via(27,29.65,n.EEPROM_SCL),size:.4,drill:.2})
  chain([[34.2,14.6],[36,14.6],[36,7],[59,7],[59,15],[60,15]],n.CC1,'F.Cu',.1)
  chain([[34.2,14.2],[35.5,14.2]],n.CC2,'F.Cu',.1)
  chain([[35.5,14.2],[58,16]],n.CC2,'B.Cu',.12)
  chain([[58,16],[60,16]],n.CC2,'F.Cu',.1)
  evidence.vias.push({...via(35.5,14.2,n.CC2),size:.4,drill:.2},{...via(58,16,n.CC2),size:.4,drill:.2})
  return evidence
}

/**
 * Candidate-only physical evidence for the non-PD Board005 replacement.
 * The proof pipeline replaces these seed locations with resolved authoritative
 * packages before routing, so no hand-drawn pad geometry is ever emitted as
 * the final package definition.
 */
export function usbCFixedSourceCategoryPcbEvidence(){
  const names=['','GND','5V_RAW','5V_FUSED','VBUS','CC1','CC2','FAULT_N','REF','REF_RTN']
  const nets=names.map((name,number)=>({number,name})),n=Object.fromEntries(nets.map(row=>[row.name,row.number]))
  const fp=(ref,value,footprint,x,y,w,h,pads)=>({ref,value,footprint,at:{x,y},body:{w,h},pads})
  const footprints=[
    fp('J1','M20-9990245','Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical',4,9,3,6,[pad('1',0,-1.3,1,1,n['5V_RAW'],'5V_RAW'),pad('2',0,1.3,1,1,n.GND,'GND')]),
    fp('F1','3413.0218.22','Resistor_SMD:R_2512_6332Metric',11,7,6.3,3.2,[pad('1',-3.5,0,1.5,1.5,n['5V_RAW'],'5V_RAW'),pad('2',3.5,0,1.5,1.5,n['5V_FUSED'],'5V_FUSED')]),
    fp('D1','SMAJ5.0A','Diode_SMD:D_SMA',13,14,4.5,2.5,[pad('1',0,-2.8,1.5,1.5,n['5V_FUSED'],'5V_FUSED'),pad('2',0,2.8,1.5,1.5,n.GND,'GND')]),
    fp('U1','TPS25810RVCR','Package_DFN_QFN:Texas_RVC0020A_WQFN-20-1EP_3x4mm_P0.5mm_EP1.6x2.6mm',25,10,4,5,[pad('1',-2,-1.5,.4,.4,n.FAULT_N,'FAULT_N'),pad('2',-2,-1,.4,.4,n['5V_FUSED'],'5V_FUSED'),pad('3',-2,-.5,.4,.4,n['5V_FUSED'],'5V_FUSED'),pad('4',-2,0,.4,.4,n['5V_FUSED'],'5V_FUSED'),pad('5',-2,.5,.4,.4,n['5V_FUSED'],'5V_FUSED'),pad('6',-2,1,.4,.4,n['5V_FUSED'],'5V_FUSED'),pad('7',-2,1.5,.4,.4,n['5V_FUSED'],'5V_FUSED'),pad('8',2,1.5,.4,.4,n.GND,'GND'),pad('9',2,1,.4,.4,n.REF_RTN,'REF_RTN'),pad('10',2,.5,.4,.4,n.REF,'REF'),pad('11',2,0,.4,.4,n.CC1,'CC1'),pad('12',2,-.5,.4,.4,n.GND,'GND'),pad('13',2,-1,.4,.4,n.CC2,'CC2'),pad('14',2,-1.5,.4,.4,n.VBUS,'VBUS'),pad('15',0,0,1.6,2.6,n.GND,'GND')]),
    fp('J2','USB4105-GF-A','Connector_USB:USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal',40,10,5,12,[pad('A1',2,-5,.7,.7,n.GND,'GND'),pad('B12',2,-4,.7,.7,n.GND,'GND'),pad('A4',2,-3,.8,.8,n.VBUS,'VBUS'),pad('B9',2,-2,.8,.8,n.VBUS,'VBUS'),pad('A5',2,-1,.7,.7,n.CC1,'CC1'),pad('B5',2,0,.7,.7,n.CC2,'CC2'),pad('S1',2,5,.8,.8,n.GND,'GND')]),
    fp('C_IN','UWT1E220MCL1GB','Capacitor_SMD:CP_Elec_6.3x5.4',17,7,5.4,6.3,[pad('1',0,-3.5,1.5,1.5,n['5V_FUSED'],'5V_FUSED'),pad('2',0,3.5,1.5,1.5,n.GND,'GND')]),
    fp('C_OUT','UWT1E220MCL1GB','Capacitor_SMD:CP_Elec_6.3x5.4',33,7,5.4,6.3,[pad('1',0,-3.5,1.5,1.5,n.VBUS,'VBUS'),pad('2',0,3.5,1.5,1.5,n.GND,'GND')]),
    verticalPassive('C_AUX','100n',21,16,n['5V_FUSED'],'5V_FUSED',n.GND,'GND',1),
    passiveFootprint('R_REF','100k',25,16,n.REF,'REF',n.REF_RTN,'REF_RTN'),
    passiveFootprint('R_FAULT','100k',30,16,n['5V_FUSED'],'5V_FUSED',n.FAULT_N,'FAULT_N'),
  ]
  // The authoritative router starts copperless and regenerates every route
  // from the exact resolved pad locations. Seed tracks are therefore empty.
  return {nets,footprints,segments:[],vias:[]}
}

export function usbCPdSinkCategoryPcbEvidence(){
  const names=['','GND','VBUS_RAW','VBUS_PROTECTED','VBUS_SWITCHED','5V','CC1','CC2','VBUS_EN_SNK','SW','FB','BOOT']
  const nets=names.map((name,number)=>({number,name})),n=Object.fromEntries(nets.map(x=>[x.name,x.number]))
  const fp=(ref,value,footprint,x,y,w,h,pads)=>({ref,value,footprint,at:{x,y},body:{w,h},pads})
  const footprints=[
    fp('J1','USB4105-GF-A','Connector_USB:USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal',8,20,5,12,[pad('A1',2,-5,.7,.7,n.GND,'GND'),pad('B12',2,-4,.7,.7,n.GND,'GND'),pad('A4',2,-3,.8,.8,n.VBUS_RAW,'VBUS_RAW'),pad('B9',2,-2,.8,.8,n.VBUS_RAW,'VBUS_RAW'),pad('A5',2,-1,.7,.7,n.CC1,'CC1'),pad('B5',2,0,.7,.7,n.CC2,'CC2'),pad('S1',2,5,.8,.8,n.GND,'GND')]),
    fp('F1','3413.0218.22','Resistor_SMD:R_2512_6332Metric',16,14,6.3,3.2,[pad('1',-3.5,0,1.5,1.5,n.VBUS_RAW,'VBUS_RAW'),pad('2',3.5,0,1.5,1.5,n.VBUS_PROTECTED,'VBUS_PROTECTED')]),
    fp('D1','SMAJ24A','Diode_SMD:D_SMA',23,9,2.5,4.5,[pad('1',0,-2.8,1.5,1.5,n.VBUS_PROTECTED,'VBUS_PROTECTED'),pad('2',0,2.8,1.5,1.5,n.GND,'GND')]),
    fp('Q1','SI7465DP-T1-GE3','Package_SO:PowerPAK_SO-8_Single',25,15,5,6,[pad('1',-2.5,-1.5,.9,.8,n.VBUS_PROTECTED,'VBUS_PROTECTED'),pad('2',-2.5,-.5,.9,.8,n.VBUS_PROTECTED,'VBUS_PROTECTED'),pad('3',-2.5,.5,.9,.8,n.VBUS_PROTECTED,'VBUS_PROTECTED'),pad('4',-2.5,1.5,.9,.8,n.VBUS_EN_SNK,'VBUS_EN_SNK'),pad('5',2.5,1.5,.9,.8,n.VBUS_SWITCHED,'VBUS_SWITCHED'),pad('6',2.5,.5,.9,.8,n.VBUS_SWITCHED,'VBUS_SWITCHED'),pad('7',2.5,-.5,.9,.8,n.VBUS_SWITCHED,'VBUS_SWITCHED'),pad('8',2.5,-1.5,.9,.8,n.VBUS_SWITCHED,'VBUS_SWITCHED')]),
    fp('U1','STUSB4500QTR','Package_DFN_QFN:QFN-24-1EP_4x4mm_P0.5mm_EP2.7x2.7mm',21,25,5,5,[pad('1',-3,-2,.55,.55,n.CC1,'CC1'),pad('2',-3,-1,.55,.55,n.CC2,'CC2'),pad('3',-3,0,.55,.55,n.VBUS_EN_SNK,'VBUS_EN_SNK'),pad('4',-3,1,.55,.55,n.VBUS_PROTECTED,'VBUS_PROTECTED'),pad('17',3,-1,.55,.55,n.VBUS_PROTECTED,'VBUS_PROTECTED'),pad('18',3,0,.55,.55,n.VBUS_PROTECTED,'VBUS_PROTECTED'),pad('19',3,1,.55,.55,n.GND,'GND'),pad('25',0,0,2.2,2.2,n.GND,'GND')]),
    fp('U2','TPS54202DDCR','Package_TO_SOT_SMD:SOT-23-6',35,18,4,5,[pad('1',-2,-2,.7,.6,n.SW,'SW'),pad('2',-2,0,.7,.6,n.GND,'GND'),pad('3',-2,2,.7,.6,n.FB,'FB'),pad('4',2,2,.7,.6,n.VBUS_SWITCHED,'VBUS_SWITCHED'),pad('5',2,0,.7,.6,n.VBUS_SWITCHED,'VBUS_SWITCHED'),pad('6',2,-2,.7,.6,n.SW,'SW')]),
    fp('L1','SRN6045TA-4R7M','Inductor_SMD:L_Bourns_SRN6045',43,16,6,6,[pad('1',-3.5,0,1.5,1.5,n.SW,'SW'),pad('2',3.5,0,1.5,1.5,n['5V'],'5V')]),
    fp('C1','UWT1H100MCL1GB','Capacitor_SMD:CP_Elec_6.3x5.4',30,28,5.4,6.3,[pad('1',0,-3.5,1.5,1.5,n.VBUS_PROTECTED,'VBUS_PROTECTED'),pad('2',0,3.5,1.5,1.5,n.GND,'GND')]),
    fp('C2','UWT1E220MCL1GB','Capacitor_SMD:CP_Elec_6.3x5.4',46,25,5.4,6.3,[pad('1',0,-3.5,1.5,1.5,n['5V'],'5V'),pad('2',0,3.5,1.5,1.5,n.GND,'GND')]),
    passiveFootprint('R_FB_TOP','73.2k',39,23,n['5V'],'5V',n.FB,'FB'),passiveFootprint('R_FB_BOTTOM','10k',39,27,n.FB,'FB',n.GND,'GND'),passiveFootprint('R_GATE_PULLUP','10k',27,22,n.VBUS_PROTECTED,'VBUS_PROTECTED',n.VBUS_EN_SNK,'VBUS_EN_SNK'),passiveFootprint('C_BOOT','100n',39,12,n.BOOT,'BOOT',n.SW,'SW'),
    fp('J2','M20-9990245','Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical',53,20,3,6,[pad('1',0,-1.3,1,1,n['5V'],'5V'),pad('2',0,1.3,1,1,n.GND,'GND')]),
  ]
  const evidence={nets,footprints,segments:[],vias:[]},byNet=new Map(names.filter(Boolean).map(name=>[name,[]]))
  for(const f of footprints)for(const p of f.pads)if(p.netNumber)byNet.get(p.netName).push([f.at.x+p.x,f.at.y+p.y])
  addDogboneTree(evidence,byNet.get('GND'),n.GND,'B.Cu',35,5);addDogboneTree(evidence,byNet.get('5V'),n['5V'],'In1.Cu',32,5)
  const connect=(a,b,net,layer='F.Cu',width=.3)=>evidence.segments.push(segment(a[0],a[1],b[0],b[1],width,net,layer))
  const chain=(points,net,layer='F.Cu',width=.3)=>points.slice(1).forEach((p,i)=>connect(points[i],p,net,layer,width))
  chain([[10,17],[12,17],[12,14],[12.5,14]],n.VBUS_RAW);chain([[10,18],[11,18],[11,17],[10,17]],n.VBUS_RAW)
  chain([[24,24],[24,25]],n.VBUS_PROTECTED)
  chain([[22.5,13.5],[22.5,14.5],[22.5,15.5]],n.VBUS_PROTECTED)
  addDogboneTree(evidence,[[19.5,14],[23,6.2],[22.5,14.5],[24,24],[30,24.5]],n.VBUS_PROTECTED,'In2.Cu',8,6)
  evidence.vias.push(via(18,26,n.VBUS_PROTECTED));evidence.segments.push(segment(18,26,12,26,.3,n.VBUS_PROTECTED,'In2.Cu'),segment(12,26,12,8,.3,n.VBUS_PROTECTED,'In2.Cu'),segment(12,8,25.5,8,.3,n.VBUS_PROTECTED,'In2.Cu'))
  chain([[27.5,13.5],[27.5,14.5],[27.5,15.5],[27.5,16.5]],n.VBUS_SWITCHED)
  chain([[27.5,15.5],[30,11],[41,11],[41,19],[37,19],[37,18],[37,20]],n.VBUS_SWITCHED)
  chain([[33,16],[39.5,16]],n.SW);chain([[37,16],[39.5,16]],n.SW)
  chain([[10,19],[18,23]],n.CC1);chain([[10,20],[18,24]],n.CC2)
  chain([[33,20],[33,22],[34,24],[40.1,24],[40.1,23],[42,24],[42,29],[36,29],[36,27],[37.9,27]],n.FB,'F.Cu',.22)
  chain([[18,25],[20,18]],n.VBUS_EN_SNK,'In1.Cu',.22);chain([[20,18],[21,17],[22.5,16.5]],n.VBUS_EN_SNK,'F.Cu',.22);evidence.vias.push(via(18,25,n.VBUS_EN_SNK),via(20,18,n.VBUS_EN_SNK))
  return evidence
}

export function rp2040InstrumentCategoryPcbEvidence() {
  const names=['','GND','VBUS','3V3','USB_DP_CONN','USB_DN_CONN','USB_DP','USB_DN','CC1','CC2','QSPI_CS','QSPI_SD1','QSPI_SD2','QSPI_SD0','QSPI_SCLK','QSPI_SD3','SWDIO','SWCLK','I2C_SCL','I2C_SDA']
  const nets=names.map((name,number)=>({number,name})),n=Object.fromEntries(nets.map(x=>[x.name,x.number]))
  const fp=(ref,value,footprint,x,y,w,h,pads)=>({ref,value,footprint,at:{x,y},body:{w,h},pads})
  const flashBase=[pad('1',-2,-3,.65,.55,n.QSPI_CS,'QSPI_CS'),pad('2',-2,-2,.65,.55,n.QSPI_SD1,'QSPI_SD1'),pad('3',-2,-1,.65,.55,n.QSPI_SD2,'QSPI_SD2'),pad('4',-2,0,.65,.55,n.GND,'GND'),pad('5',2,0,.65,.55,n.QSPI_SD0,'QSPI_SD0'),pad('6',2,1,.65,.55,n.QSPI_SCLK,'QSPI_SCLK'),pad('7',2,2,.65,.55,n.QSPI_SD3,'QSPI_SD3'),pad('8',2,3,.65,.55,n['3V3'],'3V3')]
  const flashChoice=chooseFootprintTransform({sourceByNet:{QSPI_CS:{x:35,y:24},QSPI_SD1:{x:35,y:23},QSPI_SD2:{x:35,y:22},QSPI_SD0:{x:35,y:21},QSPI_SCLK:{x:35,y:20},QSPI_SD3:{x:35,y:19}},pads:flashBase.map(p=>({...p,net:p.netName})),positions:[10,14,20,26,30].flatMap(y=>[40,43,46].map(x=>({x,y})))}) .best
  const flashPads=flashChoice.pads.map(p=>({...p,x:p.x-flashChoice.position.x,y:p.y-flashChoice.position.y}))
  const flashTarget=Object.fromEntries(flashChoice.pads.map(p=>[p.netName,[p.x,p.y]]))
  const footprints=[
    fp('J1','USB4105-GF-A','Connector_USB:USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal',8,20,5,12,[pad('A1',2,-5,.7,.7,n.GND,'GND'),pad('B12',2,-4,.7,.7,n.GND,'GND'),pad('A4',2,-3,.7,.7,n.VBUS,'VBUS'),pad('B9',2,-2,.7,.7,n.VBUS,'VBUS'),pad('A5',2,-1,.7,.7,n.CC1,'CC1'),pad('B5',2,0,.7,.7,n.CC2,'CC2'),pad('A6',2,1,.7,.7,n.USB_DP_CONN,'USB_DP_CONN'),pad('B6',2,2,.7,.7,n.USB_DP_CONN,'USB_DP_CONN'),pad('A7',2,3,.7,.7,n.USB_DN_CONN,'USB_DN_CONN'),pad('B7',2,4,.7,.7,n.USB_DN_CONN,'USB_DN_CONN'),pad('S1',2,5,.7,.7,n.GND,'GND')]),
    fp('D1','USBLC6-2SC6','Package_TO_SOT_SMD:SOT-23-6',17,22,3,5,[pad('1',-2,-2,.7,.6,n.USB_DP_CONN,'USB_DP_CONN'),pad('2',-2,0,.7,.6,n.GND,'GND'),pad('3',-2,2,.7,.6,n.USB_DN_CONN,'USB_DN_CONN'),pad('4',2,2,.7,.6,n.USB_DN,'USB_DN'),pad('5',2,0,.7,.6,n.VBUS,'VBUS'),pad('6',2,-2,.7,.6,n.USB_DP,'USB_DP')]),
    fp('U1','SC0914','Package_DFN_QFN:QFN-56-1EP_7x7mm_P0.4mm_EP3.2x3.2mm',31,20,7,7,[pad('1',-4,-3,.55,.55,n['3V3'],'3V3'),pad('6',-4,-2,.55,.55,n.I2C_SCL,'I2C_SCL'),pad('7',-4,-1,.55,.55,n.I2C_SDA,'I2C_SDA'),pad('8',-4,0,.55,.55,n['3V3'],'3V3'),pad('24',-4,1,.55,.55,n.SWCLK,'SWCLK'),pad('25',-4,2,.55,.55,n.SWDIO,'SWDIO'),pad('46',-4,3,.55,.55,n.USB_DN,'USB_DN'),pad('47',-4,4,.55,.55,n.USB_DP,'USB_DP'),pad('48',4,-4,.55,.55,n['3V3'],'3V3'),pad('49',4,-3,.55,.55,n['3V3'],'3V3'),pad('50',4,-2,.55,.55,n['3V3'],'3V3'),pad('51',4,-1,.55,.55,n.QSPI_SD3,'QSPI_SD3'),pad('52',4,0,.55,.55,n.QSPI_SCLK,'QSPI_SCLK'),pad('53',4,1,.55,.55,n.QSPI_SD0,'QSPI_SD0'),pad('54',4,2,.55,.55,n.QSPI_SD2,'QSPI_SD2'),pad('55',4,3,.55,.55,n.QSPI_SD1,'QSPI_SD1'),pad('56',4,4,.55,.55,n.QSPI_CS,'QSPI_CS'),pad('57',0,0,2.4,2.4,n.GND,'GND')]),
    fp('U2','W25Q128JVSIQ','Package_SO:SOIC-8_3.9x4.9mm_P1.27mm',flashChoice.position.x,flashChoice.position.y,flashChoice.rotation%180?7:4,flashChoice.rotation%180?4:7,flashPads),
    fp('U3','MCP1700T-3302E/TT','Package_TO_SOT_SMD:SOT-23',19,10,3,3,[pad('1',-2,1,.8,.7,n.GND,'GND'),pad('2',2,0,.8,.7,n['3V3'],'3V3'),pad('3',-2,-1,.8,.7,n.VBUS,'VBUS')]),
    fp('J2','M20-9990645','Connector_PinHeader_2.54mm:PinHeader_1x06_P2.54mm_Vertical',56,20,3,14,[pad('1',0,-5,1,1,n.GND,'GND'),pad('2',0,-3,1,1,n['3V3'],'3V3'),pad('3',0,-1,1,1,n.I2C_SCL,'I2C_SCL'),pad('4',0,1,1,1,n.I2C_SDA,'I2C_SDA'),pad('5',0,3,1,1,n.SWCLK,'SWCLK'),pad('6',0,5,1,1,n.SWDIO,'SWDIO')]),
    passiveFootprint('R1','5.1k',13,19,n.CC1,'CC1',n.GND,'GND'),passiveFootprint('R2','5.1k',13,27,n.CC2,'CC2',n.GND,'GND'),
    verticalPassive('C1','100n',25,10,n['3V3'],'3V3',n.GND,'GND',1),verticalPassive('C2','100n',31,10,n['3V3'],'3V3',n.GND,'GND',1),verticalPassive('C3','100n',48,30,n['3V3'],'3V3',n.GND,'GND',1),
  ]
  const evidence={nets,footprints,segments:[],vias:[]}
  const ground=[],rail=[]; for(const f of footprints)for(const p of f.pads){const pt=[f.at.x+p.x,f.at.y+p.y];if(p.netNumber===n.GND)ground.push(pt);if(p.netNumber===n['3V3'])rail.push(pt)}
  addDogboneTree(evidence,ground.filter(([x,y])=>x!==42||y!==20),n.GND,'B.Cu',32); addDogboneTree(evidence,rail,n['3V3'],'In1.Cu',8)
  evidence.segments.push(segment(42,20,44,20,.3,n.GND),segment(44,20,44,16,.3,n.GND),segment(44,16,44,32,.3,n.GND,'B.Cu'));evidence.vias.push(via(44,16,n.GND))
  const connect=(a,b,net,layer='F.Cu')=>evidence.segments.push(segment(a[0],a[1],b[0],b[1],.22,net,layer))
  const connectInner=(a,b,net)=>{connect(a,b,net,'In2.Cu');evidence.vias.push(via(a[0],a[1],net),via(b[0],b[1],net))}
  connect([10,17],[12,17],n.VBUS);connect([12,17],[12,8],n.VBUS);connect([12,8],[17,8],n.VBUS);connect([17,8],[17,9],n.VBUS);connect([10,18],[11,18],n.VBUS);connect([11,18],[11,17],n.VBUS);connect([11,17],[12,17],n.VBUS)
  connect([17,9],[23,9],n.VBUS,'In2.Cu');connect([23,9],[23,22],n.VBUS,'In2.Cu');connect([23,22],[19,22],n.VBUS,'In2.Cu');evidence.vias.push(via(17,9,n.VBUS),via(19,22,n.VBUS))
  connect([10,21],[12,21],n.USB_DP_CONN);connect([12,21],[12,20],n.USB_DP_CONN);connect([12,20],[15,20],n.USB_DP_CONN);connect([10,22],[12,22],n.USB_DP_CONN);connect([12,22],[12,21],n.USB_DP_CONN);connect([10,23],[13,23],n.USB_DN_CONN);connect([13,23],[13,24],n.USB_DN_CONN);connect([13,24],[15,24],n.USB_DN_CONN);connect([10,24],[13,24],n.USB_DN_CONN)
  connect([19,20],[27,24],n.USB_DP);connectInner([19,24],[27,23],n.USB_DN)
  connect([10,19],[11.9,19],n.CC1);connectInner([10,20],[11.9,27],n.CC2)
  const qU=[[35,24,n.QSPI_CS],[35,23,n.QSPI_SD1],[35,22,n.QSPI_SD2],[35,21,n.QSPI_SD0],[35,20,n.QSPI_SCLK],[35,19,n.QSPI_SD3]],qF=['QSPI_CS','QSPI_SD1','QSPI_SD2','QSPI_SD0','QSPI_SCLK','QSPI_SD3'].map(net=>flashTarget[net])
  qU.forEach((p,i)=>connect(p,qF[i],p[2]))
  connect([27,18],[30,18],n.I2C_SCL,'In2.Cu');connect([30,18],[30,15],n.I2C_SCL,'In2.Cu');connect([30,15],[53,15],n.I2C_SCL,'In2.Cu');connect([53,15],[53,19],n.I2C_SCL,'In2.Cu');connect([53,19],[56,19],n.I2C_SCL,'In2.Cu');evidence.vias.push(via(27,18,n.I2C_SCL),via(56,19,n.I2C_SCL))
  connectInner([27,19],[56,21],n.I2C_SDA);connectInner([27,21],[56,23],n.SWCLK);connectInner([27,22],[56,25],n.SWDIO)
  return evidence
}

export function stm32ControllerCategoryPcbEvidence(board={}) {
  const evidence = canSensorNodeCategoryPcbEvidence()
  evidence.nets.find((item)=>item.number===2).name='5V'
  evidence.nets.find((item)=>item.number===3).name='3V3'
  evidence.nets.push({ number: 9, name: 'CAN_TX' }, { number: 10, name: 'CAN_RX' })
  const u1 = evidence.footprints.find((item) => item.ref === 'U1')
  u1.value = 'STM32F103C8T6'
  u1.footprint = 'Package_QFP:LQFP-48_7x7mm_P0.5mm'
  u1.pads = u1.pads.slice(0,6).map((item,index)=>({ ...item, number:['24','23','42','43','33','32'][index], ...(index===4?{netNumber:9,netName:'CAN_TX'}:{}), ...(index===5?{netNumber:10,netName:'CAN_RX'}:{}) }))
  const u2 = evidence.footprints.find((item) => item.ref === 'U2')
  u2.value = 'SN65HVD230DR'
  u2.footprint = 'Package_SO:SOIC-8_3.9x4.9mm_P1.27mm'
  u2.pads = [
    pad('1', -2.9, -2, 0.7, 0.55, 9, 'CAN_TX'), pad('4', -2.9, 2, 0.7, 0.55, 10, 'CAN_RX'),
    pad('3', 2.9, -2, 0.7, 0.55, 3, '+3V3'), pad('2', 2.9, 2, 0.7, 0.55, 1, 'GND'),
    pad('7', 0, -3.6, 0.7, 0.55, 4, 'CANH'), pad('6', 0, 3.6, 0.7, 0.55, 5, 'CANL'),
  ]
  const j1 = evidence.footprints.find((item) => item.ref === 'J1')
  j1.value='5V input'; j1.footprint='Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical'
  j1.pads=[pad('1',2.4,-2,0.8,0.8,2,'5V'),pad('2',2.4,-4,0.8,0.8,1,'GND')]
  const j2=evidence.footprints.find((item)=>item.ref==='J2')
  j2.at={x:56,y:19}; j2.body={w:3,h:14}; j2.value='CAN/I2C header'; j2.pads=[pad('1',-2,-3,1,1,4,'CANH'),pad('2',-1,0,1,1,5,'CANL'),pad('3',0,3,1,1,1,'GND'),pad('4',1,5,1,1,3,'+3V3'),pad('5',2,7,1,1,6,'I2C_SCL'),pad('6',3,9,1,1,7,'I2C_SDA')]
  evidence.footprints.push(
    {ref:'U3',value:'MCP1700T-3302E/TT',footprint:'Package_TO_SOT_SMD:SOT-23',at:{x:17,y:14},body:{w:3,h:3},pads:[pad('1',-1.8,1,0.8,0.7,1,'GND'),pad('2',1.8,0,0.8,0.7,3,'+3V3'),pad('3',-1.8,-1,0.8,0.7,2,'5V')]},
    verticalPassive('C1','100n',20,18,3,'+3V3',1,'GND',1), verticalPassive('C2','100n',41,8,3,'+3V3',1,'GND',2), verticalPassive('C3','1u',22,14,3,'+3V3',1,'GND',1),
    passiveFootprint('R1','120R',48,6,4,'CANH',5,'CANL'),
    {ref:'D1',value:'NUP2105LT1G',footprint:'Package_TO_SOT_SMD:SOT-23',at:{x:37,y:24},body:{w:3,h:3},pads:[pad('1',-1.8,-1,0.8,0.7,4,'CANH'),pad('2',-1.8,1,0.8,0.7,1,'GND'),pad('3',1.8,0,0.8,0.7,5,'CANL')]},
  )
  evidence.segments=[]; evidence.vias=[]
  const gnd=[[11.4,15],[15.2,15],[24.6,19],[45.9,21],[20,19],[41,10],[22,15],[35.2,25]]
  const rail=[[18.8,14],[24.6,17],[45.9,17],[20,17],[41,6],[22,13]]
  const canh=[[43,15.4],[54,16],[46.9,6],[35.2,23]],canl=[[43,22.6],[55,19],[49.1,6],[38.8,24]]
  for(const [points,net,layer,bus] of [[gnd,1,'B.Cu',30],[rail,3,'In1.Cu',5],[canh,4,'In2.Cu',14],[canl,5,'In1.Cu',25]]) addLayerTree(evidence,points,net,layer,bus)
  evidence.segments.push(segment(11.4,17,15.2,13,0.4,2),segment(33.4,19,40.1,17,0.22,9),segment(33.4,21,40.1,21,0.22,10),segment(45.9,21,56,22,0.3,1),segment(45.9,17,57,17,0.3,3,'In2.Cu'),segment(57,17,57,24,0.3,3,'In2.Cu'),segment(24.6,21,24.6,27,0.22,6),segment(24.6,27,58,27,0.22,6),segment(58,27,58,26,0.22,6),segment(33.4,17,33.4,11,0.22,7,'In2.Cu'),segment(33.4,11,45,11,0.22,7,'In2.Cu'),segment(45,11,45,4,0.22,7,'In2.Cu'),segment(45,4,50,4,0.22,7,'In2.Cu'),segment(50,4,50,11,0.22,7,'In2.Cu'),segment(50,11,53,11,0.22,7,'In2.Cu'),segment(53,11,53,28,0.22,7,'B.Cu'),segment(53,28,59,28,0.22,7))
  evidence.vias.push(via(57,24,3),via(33.4,17,7),via(53,11,7),via(53,28,7))
  if((board.bom||[]).some(row=>row.ref==='R_BOOT'))addStm32MandatorySupportEvidence(evidence)
  return evidence
}

function addStm32MandatorySupportEvidence(evidence){
  const addNet=name=>{let row=evidence.nets.find(net=>net.name===name);if(!row){row={number:Math.max(...evidence.nets.map(net=>net.number))+1,name};evidence.nets.push(row)}return row.number}
  const net=Object.fromEntries(['5V_RAW','NRST','BOOT0','SWDIO','SWCLK','TERM_LINK'].map(name=>[name,addNet(name)])),n=Object.fromEntries(evidence.nets.map(row=>[row.name,row.number]))
  const u1=evidence.footprints.find(row=>row.ref==='U1');u1.pads.push(pad('7',-4,-1,.55,.55,net.NRST,'NRST'),pad('34',4,1,.55,.55,net.SWDIO,'SWDIO'),pad('37',4,2,.55,.55,net.SWCLK,'SWCLK'),pad('44',4,3,.55,.55,net.BOOT0,'BOOT0'))
  const u2=evidence.footprints.find(row=>row.ref==='U2');u2.pads.push(pad('8',2.9,0,.7,.55,n.GND,'GND'))
  const j1=evidence.footprints.find(row=>row.ref==='J1');j1.value='SWD header';j1.footprint='Connector_PinHeader_2.54mm:PinHeader_1x06_P2.54mm_Vertical';j1.at={x:8,y:19};j1.body={w:3,h:14};j1.pads=[pad('1',0,-5,1,1,n['3V3'],'3V3'),pad('2',0,-3,1,1,net.SWDIO,'SWDIO'),pad('3',0,-1,1,1,net.SWCLK,'SWCLK'),pad('4',0,1,1,1,net.NRST,'NRST'),pad('5',0,3,1,1,n.GND,'GND'),pad('6',0,5,1,1,0,'')]
  const j2=evidence.footprints.find(row=>row.ref==='J2');j2.pads=[pad('1',-2,-3,1,1,net['5V_RAW'],'5V_RAW'),pad('2',-1,0,1,1,n.GND,'GND'),pad('3',0,3,1,1,n.CANH,'CANH'),pad('4',1,5,1,1,n.CANL,'CANL'),pad('5',2,7,1,1,n.I2C_SCL,'I2C_SCL'),pad('6',3,9,1,1,n.I2C_SDA,'I2C_SDA')]
  const r1=evidence.footprints.find(row=>row.ref==='R1');r1.pads[1]={...r1.pads[1],netNumber:net.TERM_LINK,netName:'TERM_LINK'}
  evidence.footprints.push(
    {ref:'Q1',value:'SI7465DP-T1-GE3',footprint:'Package_SO:PowerPAK_SO-8_Single',at:{x:14,y:5},body:{w:6,h:6},pads:[pad('1',-2,-2,.8,.8,net['5V_RAW'],'5V_RAW'),pad('2',-2,0,.8,.8,net['5V_RAW'],'5V_RAW'),pad('3',-2,2,.8,.8,net['5V_RAW'],'5V_RAW'),pad('4',0,3,.8,.8,n.GND,'GND'),pad('5',2,2,.8,.8,n['5V'],'5V'),pad('6',2,0,.8,.8,n['5V'],'5V'),pad('7',2,-1,.8,.8,n['5V'],'5V'),pad('8',2,-2,.8,.8,n['5V'],'5V')]},
    {ref:'D_PWR',value:'SMAJ5.0A',footprint:'Diode_SMD:D_SMA',at:{x:22,y:5},body:{w:5,h:3},pads:[pad('1',-3,0,1.5,1.5,n['5V'],'5V'),pad('2',3,0,1.5,1.5,n.GND,'GND')]},
    verticalPassive('C_BULK','22u',28,5,n['5V'],'5V',n.GND,'GND',1),passiveFootprint('JP1','TERM SELECT',53,7,net.TERM_LINK,'TERM_LINK',n.CANL,'CANL'),
    passiveFootprint('R_BOOT','10k',28,28,net.BOOT0,'BOOT0',n.GND,'GND'),passiveFootprint('R_RESET','10k',18,28,n['3V3'],'3V3',net.NRST,'NRST'),verticalPassive('C_RESET','100n',22,28,net.NRST,'NRST',n.GND,'GND',1),
    verticalPassive('C4','100n',27,12,n['3V3'],'3V3',n.GND,'GND',1),verticalPassive('C5','100n',30,12,n['3V3'],'3V3',n.GND,'GND',1),verticalPassive('C6','100n',33,12,n['3V3'],'3V3',n.GND,'GND',1),
  )
}

export function canGatewayCategoryPcbEvidence(board={}){
  const evidence=stm32ControllerCategoryPcbEvidence(board)
  const rename=new Map([[4,'CAN1H'],[5,'CAN1L'],[9,'CAN1_TX'],[10,'CAN1_RX']])
  for(const net of evidence.nets)if(rename.has(net.number))net.name=rename.get(net.number)
  for(const footprint of evidence.footprints)for(const p of footprint.pads)if(rename.has(p.netNumber))p.netName=rename.get(p.netNumber)
  // Allocate after the inherited topology. Reusing 11-14 silently aliases CAN2
  // onto 5V_RAW/NRST/SWDIO on the real KiCad PCB.
  const nextNet=Math.max(...evidence.nets.map(row=>row.number))+1
  const can2H=nextNet,can2L=nextNet+1,can2Tx=nextNet+2,can2Rx=nextNet+3
  evidence.nets.push({number:can2H,name:'CAN2H'},{number:can2L,name:'CAN2L'},{number:can2Tx,name:'CAN2_TX'},{number:can2Rx,name:'CAN2_RX'})
  const byName=Object.fromEntries(evidence.nets.map(row=>[row.name,row.number])),bootNet=byName.SWCLK
  for(const footprint of evidence.footprints)for(const p of footprint.pads)if(p.netNumber===byName.BOOT0){p.netNumber=bootNet;p.netName='SWCLK_BOOT0'}else if(p.netNumber===bootNet)p.netName='SWCLK_BOOT0'
  evidence.nets=evidence.nets.filter(row=>row.number!==byName.BOOT0).map(row=>row.number===bootNet?{...row,name:'SWCLK_BOOT0'}:row)
  const term1=evidence.nets.find(row=>row.name==='TERM_LINK');term1.name='CAN1_TERM_LINK'
  const term2=Math.max(...evidence.nets.map(row=>row.number))+1;evidence.nets.push({number:term2,name:'CAN2_TERM_LINK'})
  const u1=evidence.footprints.find(row=>row.ref==='U1')
  u1.value=(board.bom||[]).find(row=>row.ref==='U1')?.mpn||'STM32G0B1CBT6';u1.footprint='Package_QFP:LQFP-48_7x7mm_P0.5mm'
  u1.pads=[pad('4',-4,-3,.55,.55,3,'3V3'),pad('5',-4,-2,.55,.55,3,'3V3'),pad('6',-4,-1,.55,.55,3,'3V3'),pad('7',-4,0,.55,.55,1,'GND'),pad('10',-4,1,.55,.55,byName.NRST,'NRST'),pad('19',-4,2,.55,.55,can2Rx,'CAN2_RX'),pad('20',-4,3,.55,.55,can2Tx,'CAN2_TX'),pad('42',4,-4,.55,.55,byName.I2C_SCL,'I2C_SCL'),pad('43',4,-3,.55,.55,byName.I2C_SDA,'I2C_SDA'),pad('35',4,-2,.55,.55,byName.SWDIO,'SWDIO'),pad('36',4,-1,.55,.55,bootNet,'SWCLK_BOOT0'),pad('47',4,1,.55,.55,10,'CAN1_RX'),pad('48',4,2,.55,.55,9,'CAN1_TX')]
  evidence.footprints.push(
    {ref:'U4',value:'SN65HVD230DR',footprint:'Package_SO:SOIC-8_3.9x4.9mm_P1.27mm',at:{x:42,y:32},body:{w:6,h:8},pads:[pad('1',-2.9,-2,.7,.55,can2Tx,'CAN2_TX'),pad('4',-2.9,2,.7,.55,can2Rx,'CAN2_RX'),pad('3',2.9,-2,.7,.55,3,'+3V3'),pad('2',2.9,2,.7,.55,1,'GND'),pad('7',0,-3.6,.7,.55,can2H,'CAN2H'),pad('6',0,3.6,.7,.55,can2L,'CAN2L')]},
    {ref:'J3',value:'M20-9990645',footprint:'Connector_PinHeader_2.54mm:PinHeader_1x06_P2.54mm_Vertical',at:{x:63,y:32},body:{w:3,h:12},pads:[pad('1',-2,-3,1,1,can2H,'CAN2H'),pad('2',-1,0,1,1,can2L,'CAN2L'),pad('3',0,3,1,1,1,'GND'),pad('4',1,5,1,1,3,'+3V3'),pad('5',1,7,1,1,3,'+3V3'),pad('6',0,9,1,1,1,'GND')]},
    passiveFootprint('R2','120R',52,39,can2H,'CAN2H',can2L,'CAN2L'),
    passiveFootprint('JP2','TERM SELECT',58,39,term2,'CAN2_TERM_LINK',can2L,'CAN2L'),
    verticalPassive('C7','100n',46,38,3,'3V3',1,'GND',1),
    {ref:'D2',value:'NUP2105LT1G',footprint:'Package_TO_SOT_SMD:SOT-23',at:{x:52,y:31},body:{w:3,h:3},pads:[pad('1',-1.8,-1,.8,.7,can2H,'CAN2H'),pad('2',-1.8,1,.8,.7,can2L,'CAN2L'),pad('3',1.8,0,.8,.7,1,'GND')]},
  )
  const r2=evidence.footprints.find(row=>row.ref==='R2');r2.pads[1]={...r2.pads[1],netNumber:term2,netName:'CAN2_TERM_LINK'}
  const s=(x1,y1,x2,y2,net,layer='F.Cu')=>evidence.segments.push(segment(x1,y1,x2,y2,.22,net,layer))
  // Keep both MCU-side channels on the front copper perimeter, away from the
  // inherited controller routes. The extra 6 mm gateway envelope exists for this lane.
  s(27,25,36,29,can2Tx,'In3.Cu');s(36,29,39.1,29,can2Tx,'In3.Cu');s(39.1,29,39.1,30,can2Tx);evidence.vias.push(via(27,25,can2Tx),via(39.1,29,can2Tx))
  s(31,25,36,34,can2Rx,'In4.Cu');s(36,34,39.1,34,can2Rx,'In4.Cu');evidence.vias.push(via(31,25,can2Rx),via(39.1,34,can2Rx))
  // CAN2 field pair is confined to the lower-right gateway bay.
  s(42,28.4,47,28.4,can2H,'In3.Cu');s(47,28.4,50.2,30,can2H,'In3.Cu');s(50.2,30,61,29,can2H,'In3.Cu');s(47,28.4,47,39,can2H,'In3.Cu');s(47,39,50.9,39,can2H,'In3.Cu');for(const [x,y] of [[42,28.4],[50.2,30],[61,29],[50.9,39]])evidence.vias.push(via(x,y,can2H))
  s(42,35.6,46,35.6,can2L,'In4.Cu');s(46,35.6,53.8,31,can2L,'In4.Cu');s(53.8,31,62,32,can2L,'In4.Cu');s(46,35.6,46,40,can2L,'In4.Cu');s(46,40,53.1,40,can2L,'In4.Cu');s(53.1,40,53.1,39,can2L,'In4.Cu');for(const [x,y] of [[42,35.6],[53.8,31],[62,32],[53.1,39]])evidence.vias.push(via(x,y,can2L))
  // Local rail/return branches tie the second channel into the proven board rails.
  s(44.9,30,44,31,3);s(44,31,48,29,3,'In1.Cu');s(48,29,48,43,3,'In1.Cu');s(48,43,66,43,3,'In1.Cu');s(66,43,63.5,36.5,3,'In1.Cu');s(63.5,36.5,64,37,3);s(66,43,66,24,3,'In1.Cu');s(66,24,57,24,3,'In1.Cu');for(const [x,y] of [[44,31],[63.5,36.5]])evidence.vias.push(via(x,y,3))
  s(44.9,34,50.2,32,1,'B.Cu');s(50.2,32,62.5,34.5,1,'B.Cu');s(62.5,34.5,63,35,1);s(62.5,34.5,67,35,1,'B.Cu');s(67,35,67,22,1,'B.Cu');s(67,22,56,22,1,'B.Cu');for(const [x,y] of [[44.9,34],[50.2,32],[62.5,34.5],[56,22]])evidence.vias.push(via(x,y,1))
  s(64,37,64,39,3);s(63,35,61,35,1);s(61,35,61,41,1);s(61,41,63,41,1)
  return evidence
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
  const authoritative=renderAuthoritativeFootprint(footprint)
  if(authoritative)return authoritative
  // The proof geometry is embedded in the board, so do not claim a missing
  // external footprint library nickname.
  const embeddedName = embeddedFootprintName(footprint.footprint)
  const x0 = -footprint.body.w / 2
  const x1 = footprint.body.w / 2
  const y0 = -footprint.body.h / 2
  const y1 = footprint.body.h / 2
  const pads = footprint.pads.map((item) => `    (pad "${escapePcb(item.number)}" smd roundrect (at ${mm(item.x)} ${mm(item.y)} 0) (size ${mm(item.w)} ${mm(item.h)}) (layers "F.Cu" "F.Paste" "F.Mask") (roundrect_rratio 0.2) (net ${item.netNumber} "${escapePcb(item.netName)}") (uuid "${stableUuid(`${footprint.ref}-pad-${item.number}`)}"))`).join('\n')
  return `  (footprint "${escapePcb(embeddedName)}" (layer "F.Cu")
    (uuid "${stableUuid(`${footprint.ref}-footprint`)}")
    (at ${mm(footprint.at.x)} ${mm(footprint.at.y)} ${mm(footprint.rotation||0)})
    (property "Reference" "${escapePcb(footprint.ref)}" (at 0 ${mm(y0 - 1.1)} 0) (layer "F.Fab") (uuid "${stableUuid(`${footprint.ref}-ref`)}") (effects (font (size 0.8 0.8) (thickness 0.12))))
    (property "Value" "${escapePcb(footprint.value)}" (at 0 ${mm(y1 + 1.1)} 0) (layer "F.Fab") hide (uuid "${stableUuid(`${footprint.ref}-value`)}") (effects (font (size 0.7 0.7) (thickness 0.1))))
    (property "BoardForgeComponentUuid" "${footprint.componentUuid}" (at 0 0 0) (layer "F.Fab") hide (uuid "${stableUuid(`${footprint.ref}-component-link`)}") (effects (font (size 0.7 0.7))))
    (property "BoardForgeBindingId" "${footprint.bindingId}" (at 0 0 0) (layer "F.Fab") hide (uuid "${stableUuid(`${footprint.ref}-binding-link`)}") (effects (font (size 0.7 0.7))))
    (fp_rect (start ${mm(x0)} ${mm(y0)}) (end ${mm(x1)} ${mm(y1)}) (stroke (width 0.12) (type solid)) (fill none) (layer "F.Fab") (uuid "${stableUuid(`${footprint.ref}-silk`)}"))
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
  let schFile = findFirstExisting(projectDir, '.kicad_sch')
  // The Board009 custom-outline seed is intentionally PCB-first. Once its
  // exact production assets are present, create the sibling schematic rather
  // than falling back to a generic category or reporting an undefined model.
  if(!schFile&&['poe-sensor','poe-sensor-production','ethernet-controller','usb-hub'].includes(board.topologyId||board.id)){
    const pcbFile=findFirstExisting(projectDir,'.kicad_pcb')
    if(pcbFile)schFile=pcbFile.replace(/\.kicad_pcb$/i,'.kicad_sch')
  }
  if (!schFile || !board.bom.length) {
    return {
      status: board.bom.length ? 'SCHEMATIC_FILE_MISSING' : 'NOT_APPLICABLE_OUTLINE_ONLY',
      symbolCount: 0,
      reason: board.bom.length ? 'The outline workflow did not produce a .kicad_sch file.' : 'Outline-only proof has no requested electrical BOM.',
    }
  }

  const components = categorySchematicComponents(board)
  const nets = assignedNetNames(components)
    .map((name) => ({ name }))
  const model = generateSchematicModel(
    { name: board.name },
    components,
    { nets, emitConnectivityLabels: true, globalConnectivityLabels: board.globalConnectivityLabels !== false, powerFlags: categoryPowerFlags(board) },
  )
  await writeFile(schFile, kicadSchematicFromModel({ name: board.name }, model), 'utf8')
  await writeCategoryReviewLibraries(projectDir, model.symbols)
  await writeFile(path.join(projectDir, 'BoardForge_Category_Schematic_Model.json'), JSON.stringify({
    schema: 'boardforge.category-schematic-model.real-proof.v1',
    status: 'PRODUCTION_SYMBOL_GRAPH_PROJECTED',
    model,
    limitations: [],
  }, null, 2), 'utf8')
  return {
    status: 'PRODUCTION_SYMBOL_GRAPH_PROJECTED',
    schematicFile: schFile,
    symbolCount: model.symbols.length,
    netCount: model.nets.length,
    componentRefs: model.symbols.map((symbol) => symbol.ref),
    components: model.symbols.map((symbol) => ({ ref: symbol.ref, componentUuid: symbol.componentUuid, bindingId: symbol.bindingId })),
    limitations: [],
  }
}

function categorySchematicComponents(board) {
  const pinMaps = categorySchematicPinMaps(board)
  return board.bom.map((row, index) => {
    const approved = approvedAssetFor(row.mpn)
    const pinMap = pinMaps[row.ref] || approved?.symbolPinMap || fallbackCategoryPinMap(index)
    return {
      ref: row.ref,
      value: row.value,
      group: 'PRODUCTION_COMPONENT',
      role: row.role,
      symbol: approved?.symbol.libId || `BoardForge:BF_CONN_${Math.max(1, Object.keys(pinMap).length)}`,
      footprint: approved?.footprint.libId || `BoardForge:BF_CONN_${Math.max(1, Object.keys(pinMap).length)}`,
      pinMap,
      symbolPinMap: pinMap,
      assetSource: approved?.approval || 'missing-approved-production-asset',
      assetConfidence: approved ? 'APPROVED_PRODUCTION' : 'BLOCKED',
      forceProductionProjection: Boolean(approved),
      reviewNotes: approved ? 'Approved production symbol, footprint, and board-specific pin map projected.' : 'Approved production asset missing.',
      at: board.schematicPlacements?.[row.ref] || null,
      ...componentLink(board.id, row.ref),
      schematicUuid: stableUuid(`${board.id}-schematic-${row.ref}`),
    }
  })
}

export function categorySchematicPinMaps(board) {
  if(board.topologyId==='poe-sensor-production'&&board.categorySchematicPinMaps)return structuredClone(board.categorySchematicPinMaps)
  const maps = {
    'stm32-controller': {
      U1: approvedAssetFor('STM32F103C8T6').pinMap,
      U2: approvedAssetFor('SN65HVD230DR').pinMap,
      U3: { 1:'GND', 2:'3V3', 3:'5V' },
      J1: (board.bom||[]).some(row=>row.ref==='R_BOOT')?{1:'3V3',2:'SWDIO',3:'SWCLK',4:'NRST',5:'GND'}:approvedAssetFor('M20-9990245').pinMap,
      J2: (board.bom||[]).some(row=>row.ref==='R_BOOT')?{1:'5V_RAW',2:'GND',3:'CANH',4:'CANL',5:'I2C_SCL',6:'I2C_SDA'}:{ 1: 'GND', 2: '3V3', 3: 'CANH', 4: 'CANL', 5: 'I2C_SCL', 6: 'I2C_SDA' },
      R1: (board.bom||[]).some(row=>row.ref==='R_BOOT')?{1:'CANH',2:'TERM_LINK'}:{ 1: 'CANH', 2: 'CANL' }, C1: { 1: '3V3', 2: 'GND' }, C2: { 1: '3V3', 2: 'GND' }, C3: { 1: '3V3', 2: 'GND' },
      D1: approvedAssetFor('NUP2105LT1G').pinMap,
      Q1:{1:'GND',2:'5V_RAW',3:'5V'},D_PWR:{1:'5V',2:'GND'},C_BULK:{1:'5V',2:'GND'},JP1:{1:'TERM_LINK',2:'CANL'},R_BOOT:{1:'BOOT0',2:'GND'},R_RESET:{1:'3V3',2:'NRST'},C_RESET:{1:'NRST',2:'GND'},C4:{1:'3V3',2:'GND'},C5:{1:'3V3',2:'GND'},C6:{1:'3V3',2:'GND'},
    },
    'can-gateway': {
      U1: {...approvedAssetFor((board.bom||[]).find(row=>row.ref==='U1')?.mpn||'STM32G0B1CBT6').pinMap,42:'I2C_SCL',43:'I2C_SDA'},
      U2:{1:'CAN1_TX',2:'GND',3:'3V3',4:'CAN1_RX',6:'CAN1L',7:'CAN1H',8:'GND'},U4:{1:'CAN2_TX',2:'GND',3:'3V3',4:'CAN2_RX',6:'CAN2L',7:'CAN2H',8:'GND'},
      U3:{1:'GND',2:'3V3',3:'5V'},J1:{1:'3V3',2:'SWDIO',3:'SWCLK_BOOT0',4:'NRST',5:'GND'},
      J2:{1:'5V_RAW',2:'GND',3:'CAN1H',4:'CAN1L',5:'I2C_SCL',6:'I2C_SDA'},J3:{1:'CAN2H',2:'CAN2L',3:'GND',4:'3V3',5:'3V3',6:'GND'},
      Q1:{1:'GND',2:'5V_RAW',3:'5V'},D_PWR:{1:'5V',2:'GND'},C_BULK:{1:'5V',2:'GND'},R_BOOT:{1:'SWCLK_BOOT0',2:'GND'},R_RESET:{1:'3V3',2:'NRST'},C_RESET:{1:'NRST',2:'GND'},
      R1:{1:'CAN1H',2:'CAN1_TERM_LINK'},JP1:{1:'CAN1_TERM_LINK',2:'CAN1L'},R2:{1:'CAN2H',2:'CAN2_TERM_LINK'},JP2:{1:'CAN2_TERM_LINK',2:'CAN2L'},C1:{1:'3V3',2:'GND'},C2:{1:'3V3',2:'GND'},C3:{1:'3V3',2:'GND'},C4:{1:'3V3',2:'GND'},C5:{1:'3V3',2:'GND'},C6:{1:'3V3',2:'GND'},C7:{1:'3V3',2:'GND'},
      D1:{1:'CAN1H',2:'CAN1L',3:'GND'},D2:{1:'CAN2H',2:'CAN2L',3:'GND'},
    },
    'poe-sensor':poeSensorPinMaps(),
    'ethernet-controller':ethernetControllerPinMaps(),
    'usb-hub':board011UsbHubPinMaps(),
    'rp2040-instrument': {
      U1: approvedAssetFor('SC0914(13)').pinMap, U2: approvedAssetFor('W25Q128JVSIQ').pinMap,
      U3: { 1:'GND', 2:'3V3', 3:'VBUS' }, J1: { A1:'GND', A12:'GND', B1:'GND', B12:'GND', A4:'VBUS', A9:'VBUS', B4:'VBUS', B9:'VBUS', A5:'CC1', B5:'CC2', A6:'USB_DP_CONN', B6:'USB_DP_CONN', A7:'USB_DN_CONN', B7:'USB_DN_CONN', SH:'GND' },
      D1: approvedAssetFor('USBLC6-2SC6').pinMap,
      J2: { 1:'GND', 2:'3V3', 3:'I2C_SCL', 4:'I2C_SDA', 5:'SWCLK', 6:'SWDIO' },
      R1: { 1:'CC1', 2:'GND' }, R2: { 1:'CC2', 2:'GND' },
      C1: { 1:'3V3', 2:'GND' }, C2: { 1:'3V3', 2:'GND' }, C3: { 1:'3V3', 2:'GND' },
    },
    'usb-c-pd-sink': {
      J1:{A1:'GND',A12:'GND',B1:'GND',B12:'GND',A4:'VBUS_RAW',A9:'VBUS_RAW',B4:'VBUS_RAW',B9:'VBUS_RAW',A5:'CC1',B5:'CC2',SH:'GND'},
      U1:{2:'CC1',4:'CC2',10:'GND',16:'VBUS_EN_SNK',18:'VBUS_PROTECTED',22:'VBUS_PROTECTED',24:'VBUS_PROTECTED',25:'GND'},
      Q1:{1:'VBUS_EN_SNK',2:'VBUS_PROTECTED',3:'VBUS_SWITCHED'},
      U2:{1:'GND',2:'SW',3:'VBUS_SWITCHED',4:'FB',5:'VBUS_SWITCHED',6:'BOOT'},
      D1:{1:'VBUS_PROTECTED',2:'GND'},F1:{1:'VBUS_RAW',2:'VBUS_PROTECTED'},L1:{1:'SW',2:'5V'},C1:{1:'VBUS_PROTECTED',2:'GND'},C2:{1:'5V',2:'GND'},R_FB_TOP:{1:'5V',2:'FB'},R_FB_BOTTOM:{1:'FB',2:'GND'},R_GATE_PULLUP:{1:'VBUS_PROTECTED',2:'VBUS_EN_SNK'},C_BOOT:{1:'BOOT',2:'SW'},J2:{1:'5V',2:'GND'},
    },
    'usb-c-pd-source': {
      J1:{1:'5V_RAW',2:'GND'},F1:{1:'5V_RAW',2:'PP5V'},D1:{1:'PP5V',2:'GND'},U1:{1:'GND',2:'3V3',3:'PP5V'},
      U2:{1:'LDO_3V3',4:'1V5',11:'GND',12:'GND',14:'GND',15:'DRAIN',16:'EEPROM_SDA',17:'EEPROM_SCL',23:'VBUS',24:'VBUS',25:'VBUS',28:'CC1',29:'CC2',30:'DRAIN',31:'GND',32:'VBUS',33:'VBUS',34:'PP5V',35:'PP5V',38:'3V3',39:'GND',40:'DRAIN'},
      U3:{1:'GND',2:'GND',3:'GND',4:'GND',5:'EEPROM_SDA',6:'EEPROM_SCL',7:'GND',8:'LDO_3V3'},
      J2:{A1:'GND',A12:'GND',B1:'GND',B12:'GND',A4:'VBUS',A9:'VBUS',B4:'VBUS',B9:'VBUS',A5:'CC1',B5:'CC2',SH:'GND'},D2:{1:'VBUS',2:'GND'},C_PP5V:{1:'PP5V',2:'GND'},C_VBUS:{1:'VBUS',2:'GND'},C_3V3:{1:'LDO_3V3',2:'GND'},C_1V5:{1:'1V5',2:'GND'},
      R_EEPROM_SDA:{1:'LDO_3V3',2:'EEPROM_SDA'},R_EEPROM_SCL:{1:'LDO_3V3',2:'EEPROM_SCL'},
    },
    'usb-c-fixed-source': {
      J1:{1:'5V_RAW',2:'GND'}, F1:{1:'5V_RAW',2:'5V_FUSED'}, D1:{1:'5V_FUSED',2:'GND'},
      // TPS25810 pin functions are resolved from Interface_USB:TPS25810RVC.
      // CHG is high and CHG_HI is low: that is the reviewed 1.5-A Type-C
      // advertisement strap, not a synthetic PD policy.
      U1:{1:'FAULT_N',2:'5V_FUSED',3:'5V_FUSED',4:'5V_FUSED',5:'5V_FUSED',6:'5V_FUSED',7:'5V_FUSED',8:'GND',9:'REF_RTN',10:'REF',11:'CC1',12:'GND',13:'CC2',14:'VBUS',15:'VBUS',16:null,17:null,18:null,19:null,20:null,21:'GND'},
      J2:{A1:'GND',A12:'GND',B1:'GND',B12:'GND',A4:'VBUS',A9:'VBUS',B4:'VBUS',B9:'VBUS',A5:'CC1',B5:'CC2',SH:'GND'},
      C_IN:{1:'5V_FUSED',2:'GND'}, C_OUT:{1:'VBUS',2:'GND'}, C_AUX:{1:'5V_FUSED',2:'GND'},
      R_REF:{1:'REF',2:'REF_RTN'}, R_FAULT:{1:'5V_FUSED',2:'FAULT_N'},
    },
    'usb-c-esp32-sensor': {
      U1: approvedAssetFor(COMPACT_ESP32_S3_1U_PRODUCTION_TOPOLOGY.mpn).pinMap,
      J1: usbCReceptacleSymbolPinMap(),
      U2: approvedAssetFor('MCP1700T-3302E/TT').pinMap,
      J2: { 1: 'GND', 2: '3V3', 3: 'I2C_SCL', 4: 'I2C_SDA', 5: 'UART_TX', 6: 'UART_RX' },
      R1: { 1: 'CC1', 2: 'GND' },
      R2: { 1: 'CC2', 2: 'GND' },
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
    'industrial-io-production': {
      J1:{1:'FIELD_24V_RAW',2:'FIELD_GND',3:'FIELD_IN1',4:'FIELD_IN2'},
      F1:{1:'FIELD_24V_RAW',2:'FIELD_24V_FUSED'},
      D1:{1:'FIELD_24V_FUSED',2:'FIELD_GND'},
      // ISO1212DBQ primary pin order: logic side is 1-8 and field side is
      // 9-16. SUB1/SUB2 and package NC pins have no generated net labels.
      U1:{1:'GND',2:'3V3',3:'3V3',4:'LOGIC_IN1',5:'LOGIC_IN2',8:'GND',9:'FIELD_GND',10:'FIELD_IN2_RSENSE',11:'FIELD_SENSE2',14:'FIELD_GND',15:'FIELD_IN1_RSENSE',16:'FIELD_SENSE1'},
      U2:{8:'GND',9:'3V3',23:'GND',24:'3V3',32:'LOGIC_IN1',33:'LOGIC_IN2',35:'GND',36:'3V3',47:'GND',48:'3V3'},
      R1:{1:'FIELD_IN1',2:'FIELD_SENSE1'},
      R2:{1:'FIELD_IN2',2:'FIELD_SENSE2'},
      R3:{1:'FIELD_IN1_RSENSE',2:'FIELD_GND'},
      R4:{1:'FIELD_IN2_RSENSE',2:'FIELD_GND'},
      C1:{1:'FIELD_SENSE1',2:'FIELD_GND'},
      C2:{1:'FIELD_SENSE2',2:'FIELD_GND'},
      C3:{1:'3V3',2:'GND'},
      J2:{1:'GND',2:'3V3',3:'LOGIC_IN1',4:'LOGIC_IN2',6:'GND'},
    },
    'drone-stack-board': {
      J1: { 1: 'GND', 2: '5V', 3: 'USB_DP', 4: 'USB_DN' },
      J2: { 1: 'GND', 2: '5V', 3: 'UART_TX', 4: 'UART_RX', 5: 'I2C_SCL', 6: 'I2C_SDA', 7: 'CANH', 8: 'CANL' },
      P1: { 1: 'VBAT', 2: '5V', 3: 'GND' },
    },
  }
  return maps[board.topologyId || board.id] || {}
}

// A null or empty map entry means the physical pin is intentionally not
// assigned by this topology.  It must not become a literal `null` KiCad net
// (nor suppress the later explicit unconnected-pad accounting).
export function assignedPinNetEntries(pinMap = {}) {
  return Object.entries(pinMap).filter(([, netName]) => typeof netName === 'string' && netName.trim().length > 0)
}

export function assignedNetNames(components = []) {
  return [...new Set(components.flatMap((component) => assignedPinNetEntries(component?.pinMap).map(([, netName]) => netName)))]
}

export function categoryPowerFlags(board){
  const topology=board.topologyId||board.id
  if(topology==='usb-c-esp32-sensor')return planEsp32TopologyPowerFlags()
  if(topology==='rp2040-instrument')return planExternalConnectorPowerFlags({powerNet:'VBUS',sourceKind:'external-usb-power'})
  if(topology==='ethernet-controller')return [
    {ref:'#FLG01',symbolLibId:'power:PWR_FLAG',rail:'5V',source:{ref:'J_PWR',kind:'external-regulated-power'},reason:'J_PWR is the explicit regulated 5 V board input.'},
    {ref:'#FLG02',symbolLibId:'power:PWR_FLAG',rail:'GND',source:{ref:'J_PWR',kind:'external-power-return'},reason:'J_PWR is the explicit board power return.'},
    {ref:'#FLG03',symbolLibId:'power:PWR_FLAG',rail:'3V3A',source:{ref:'FB_AVDD',kind:'filtered-analog-supply'},reason:'FB_AVDD is the physical filtered analog-supply source.'},
    {ref:'#FLG04',symbolLibId:'power:PWR_FLAG',rail:'CHASSIS',source:{ref:'J1',kind:'ethernet-shield-chassis-entry'},reason:'J1 shield pins are the explicit chassis discharge entry.'},
  ]
  if(topology==='poe-sensor-production')return [
    {ref:'#FLG01',symbolLibId:'power:PWR_FLAG',rail:'3V3A',source:{ref:'FB_AVDD',kind:'filtered-analog-supply'},reason:'FB_AVDD is the physical 3V3-to-AVDD ferrite path documented by the W5500 reference schematic.'},
  ]
  if(topology==='usb-c-pd-sink')return [...planExternalConnectorPowerFlags({powerNet:'VBUS_RAW',sourceKind:'external-usb-power'}),{ref:'#FLG03',symbolLibId:'power:PWR_FLAG',rail:'VBUS_PROTECTED',source:{ref:'F1',kind:'fused-external-power'},reason:'The input fuse is the physical source path for protected VBUS.'},{ref:'#FLG04',symbolLibId:'power:PWR_FLAG',rail:'VBUS_SWITCHED',source:{ref:'Q1',kind:'reviewed-protected-mosfet-output'},reason:'The protected MOSFET output is the physical source for the downstream buck VIN rail.'}]
  if(topology==='usb-c-pd-source')return [...planExternalConnectorPowerFlags({powerNet:'5V_RAW',sourceKind:'selv-input-power'}),{ref:'#FLG03',symbolLibId:'power:PWR_FLAG',rail:'PP5V',source:{ref:'F1',kind:'fused-selv-power'},reason:'The input fuse is the physical source path for the protected PP5V rail.'}]
  if(topology==='usb-hub')return [
    {ref:'#FLG01',symbolLibId:'power:PWR_FLAG',rail:'VIN_RAW',source:{ref:'J_PWR',kind:'external-selv-input'},reason:'J_PWR is the declared center-positive 12 V SELV input.'},
    {ref:'#FLG02',symbolLibId:'power:PWR_FLAG',rail:'GND',source:{ref:'J_PWR',kind:'external-selv-return'},reason:'J_PWR establishes the board input return.'},
    {ref:'#FLG03',symbolLibId:'power:PWR_FLAG',rail:'VIN_PROTECTED',source:{ref:'Q_REV',kind:'reverse-polarity-protected-input'},reason:'Q_REV is the protected input path feeding the buck regulator.'},
    {ref:'#FLG04',symbolLibId:'power:PWR_FLAG',rail:'5V',source:{ref:'L_5V',kind:'regulated-buck-output-filter'},reason:'L_5V is the buck-output filter element supplying the 5 V hub and port-controller rail.'},
    // U_3V3 exposes a native KiCad power-output pin.  A PWR_FLAG here would
    // assert a second source and mask a real regulator-output conflict.
  ]
  // TPS25810 OUT is a native KiCad power-output pin.  Adding a PWR_FLAG on
  // VBUS would create a false power-output-to-power-output ERC conflict.
  if(topology==='usb-c-fixed-source')return [{ref:'#FLG01',symbolLibId:'power:PWR_FLAG',rail:'5V_RAW',source:{ref:'J1',kind:'external-selv-power'},reason:'J1 pin 1 is the explicit regulated SELV input source.'},{ref:'#FLG02',symbolLibId:'power:PWR_FLAG',rail:'GND',source:{ref:'J1',kind:'external-selv-return'},reason:'J1 pin 2 is the explicit SELV input return; this drives the TPS25810 CHG_HI low strap in KiCad ERC.'},{ref:'#FLG03',symbolLibId:'power:PWR_FLAG',rail:'5V_FUSED',source:{ref:'F1',kind:'fused-selv-power'},reason:'The input fuse is the physical source path for the protected TPS25810 supply rail.'}]
  if(topology==='industrial-io-production')return [
    {ref:'#FLG01',symbolLibId:'power:PWR_FLAG',rail:'3V3',source:{ref:'J2',kind:'external-logic-supply'},reason:'The service header is the explicit 3.3 V logic-domain supply input.'},
    {ref:'#FLG02',symbolLibId:'power:PWR_FLAG',rail:'GND',source:{ref:'J2',kind:'external-logic-return'},reason:'The service header is the explicit logic-domain supply return.'},
    {ref:'#FLG03',symbolLibId:'power:PWR_FLAG',rail:'FIELD_24V_RAW',source:{ref:'J1',kind:'external-field-supply'},reason:'The field terminal is the explicit 24 V field input.'},
    {ref:'#FLG04',symbolLibId:'power:PWR_FLAG',rail:'FIELD_GND',source:{ref:'J1',kind:'external-field-return'},reason:'The field terminal is the explicit isolated field return.'},
  ]
  if(topology==='stm32-controller'&&(board.bom||[]).some(row=>row.ref==='R_BOOT'))return [...planExternalConnectorPowerFlags({powerNet:'5V_RAW',sourceRef:'J2'}),{ref:'#FLG03',symbolLibId:'power:PWR_FLAG',rail:'5V',source:{ref:'Q1',kind:'reverse-polarity-protected-output'},reason:'The reviewed reverse-polarity PMOS output is the physical source for the protected 5 V regulator rail.'}]
  if(topology==='can-gateway'&&(board.bom||[]).some(row=>['STM32G0B1CBT6','STM32G0B1CCT6TR'].includes(row.mpn)))return [...planExternalConnectorPowerFlags({powerNet:'5V_RAW',sourceRef:'J2'}),{ref:'#FLG03',symbolLibId:'power:PWR_FLAG',rail:'5V',source:{ref:'Q1',kind:'reverse-polarity-protected-output'},reason:'The reviewed reverse-polarity PMOS output is the physical source for the protected 5 V regulator rail.'}]
  if(topology==='stm32-controller'||topology==='can-gateway')return planExternalConnectorPowerFlags()
  return []
}

function renderAuthoritativeFootprint(footprint){
  let resolved
  try{resolved=resolveAuthoritativeKiCadFootprint(footprint.footprint)}catch{return null}
  // Once an installed package resolves, proof-pad geometry and its legacy pad
  // numbers are forbidden inputs. Only the verified production pad map may
  // assign nets to the authoritative footprint.
  const netByPad=new Map(Object.entries(footprint.authoritativeNets||{}).map(([pad,net])=>[String(pad),net]))
  const asset=approvedAssetFor(footprint.mpn),text=serializeAuthoritativeKiCadFootprint({resolved,ref:footprint.ref,value:footprint.value,at:{...footprint.at,rotation:footprint.rotation||0},netByPad,padNumberAliases:logicalKiCadPadNumbers(asset),properties:{BoardForgeComponentUuid:footprint.componentUuid,BoardForgeBindingId:footprint.bindingId},silkscreen:'fabrication',uuidFor:key=>stableUuid(`${footprint.ref}-authoritative-${key}`)})
  return text.split('\n').map(line=>`  ${line}`).join('\n')
}

function logicalKiCadPadNumbers(asset){
  if(!Object.keys(asset?.footprintPadAliases||{}).length)return{}
  const logicalByCanonical=Object.fromEntries(Object.keys(asset.symbolPinMap||{}).map(pin=>[String(asset.pinAliases?.[pin]||pin),String(pin)]))
  return Object.fromEntries(Object.keys(asset.footprintPadMap||{}).map(pad=>{const canonical=String(asset.footprintPadAliases?.[pad]||pad);return[pad,logicalByCanonical[canonical]||pad]}))
}

function addAuthoritativeUnconnectedPadNets(evidence,board){
  let next=Math.max(0,...evidence.nets.map(row=>row.number||0))+1
  for(const footprint of evidence.footprints){
    let resolved
    try{resolved=resolveAuthoritativeKiCadFootprint(footprint.footprint)}catch{continue}
    const asset=approvedAssetFor(board.bom.find(row=>row.ref===footprint.ref)?.mpn),symbolPins=new Map()
    try{for(const pin of resolveAuthoritativeKiCadSymbol(asset?.symbol?.libId).pins)symbolPins.set(String(asset?.pinAliases?.[pin.number]||pin.number),pin.name)}catch{}
    for(const pad of resolved.pads){const number=String(pad.number);if(!number||footprint.authoritativeNets[number])continue
      const pinName=String(symbolPins.get(number)||`Pin_${number}`).replaceAll('/','{slash}')
      const netName=`unconnected-(${footprint.ref}-${pinName}-Pad${number})`
      evidence.nets.push({number:next,name:netName});footprint.authoritativeNets[number]={netName,netNumber:next};next++
    }
  }
}

function markMountingHolesBoardOnly(text){
  let cursor=0,out=''
  while(true){const start=text.indexOf('(footprint ',cursor);if(start<0)return out+text.slice(cursor);out+=text.slice(cursor,start);const block=balancedSexpr(text,start);if(!block)return out+text.slice(start)
    const isHole=/\(property\s+"Reference"\s+"H\d+"/.test(block),next=isHole&&!/\(attr\s+[^)]*board_only/.test(block)?block.replace(/(\(layer\s+"[^"]+"\))/,`$1\n\t(attr board_only)`):block
    out+=next;cursor=start+block.length
  }
}

function balancedSexpr(text,start){let depth=0,quoted=false,escaped=false;for(let i=start;i<text.length;i++){const ch=text[i];if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;continue}if(ch==='"')quoted=true;else if(ch==='(')depth++;else if(ch===')'&&--depth===0)return text.slice(start,i+1)}return null}

function usbCReceptacleSymbolPinMap(){const map=approvedAssetFor('USB4105-GF-A').pinMap;delete map.S1;map.SH='GND';return map}

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
  // KiCad 10 may canonicalize a promoted board to named pad net records
  // without retaining legacy top-level numeric declarations.  The pad records
  // remain the authoritative physical connectivity source, so do not mark a
  // DRC-clean projected board as electrically empty solely for that serializer
  // representation change.
  const declaredNets = (scan?.nets || []).filter((net) => net.name && net.name !== '')
  const nets = declaredNets.length ? declaredNets : [...new Set((scan?.pads || []).map((pad) => pad.netName).filter(Boolean))].map((name) => ({ name }))
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
  if (!outlineOnly && !['SYMBOL_GRAPH_GENERATED_REVIEW_REQUIRED','PRODUCTION_SYMBOL_GRAPH_PROJECTED'].includes(categorySchematic?.status)) blockers.push(categoryGenerationBlocker('schematic_generation', 'CATEGORY_SCHEMATIC_WRITE_FAILED', categorySchematic?.reason || 'The category schematic writer did not produce a reviewable symbol graph.', 'Fix the category schematic writer before treating the PCB evidence as a real board workflow.'))
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

function passiveFootprint(ref, value, x, y, net1, name1, net2, name2) {
  return { ref, value, footprint:'Resistor_SMD:R_0603_1608Metric', at:{x,y}, body:{w:2,h:1}, pads:[pad('1',-1.1,0,0.8,0.8,net1,name1),pad('2',1.1,0,0.8,0.8,net2,name2)] }
}

function verticalPassive(ref,value,x,y,net1,name1,net2,name2,spacing=1) {
  return {ref,value,footprint:/^C/.test(ref)?'Capacitor_SMD:C_0603_1608Metric':'Resistor_SMD:R_0603_1608Metric',at:{x,y},body:{w:1,h:spacing*2+1},pads:[pad('1',0,-spacing,0.8,0.8,net1,name1),pad('2',0,spacing,0.8,0.8,net2,name2)]}
}

function addLayerTree(evidence,points,net,layer,busY) {
  const xs=points.map(([x])=>x)
  for(const [x,y] of points){ evidence.vias.push(via(x,y,net)); evidence.segments.push(segment(x,y,x,busY,0.3,net,layer)) }
  evidence.segments.push(segment(Math.min(...xs),busY,Math.max(...xs),busY,0.3,net,layer))
}

// Escape collinear connector/power pads before joining a bounded bus.  Unlike
// addLayerTree, this never drops a full-height trunk through every pad sharing x.
function addDogboneTree(evidence,points,net,layer,busY,offset=3) {
  const escaped=points.map(([x,y])=>[x,y,x>32?x-offset:x+offset])
  for(const [x,y,escapeX] of escaped){
    evidence.vias.push(via(x,y,net))
    evidence.segments.push(segment(x,y,escapeX,y,0.3,net,layer),segment(escapeX,y,escapeX,busY,0.3,net,layer))
  }
  const xs=escaped.map(([, ,escapeX])=>escapeX)
  evidence.segments.push(segment(Math.min(...xs),busY,Math.max(...xs),busY,0.3,net,layer))
}

function componentLink(boardId, ref) {
  return { ref, componentUuid: stableUuid(`${boardId}-component-${ref}`), bindingId: createHash('sha256').update(`boardforge-binding:${boardId}:${ref}`).digest('hex') }
}

async function writeCategoryReviewLibraries(projectDir, symbols) {
  const counts = [...new Set(symbols.map((symbol) => Number(String(symbol.symbol).match(/BF_CONN_(\d+)/)?.[1])).filter(Boolean))]
  const footprintDir = path.join(projectDir, 'BoardForge.pretty')
  await mkdir(footprintDir, { recursive: true })
  await writeFile(path.join(projectDir, 'BoardForge.kicad_sym'), boardforgeReviewSymbolLibrary(symbols), 'utf8')
  await writeFile(path.join(projectDir, 'sym-lib-table'), '(sym_lib_table\n  (lib (name "BoardForge")(type "KiCad")(uri "${KIPRJMOD}/BoardForge.kicad_sym")(options "")(descr "BoardForge generated review symbols"))\n)\n', 'utf8')
  await writeFile(path.join(projectDir, 'fp-lib-table'), '(fp_lib_table\n  (lib (name "BoardForge")(type "KiCad")(uri "${KIPRJMOD}/BoardForge.pretty")(options "")(descr "BoardForge generated review footprints"))\n)\n', 'utf8')
  for (const count of counts) await writeFile(path.join(footprintDir, `BF_CONN_${count}.kicad_mod`), reviewFootprint(count), 'utf8')
  // Keep every bundled authoritative footprint available to KiCad's symbol
  // link resolver. The PCB also embeds its geometry, while this library makes
  // the project itself open cleanly in KiCad without a missing-footprint ERC.
  if(symbols.some(symbol=>symbol.footprint==='BoardForge:THI_2-0511M_DIP16_6Lead'))await writeFile(path.join(footprintDir,'THI_2-0511M_DIP16_6Lead.kicad_mod'),bundledThi20511mFootprintDefinition(),'utf8')
}

function reviewFootprint(count) {
  const pads = Array.from({ length: count }, (_, index) => `  (pad "${index + 1}" thru_hole circle (at 0 ${index * 2.54}) (size 1.7 1.7) (drill 1) (layers "*.Cu" "*.Mask"))`).join('\n')
  return `(footprint "BF_CONN_${count}"\n  (version 20240108)\n  (generator "BoardForge Plugin CLI")\n  (layer "F.Cu")\n  (attr through_hole)\n${pads}\n)\n`
}

export function embeddedFootprintName(value) {
  return String(value || '').split(':').at(-1)
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

function buildMakeSourcableReport({ board, assetBinding }) {
  const rows = board.bom || []
  const components = new Map((assetBinding?.components || []).map((component) => [component.ref, component]))
  const sourcingRows = rows.map((row) => {
    const component = components.get(row.ref)
    const selection = component?.canonicalBinding?.partSelection
    const observations = selection?.observations || []
    const providerEvidence = Object.fromEntries(['digikey','mouser'].map((provider) => {
      const proof = observations.find((item) => item.provider === provider && item.mpn === selection?.mpn && item.live && item.exact)
      return [provider, proof ? { live:true, queriedAt:proof.checkedAt, requestId:proof.requestId || `${provider}-${row.ref}-${proof.checkedAt}`, stockStatus:proof.stockStatus, quantityAvailable:proof.quantityAvailable } : null]
    }))
    return { ref:row.ref, mpn:selection?.mpn || row.mpn || null, bindingId:component?.canonicalBinding?.binding?.bindingId || null, providers:providerEvidence }
  })
  const live = sourcingRows.length > 0 && sourcingRows.every((row) => row.mpn && row.bindingId && row.providers.digikey?.live && row.providers.mouser?.live)
  return {
    schema: 'boardforge.make-sourcable.real-proof.v1',
    boardId: board.id,
    status: live ? 'SOURCING_LIVE_VERIFIED' : 'SOURCING_REVIEW_REQUIRED',
    bomRows: rows.length,
    noFakeStock: true,
    rows: sourcingRows,
  }
}

async function buildSchematicAssetBindingReport({ board, files, validationReports, categorySchematic, liveBindings = false, canonicalBindingResolver, productionPartResolver }) {
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
  const resolver = canonicalBindingResolver || (liveBindings ? defaultCanonicalBindingResolver : null)
  const lookupService = liveBindings ? createPartLookupService() : null
  const partResolver = productionPartResolver || (liveBindings ? createProductionPartResolver({ providers:[
    digikeyProductionProvider(lookupService),
    mouserProductionProvider(createMouserProvider({env:loadBoardForgeEnv({cwd:REPO_ROOT}).env,liveLookup:true})),
  ] }) : null)
  const canonicalResults = new Map()
  for (const row of board.bom) {
    const candidate = resolvedCandidates.get(row.ref)
    let effectiveRow=row, selection=null
    if (partResolver) {
      selection=await partResolver({requirement:row,family:productionFamily(board.id,row)})
      if(selection.status==='SELECTED') effectiveRow={...row,mpn:selection.mpn}
      else {
        canonicalResults.set(row.ref, { status: 'BLOCKED', partSelection:selection, blocker: { code: selection?.blocker?.code || 'NO_LIVE_EXACT_PRODUCTION_CANDIDATE', stage: 'component_selection', ref: row.ref, mpn: row.mpn || null, detail: 'Approved production candidates did not produce fresh exact live evidence.' } })
        continue
      }
    }
    if (!effectiveRow.mpn) {
      canonicalResults.set(row.ref, { status: 'BLOCKED', partSelection:selection, blocker: { code: selection?.blocker?.code || 'EXACT_MPN_REQUIREMENT_MISSING', stage: 'component_selection', ref: row.ref, detail: 'No exact manufacturer part number has fresh live production evidence.' } })
      continue
    }
    if (!resolver) {
      canonicalResults.set(row.ref, { status: 'BLOCKED', blocker: { code: 'LIVE_CANONICAL_BINDING_NOT_REQUESTED', stage: 'live_sourcing', ref: row.ref, mpn: row.mpn, detail: 'Run the pilot with liveBindings enabled to obtain fresh supplier evidence.' } })
      continue
    }
    try {
      const binding = await resolver({ row:effectiveRow, board, candidate, lookupService, partSelection:selection })
      canonicalResults.set(row.ref, { status: 'BOUND', partSelection:selection, binding, projections: projectCanonicalBinding(binding) })
    } catch (error) {
      canonicalResults.set(row.ref, { status: 'BLOCKED', partSelection:selection, selectedMpn:effectiveRow.mpn, blocker: { code: error.code || 'CANONICAL_BINDING_FAILED', stage: bindingStage(error.code), ref: row.ref, mpn: effectiveRow.mpn, detail: String(error.code || error.message || error) } })
    }
  }
  const components = board.bom.map((row) => {
    const candidate = resolvedCandidates.get(row.ref)
    const canonical = canonicalResults.get(row.ref)
    const projected = categorySchematicComponents(board).find(component=>component.ref===row.ref)
    return {
    ref: row.ref,
    value: row.value,
    group: candidate?.group || null,
    requestedRole: row.role,
    requestedVerification: row.verificationStatus,
    symbol: projected?.symbol || null,
    footprint: projected?.footprint || null,
    pinMap: projected?.pinMap || null,
    status: canonical?.status==='BOUND' ? 'PRODUCTION_PROJECTED' : 'REVIEW_REQUIRED',
    reason: canonical?.status==='BOUND' ? 'Canonical production binding is projected into the generated KiCad sources.' : 'Canonical production binding is incomplete.',
    exactMpnRequirement: canonical?.selectedMpn || canonical?.binding?.manufacturerPartNumber || row.mpn || canonical?.partSelection?.mpn || null,
    canonicalBinding: canonical,
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
    canonicallyBound: components.filter((component) => component.canonicalBinding?.status === 'BOUND').length,
    canonicalBlocked: components.filter((component) => component.canonicalBinding?.status === 'BLOCKED').length,
  }
  const canonicalComplete = components.every((component) => component.canonicalBinding?.status === 'BOUND')
  return {
    schema: 'boardforge.schematic-asset-binding.real-proof.v1',
    boardId: board.id,
    status: canonicalComplete ? 'ASSET_BINDINGS_VERIFIED' : 'ASSET_BINDINGS_REVIEW_REQUIRED',
    manufacturingAllowed: canonicalComplete,
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
    canonicalBindingStatus: canonicalComplete ? 'CANONICAL_BINDINGS_COMPLETE' : 'CANONICAL_BINDINGS_BLOCKED',
    canonicalBlockers: components.flatMap((component) => component.canonicalBinding?.blocker ? [component.canonicalBinding.blocker] : []),
  }
}

function productionFamily(boardId,row){if(boardId==='usb-c-esp32-sensor'){if(row.ref==='U1')return'ESP32_S3';if(row.ref==='J1')return'USB';if(row.ref==='U2')return'REGULATOR';if(row.ref==='J2')return'SENSOR_CONNECTOR';if(/^R[12]$/.test(row.ref))return'RES_5K1_0603'}return categoryAssetGroup(boardId,row.ref)}

async function defaultCanonicalBindingResolver({ row, board, candidate, partSelection }) {
  const approved=approvedAssetFor(row.mpn)
  const boardPinMap=categorySchematicPinMaps(board)[row.ref]
  if(approved) candidate={...candidate,mpn:row.mpn,group:candidate?.group, symbol:approved.symbol,footprint:approved.footprint,pinMap:boardPinMap||approved.pinMap,package:approved.package,productionAssetApproval:approved.approval}
  if (!candidate?.symbol || !candidate?.footprint || !candidate?.pinMap) {
    const error = new Error('APPROVED_ASSET_METADATA_MISSING'); error.code = 'APPROVED_ASSET_METADATA_MISSING'; throw error
  }
  const candidateMpn=String(candidate.mpn||'').toLowerCase(), selectedMpn=String(row.mpn||'').toLowerCase()
  const genericPassive=candidate.group==='RES' && /0603/i.test(String(candidate.package||candidate.footprint?.libId||''))
  if(candidateMpn && candidateMpn!==selectedMpn && !genericPassive){const error=new Error('APPROVED_ASSET_MPN_MISMATCH');error.code='APPROVED_ASSET_MPN_MISMATCH';throw error}
  return resolveCanonicalComponentBinding({
    requirement: { id: `pilot-${row.ref}`, ref: row.ref, logicalRole: row.role, value: row.value, mpn: row.mpn },
    lookupService: partSelection?.status==='SELECTED' ? {lookup:async()=>({selected:{manufacturerPartNumber:partSelection.mpn,manufacturer:'',provider:partSelection.provider,matchType:'exact',status:partSelection.stockStatus==='OUT_OF_STOCK'?'VERIFIED_OUT_OF_STOCK':'VERIFIED_IN_STOCK',stockStatus:partSelection.stockStatus,quantityAvailable:partSelection.quantityAvailable,lifecycleStatus:partSelection.lifecycle,lastChecked:partSelection.checkedAt},lastChecked:partSelection.checkedAt})} : createPartLookupService(),
    assetResolver: async () => ({ symbol: candidate.symbol, footprint: candidate.footprint, model3d: candidate.model3d, pinMap: candidate.pinMap }),
  })
}

function bindingStage(code = '') {
  if (/MPN|SUPPLIER|LOOKUP|STALE/.test(code)) return 'live_sourcing'
  if (/ASSET|SYMBOL|FOOTPRINT|PIN_MAP/.test(code)) return 'asset_binding'
  return 'component_binding'
}

function categorySchematicNets(board) {
  const pinMaps = categorySchematicPinMaps(board)
  return [...new Set(Object.values(pinMaps).flatMap((pinMap) => Object.values(pinMap)))].map((name) => ({ name }))
}

function categoryAssetGroup(boardId, ref) {
  const groups = {
    'usb-c-esp32-sensor': { U1: 'ESP32_S3', J1: 'USB', U2: 'REGULATOR', J2: 'SENSOR_CONNECTOR', R1:'RES', R2:'RES' },
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
  if (board.bom.length && assetBinding?.canonicalBindingStatus !== 'CANONICAL_BINDINGS_COMPLETE') items.push(blocker('sourcing', 'BOM_NOT_LIVE_VERIFIED', 'Candidate BOM rows are not live-stock verified.', 'Run Make Sourcable with configured supplier credentials.'))
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

async function writeBomAndSourcing({ projectDir, board, categorySchematic, categoryPcbEvidence, assetBinding }) {
  if (!board.bom.length) return { bom: [], cpl: [] }
  const links = new Map(categorySchematic.components.map((row) => [row.ref, row]))
  const placements = new Map((categoryPcbEvidence.components || []).map((row) => [row.ref, row]))
  const bom = board.bom.map((row) => ({ ...row, ...links.get(row.ref) }))
  const cpl = board.bom.map((row) => ({ ref: row.ref, ...placements.get(row.ref) }))
  const csv = ['Reference,Value,Role,VerificationStatus,ComponentUuid,BindingId', ...bom.map((row) => `${csvCell(row.ref)},${csvCell(row.value)},${csvCell(row.role)},${csvCell(row.verificationStatus)},${row.componentUuid},${row.bindingId}`)].join('\n')
  await writeFile(path.join(projectDir, 'BoardForge_BOM.csv'), csv, 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_CPL.csv'), ['Reference,ComponentUuid,BindingId', ...cpl.map((row) => `${row.ref},${row.componentUuid},${row.bindingId}`)].join('\n'), 'utf8')
  const sourcing = buildMakeSourcableReport({ board, assetBinding })
  await writeJsonAndMarkdown(projectDir, 'BoardForge_BOM_Sourcing_Report', sourcing, renderMakeSourcableMarkdown(sourcing))
  return { bom, cpl }
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

function bom(ref, value, role, verificationStatus, mpn = null) {
  return { ref, value, role, verificationStatus, mpn }
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

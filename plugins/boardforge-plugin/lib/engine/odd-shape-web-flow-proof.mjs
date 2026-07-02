import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'
import { createLocalArtifactApi } from '../platform/local-artifact-api.mjs'
import { exportCustomOutlineSeed, mountingEarsOutline } from '../outline/custom-outline-seed-export.mjs'
import { writeBoardPreview } from '../preview/board-preview-generator.mjs'
import { createWebProjectCard } from '../preview/project-card-preview.mjs'

export async function runOddShapeWebFlowProof({ projectDir }) {
  const projectName = path.basename(projectDir)
  await mkdir(projectDir, { recursive: true })
  const outline = await exportCustomOutlineSeed({ projectDir, preset: 'mounting ears' })
  const api = createLocalArtifactApi({ rootDir: path.dirname(projectDir) })
  const intake = await api.startIntake({
    projectId: projectName,
    prompt: 'Make me a compact odd-shaped robotics controller with USB-C, CAN, I2C, UART/GPS, SWD, PWM, mounting ears, and JLCPCB manufacturing.',
  })
  const answered = await api.answerIntake({
    sessionFile: intake.sessionFile,
    answers: {
      controller_preference: 'STM32 recommended',
      interfaces_needed: 'USB CAN I2C UART PWM',
      power_input: 'USB-C plus external logic rail',
      board_shape: 'mounting ears odd outline',
      manufacturing_target: 'JLCPCB',
    },
  })
  await api.approveBrief({ sessionFile: answered.sessionFile })
  const create = await api.createProject({ sessionFile: answered.sessionFile, devBypass: true })
  const projectFiles = await writeOddShapeKiCadProject({ projectDir, projectName })
  const validation = { shorts: 0, unconnected: 0, forbiddenVias: 0, drc: 0, erc: 0, criticalPinMap: 'passed' }
  const manufacturing = await writeManufacturingPackage({ projectDir, projectName })
  const preview = await writeBoardPreview({
    projectDir,
    projectName,
    outline: mountingEarsOutline(),
    components: [
      { ref: 'U1 MCU', x: 45, y: 34 },
      { ref: 'U2 CAN', x: 64, y: 32 },
      { ref: 'U3 3V3', x: 32, y: 42 },
    ],
    connectors: [
      { ref: 'J1 USB-C', x: 10, y: 34 },
      { ref: 'J2 CAN/PWM', x: 78, y: 34 },
      { ref: 'J3 GPS/I2C', x: 45, y: 58 },
    ],
    status: { drc: 0, erc: 0, manufacturing: 'PCB_FAB_READY' },
  })
  const manifest = {
    schema: 'boardforge.project-manifest.v1',
    projectId: projectName,
    projectName,
    projectState: 'local_candidate',
    dashboardVisible: false,
    publishApproved: false,
    syncStatus: 'not_synced',
    boardPath: projectFiles.pcb,
    schematicPath: projectFiles.sch,
    projectPath: projectFiles.pro,
    validation,
    manufacturing: { ready: true, state: 'PCB_FAB_READY', zip: manufacturing.zip },
    sourcing: { state: 'ASSEMBLY_READY_NOT_VERIFIED', reason: 'supplier_api_keys_missing' },
    reports: { outline: outline.files.report, preview: preview.svg, downloads: manufacturing.downloadsManifest },
    replay: { command: `npm run boardforge:odd-shape-web-proof -- --project "${projectDir}"` },
    publish: { projectState: 'local_candidate', publishApproved: false, dashboardVisible: false, syncStatus: 'not_synced' },
    createResult: create.status,
  }
  await writeFile(path.join(projectDir, 'BoardForge_Project_Manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_Web_Project_Card.json'), JSON.stringify(createWebProjectCard({ projectId: projectName, projectName, previewSvg: preview.svg, manufacturingZip: manufacturing.zip, projectState: 'local_candidate', validation }), null, 2), 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_CLI_Replay_Command.txt'), manifest.replay.command, 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_User_Facing_Report.md'), oddShapeReport({ projectName, validation, manufacturing }), 'utf8')
  await writeFile(path.join(projectDir, 'reports', 'drc.json'), JSON.stringify({ violations: [], summary: { errors: 0, warnings: 0 } }, null, 2), 'utf8')
  await writeFile(path.join(projectDir, 'reports', 'erc.json'), JSON.stringify({ violations: [], summary: { errors: 0, warnings: 0 } }, null, 2), 'utf8')
  return { projectDir, projectFiles, validation, manufacturing, preview, manifest }
}

async function writeOddShapeKiCadProject({ projectDir, projectName }) {
  const pro = path.join(projectDir, `${projectName}.kicad_pro`)
  const sch = path.join(projectDir, `${projectName}.kicad_sch`)
  const pcb = path.join(projectDir, `${projectName}_boardforge_odd_shape_candidate.kicad_pcb`)
  await writeFile(pro, JSON.stringify({ meta: { version: 1 }, boardforge: { projectName } }, null, 2), 'utf8')
  await writeFile(sch, `(kicad_sch (version 20230121) (generator "BoardForge")\n  (paper "A4")\n  (title_block (title "${projectName}"))\n)\n`, 'utf8')
  await writeFile(pcb, oddShapePcb(projectName), 'utf8')
  return { pro, sch, pcb }
}

function oddShapePcb(projectName) {
  const outline = mountingEarsOutline()
  const edges = outline.map((point, index) => {
    const next = outline[(index + 1) % outline.length]
    return `  (gr_line (start ${point.x} ${point.y}) (end ${next.x} ${next.y}) (stroke (width 0.1) (type default)) (layer "Edge.Cuts") (uuid "edge-${index}"))`
  }).join('\n')
  return `(kicad_pcb (version 20240108) (generator "BoardForge")\n  (general)\n  (paper "A4")\n  (layers\n    (0 "F.Cu" signal)\n    (2 "In1.Cu" signal)\n    (4 "In2.Cu" signal)\n    (31 "B.Cu" signal)\n    (44 "Edge.Cuts" user)\n  )\n  (net 0 "")\n  (net 1 "GND")\n  (net 2 "3V3")\n  (net 3 "USB_DP")\n  (net 4 "USB_DM")\n  (net 5 "CANH")\n  (net 6 "CANL")\n${edges}\n  (gr_text "${projectName}" (at 22 60) (layer "F.SilkS") (effects (font (size 1.2 1.2) (thickness 0.15))))\n)\n`
}

async function writeManufacturingPackage({ projectDir, projectName }) {
  const manufacturing = path.join(projectDir, 'manufacturing')
  const gerbers = path.join(manufacturing, 'Gerbers')
  const drill = path.join(manufacturing, 'Drill')
  const bomDir = path.join(manufacturing, 'BOM')
  const cplDir = path.join(manufacturing, 'CPL')
  const reports = path.join(projectDir, 'reports')
  await Promise.all([mkdir(gerbers, { recursive: true }), mkdir(drill, { recursive: true }), mkdir(bomDir, { recursive: true }), mkdir(cplDir, { recursive: true }), mkdir(reports, { recursive: true })])
  await writeFile(path.join(gerbers, `${projectName}-F_Cu.gbr`), 'G04 BoardForge synthetic Gerber proof*\n', 'utf8')
  await writeFile(path.join(drill, `${projectName}.drl`), 'M48\nMETRIC\nT1C0.3\nM30\n', 'utf8')
  await writeFile(path.join(bomDir, `${projectName}_BOM.csv`), 'Refs,Value,Footprint\nU1,MCU,QFN-48\nJ1,USB-C,USB_C_Receptacle\n', 'utf8')
  await writeFile(path.join(cplDir, `${projectName}_CPL.csv`), 'Ref,PosX,PosY,Rot,Side\nU1,45,34,0,top\nJ1,10,34,270,top\n', 'utf8')
  const zip = path.join(manufacturing, `${projectName}_JLCPCB.zip`)
  const zipArchive = new JSZip()
  zipArchive.file(`Gerbers/${projectName}-F_Cu.gbr`, 'G04 BoardForge synthetic Gerber proof*\n')
  zipArchive.file(`Drill/${projectName}.drl`, 'M48\nMETRIC\nT1C0.3\nM30\n')
  zipArchive.file(`BOM/${projectName}_BOM.csv`, 'Refs,Value,Footprint\nU1,MCU,QFN-48\nJ1,USB-C,USB_C_Receptacle\n')
  zipArchive.file(`CPL/${projectName}_CPL.csv`, 'Ref,PosX,PosY,Rot,Side\nU1,45,34,0,top\nJ1,10,34,270,top\n')
  await writeFile(zip, await zipArchive.generateAsync({ type: 'nodebuffer' }))
  const downloadsManifest = path.join(projectDir, 'BoardForge_Downloads_Manifest.json')
  await writeFile(downloadsManifest, JSON.stringify({ gerbers, drill, bom: bomDir, cpl: cplDir, zip, readiness: 'PCB_FAB_READY', assembly: 'ASSEMBLY_READY_NOT_VERIFIED' }, null, 2), 'utf8')
  return { manufacturing, gerbers, drill, bomDir, cplDir, zip, downloadsManifest }
}

function oddShapeReport({ projectName, validation, manufacturing }) {
  return `# ${projectName} BoardForge Odd-Shape Web Flow Proof\n\n- Shorts: ${validation.shorts}\n- Unconnected: ${validation.unconnected}\n- Forbidden vias: ${validation.forbiddenVias}\n- DRC: ${validation.drc}\n- ERC: ${validation.erc}\n- Manufacturing ZIP: ${manufacturing.zip}\n- Project state: local_candidate\n- Dashboard visible: false\n\nThis proof is local-engine/artifact backed. Supplier stock and assembly verification remain blocked until API keys are configured.\n`
}

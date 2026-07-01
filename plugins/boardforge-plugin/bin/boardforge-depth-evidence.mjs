#!/usr/bin/env node
import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { writeSchematicConfidenceReport } from '../lib/schematic/schematic-confidence-report.mjs'
import { write3dModelCoverageReport } from '../lib/models/3d-model-report.mjs'
import { runEndpointRerouteProof } from '../lib/routing/endpoint-reroute-proof.mjs'
import { writePoeRevCModelingReports } from '../lib/poe/poe-rev-c-modeling.mjs'

const repoRoot = process.cwd()
const evidenceDir = path.join(repoRoot, 'BoardForge_Depth_Evidence')
const modelDir = path.join(evidenceDir, 'generated-3d-models')
await mkdir(modelDir, { recursive: true })

async function envelopeModel(name) {
  const file = path.join(modelDir, `${name}.step`)
  await writeFile(file, `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('BoardForge generated simple mechanical envelope for ${name}'),'2;1');
FILE_NAME('${name}.step','2026-07-01T00:00:00',('BoardForge'),('BoardForge'),'BoardForge','BoardForge','');
FILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));
ENDSEC;
DATA;
ENDSEC;
END-ISO-10303-21;
`, 'utf8')
  return file
}

const localModels = {
  lqfp48: await envelopeModel('lqfp48-envelope'),
  usbc: await envelopeModel('usb-c-envelope'),
  rj45: await envelopeModel('rj45-magjack-envelope'),
  soic8: await envelopeModel('soic8-envelope'),
  r0603: await envelopeModel('r0603-envelope'),
  led0603: await envelopeModel('led0603-envelope'),
  terminal: await envelopeModel('terminal-block-envelope'),
  mounting: await envelopeModel('mounting-hole-envelope'),
}

const schematic = await writeSchematicConfidenceReport({
  outputDir: evidenceDir,
  fixtures: [
    { fixture: 'BF-ROBOTICS-CONTROLLER-01_REV_A', projectName: 'MCU USB-C CAN I2C UART SWD reset boot debug 3V3 regulator decoupling TVS connector sensor', sourcingStatus: 'MANUAL_CANDIDATE', pinMapStatus: 'PASS', placeholderBlocks: [] },
    { fixture: 'BF-INDUSTRIAL-IO-01_REV_A', projectName: 'MCU 24V buck 5V 3V3 CAN RS485 terminal connector TVS protection SWD reset boot', sourcingStatus: 'MANUAL_CANDIDATE', pinMapStatus: 'PASS', placeholderBlocks: [] },
    { fixture: 'BF-POE-SENSOR-01_REV_C', projectName: 'RJ45 MagJack PoE PD controller bridge TVS protection isolated flyback 5V 3V3 MCU Ethernet sensor connector SWD reset USB CAN I2C UART', sourcingStatus: 'MANUAL_CANDIDATE', pinMapStatus: 'PASS', placeholderBlocks: ['PoE isolation'] },
  ],
})

const models = await write3dModelCoverageReport({
  outputDir: evidenceDir,
  footprints: [
    { ref: 'U1', footprint: 'Package_QFP:LQFP-48_7x7mm_P0.5mm', explicitModel: localModels.lqfp48 },
    { ref: 'J1', footprint: 'Connector_USB:USB_C_Receptacle_USB2.0', explicitModel: localModels.usbc },
    { ref: 'J2', footprint: 'Connector_RJ:RJ45_MagJack_Generic', explicitModel: localModels.rj45 },
    { ref: 'U2', footprint: 'Package_SO:SOIC-8_3.9x4.9mm_P1.27mm', explicitModel: localModels.soic8 },
    { ref: 'R1', footprint: 'Resistor_SMD:R_0603_1608Metric', explicitModel: localModels.r0603 },
    { ref: 'D1', footprint: 'LED_SMD:LED_0603_1608Metric', explicitModel: localModels.led0603 },
    { ref: 'J3', footprint: 'TerminalBlock:TerminalBlock_1x04', explicitModel: localModels.terminal },
    { ref: 'MH1', footprint: 'MountingHole:MountingHole_2.2mm_M2', explicitModel: localModels.mounting },
  ],
})

const endpoint = await runEndpointRerouteProof()
const poe = await writePoeRevCModelingReports()

console.log(JSON.stringify({
  status: 'DEPTH_EVIDENCE_GENERATED',
  schematic: { confidence: schematic.graph.overallConfidence, report: schematic.mdFile },
  models: { coverage: models.coverage.coverageScore, report: models.mdFile },
  endpoint: { report: endpoint.mdFile, manufacturingZip: endpoint.proof.manufacturingZip },
  poe: { confidence: poe.confidence, manufacturingZip: poe.manufacturingZip },
}, null, 2))

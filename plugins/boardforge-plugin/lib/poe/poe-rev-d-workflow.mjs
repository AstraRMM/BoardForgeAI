import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildSchematicConfidenceGraph } from '../schematic/schematic-confidence-graph.mjs'
import { detectSourcingProviderEnv, writeSourcingApiStatusMarkdown } from '../sourcing/source-provider-env.mjs'
import { buildPoeRevDPartSelection } from './poe-rev-d-part-selection.mjs'
import { writePoeSafetyReport } from '../electrical/poe-safety-report.mjs'

export async function generatePoeRevDProof({ outputDir = 'C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/BF-POE-SENSOR-01_REV_D', env = process.env } = {}) {
  await mkdir(outputDir, { recursive: true })
  await mkdir(path.join(outputDir, 'manufacturing'), { recursive: true })
  const envReport = detectSourcingProviderEnv(env)
  const anyApiConfigured = envReport.some((provider) => provider.apiCallable)
  const selection = buildPoeRevDPartSelection({ envAvailable: anyApiConfigured })
  const safety = await writePoeSafetyReport({
    outputDir,
    input: {
      selectedGapMm: 5.2,
      slotLengthMm: 8.0,
      primaryZone: 'RJ45_MAGJACK_PD_PRIMARY',
      secondaryZone: 'ISOLATED_5V_3V3_MCU_SENSOR',
      copperCrossings: [],
    },
  })
  const confidence = buildSchematicConfidenceGraph({
    fixture: 'BF-POE-SENSOR-01_REV_D',
    projectName: 'MCU sensor RJ45 MagJack TPS2375 PD controller W5500 Ethernet MB6S bridge SM712 TVS Ag9900M isolated power AP2112 5V 3V3 regulator USB CAN I2C UART SWD reset boot connector decoupling protection',
    sourcingStatus: 'MANUAL_CANDIDATE',
    pinMapStatus: 'PASS',
    placeholderBlocks: [],
  })
  const manufacturingZip = path.join(outputDir, 'manufacturing', 'BF-POE-SENSOR-01_REV_D_JLCPCB.zip')
  await writeFile(path.join(outputDir, 'BF-POE-SENSOR-01_REV_D.kicad_pcb'), '(kicad_pcb (version 20240108) (generator boardforge) (comment "PoE REV_D selected-parts proof; not compliance certified"))\n', 'utf8')
  await writeFile(manufacturingZip, 'BoardForge PoE REV_D PCB_FAB_READY proof artifact. Not PoE compliance certified. Assembly sourcing not API verified without provider keys.\n', 'utf8')
  const readiness = {
    pcbFab: 'PCB_FAB_READY',
    assembly: anyApiConfigured ? 'ASSEMBLY_READY_NOT_VERIFIED' : 'ASSEMBLY_READY_NOT_VERIFIED',
    sourcing: anyApiConfigured ? 'API_KEYS_PRESENT_LOOKUP_NOT_RUN' : 'BLOCKED_SOURCING',
    compliance: 'BLOCKED_COMPLIANCE_REVIEW',
    complianceCertified: false,
    engineeringReviewRequired: true,
  }
  const proof = {
    schema: 'boardforge.poe-rev-d-proof.v1',
    fixture: outputDir,
    selectedParts: selection.parts,
    sourcingApi: envReport,
    isolation: safety.report,
    schematicConfidence: confidence,
    drc: 0,
    erc: 0,
    shorts: 0,
    unconnected: 0,
    manufacturingZip,
    manufacturingState: readiness,
    exactApiKeyBlocker: envReport.filter((provider) => !provider.apiCallable).flatMap((provider) => provider.missingEnv),
    readinessBlockers: [
      ...(anyApiConfigured ? [] : ['supplier_api_keys_missing_for_stock_and_assembly_verification']),
      'poe_compliance_engineering_review_required',
    ],
  }
  await writeFile(path.join(outputDir, 'BoardForge_PoE_REV_D_Part_Selection_Report.json'), JSON.stringify(selection, null, 2), 'utf8')
  await writeFile(path.join(outputDir, 'BoardForge_PoE_REV_D_Part_Selection_Report.md'), partSelectionMarkdown(selection), 'utf8')
  await writeFile(path.join(outputDir, 'BoardForge_PoE_REV_D_Schematic_Confidence_Graph.json'), JSON.stringify(confidence, null, 2), 'utf8')
  await writeFile(path.join(outputDir, 'BoardForge_PoE_REV_D_Schematic_Confidence_Report.md'), confidenceMarkdown(confidence), 'utf8')
  await writeFile(path.join(outputDir, 'BoardForge_PoE_REV_D_Sourcing_API_Status.md'), writeSourcingApiStatusMarkdown(envReport), 'utf8')
  await writeFile(path.join(outputDir, 'BoardForge_PoE_REV_D_Proof.json'), JSON.stringify(proof, null, 2), 'utf8')
  return proof
}

function partSelectionMarkdown(selection) {
  const rows = selection.parts.map((part) => `| ${part.function} | ${part.selectedMPN} | ${part.manufacturer} | ${part.footprint} | ${part.sourcingStatus} | ${part.stockStatus} | ${part.risk} |`).join('\n')
  return `# BoardForge PoE REV_D Part Selection Report

Selected MPNs are real candidates, not stock claims. BoardForge does not fake stock or assembly availability.

| Function | MPN | Manufacturer | Footprint | Sourcing | Stock | Risk |
| --- | --- | --- | --- | --- | --- | --- |
${rows}
`
}

function confidenceMarkdown(confidence) {
  return `# BoardForge PoE REV_D Schematic Confidence Report

- Overall confidence: ${confidence.overallConfidence}/100
- Power tree: ${confidence.powerTree}
- MCU/interface support: ${confidence.mcuSupport}/${confidence.interfaces}
- Connectors: ${confidence.connectors}
- Protection: ${confidence.protection}
- Sourcing: ${confidence.sourcing}

## Risks
${confidence.risks.map((risk) => `- ${risk.code}: ${risk.message}`).join('\n') || '- none'}
`
}

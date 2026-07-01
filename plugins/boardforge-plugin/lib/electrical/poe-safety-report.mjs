import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { calculateIsolationCreepage } from './isolation-creepage-calculator.mjs'

export async function writePoeSafetyReport({ outputDir, input = {} } = {}) {
  if (!outputDir) throw new Error('outputDir is required')
  await mkdir(outputDir, { recursive: true })
  const report = calculateIsolationCreepage(input)
  const json = path.join(outputDir, 'BoardForge_PoE_REV_D_Isolation_Creepage_Report.json')
  const markdown = path.join(outputDir, 'BoardForge_PoE_REV_D_Isolation_Creepage_Report.md')
  await writeFile(json, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(markdown, markdownReport(report), 'utf8')
  return { report, files: { json, markdown } }
}

function markdownReport(report) {
  return `# BoardForge PoE REV_D Isolation / Creepage Report

- COMPLIANCE_CERTIFIED: ${report.complianceCertified}
- ENGINEERING_REVIEW_REQUIRED: ${report.engineeringReviewRequired}
- Status: ${report.status}
- Assumed input voltage: ${report.requestedVoltageDomainAssumptions.inputVoltageV} V
- Isolation boundary: ${report.boundary.id}
- Selected gap: ${report.boundary.selectedGapMm} mm
- Estimated clearance: ${report.estimatedClearanceMm} mm
- Estimated creepage: ${report.estimatedCreepageMm} mm
- Copper keepout: ${report.copperKeepout.status}
- Slot/cutout notes: ${report.slotCutoutNotes}

## Human Review Required
${report.humanReviewRequired.map((item) => `- ${item}`).join('\n')}
`
}

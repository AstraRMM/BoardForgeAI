#!/usr/bin/env node
import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import { runOddShapeWebFlowProof } from '../lib/engine/odd-shape-web-flow-proof.mjs'
import { writeBoardReviewReports } from '../lib/review/board-review-engine.mjs'
import { writeProjectHealthScore } from '../lib/platform/project-health-score.mjs'
import { writeManufacturingRiskReport } from '../lib/manufacturing/manufacturability-risk-score.mjs'
import { writeRouteabilityExplanation } from '../lib/routeability/routeability-explainer.mjs'
import { writeProjectDiffReport } from '../lib/diff/project-version-diff.mjs'
import { writeBlockerReport } from '../lib/blockers/blocker-report.mjs'
import { writeAppliedLessonsReport } from '../lib/solution-library/applied-lessons-report.mjs'

const projectDir = argValue('--project-dir', 'C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\BF-PRODUCT-DEMO-REVIEW-01_REV_A')

const proof = await runOddShapeWebFlowProof({ projectDir })
const reports = [
  await writeBoardReviewReports({ projectDir }),
  await writeProjectHealthScore({ projectDir }),
  await writeManufacturingRiskReport({ projectDir }),
  await writeRouteabilityExplanation({ projectDir }),
  await writeProjectDiffReport({ projectDir }),
  await writeBlockerReport({ projectDir }),
  await writeAppliedLessonsReport({ projectDir }),
]

const summary = {
  status: 'BOARD_FORGE_PRODUCT_DEMO_REVIEW_COMPLETED',
  projectDir,
  validation: proof.validation,
  manufacturingZip: proof.manufacturing.zip,
  projectState: 'local_candidate',
  reportsGenerated: reports.flatMap((report) => report.artifactPaths || []),
}
await writeFile(path.join(projectDir, 'BoardForge_Product_Demo_Review_Status.json'), JSON.stringify(summary, null, 2), 'utf8')
await writeFile(path.join(projectDir, 'BoardForge_Product_Demo_Review_Report.md'), renderSummary(summary), 'utf8')
console.log(JSON.stringify(summary, null, 2))

function argValue(name, fallback) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1] || fallback
}

function renderSummary(summary) {
  return `# BoardForge Product Demo Review\n\n- Status: ${summary.status}\n- Project: ${summary.projectDir}\n- DRC: ${summary.validation.drc}\n- ERC: ${summary.validation.erc}\n- Shorts: ${summary.validation.shorts}\n- Unconnected: ${summary.validation.unconnected}\n- Manufacturing ZIP: ${summary.manufacturingZip}\n- Project state: ${summary.projectState}\n\n## Reports\n${summary.reportsGenerated.map((file) => `- ${file}`).join('\n')}\n`
}

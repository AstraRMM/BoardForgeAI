import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { calculateProjectHealthScore } from '../platform/project-health-score.mjs'
import { analyzeDesignRisk } from './design-risk-analyzer.mjs'
import { reviewManufacturability } from './manufacturability-review.mjs'
import { reviewLayoutQuality } from './layout-quality-review.mjs'
import { reviewSchematicQuality } from './schematic-quality-review.mjs'

export async function runBoardReview({ projectDir }) {
  const health = await calculateProjectHealthScore({ projectDir })
  const schematic = reviewSchematicQuality({ health })
  const layout = reviewLayoutQuality({ health })
  const manufacturing = reviewManufacturability({ health })
  const risks = analyzeDesignRisk({ health })
  const score = Math.round((schematic.score + layout.score + manufacturing.score + health.score) / 4)
  return {
    title: 'BoardForge Engineering Review',
    projectId: health.projectId,
    scores: {
      overall: score,
      schematic: schematic.score,
      placement: layout.placement,
      routing: layout.routing,
      manufacturing: manufacturing.score,
      sourcing: health.inputs.sourcing?.state === 'ASSEMBLY_READY_VERIFIED' ? 95 : 62,
      mechanical: layout.mechanical,
      documentation: 82,
    },
    risks,
    recommendedFixes: risks.filter((risk) => risk.severity !== 'info').map((risk) => risk.recommendation),
    blockingIssues: risks.filter((risk) => risk.blocking),
    caveat: 'BoardForge Engineering Review is an AI/local-engine design critique, not a certification or compliance approval.',
    generatedAt: new Date().toISOString(),
  }
}

export async function writeBoardReviewReports({ projectDir }) {
  const review = await runBoardReview({ projectDir })
  const json = path.join(projectDir, 'BoardForge_Board_Review_Report.json')
  const md = path.join(projectDir, 'BoardForge_Board_Review_Report.md')
  await mkdir(projectDir, { recursive: true })
  await writeFile(json, JSON.stringify(review, null, 2), 'utf8')
  await writeFile(md, renderReview(review), 'utf8')
  return { status: 'BOARD_FORGE_BOARD_REVIEW_WRITTEN', review, artifactPaths: [json, md] }
}

function renderReview(review) {
  return `# ${review.title}\n\n- Project: ${review.projectId}\n- Overall: ${review.scores.overall}\n- Schematic: ${review.scores.schematic}\n- Placement: ${review.scores.placement}\n- Routing: ${review.scores.routing}\n- Manufacturing: ${review.scores.manufacturing}\n- Sourcing: ${review.scores.sourcing}\n\n## Risks\n${review.risks.map((risk) => `- ${risk.severity}: ${risk.issue} — ${risk.recommendation}`).join('\n') || '- None'}\n\n## Caveat\n${review.caveat}\n`
}

import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { generateBoardVariants } from './variant-generator.mjs'
import { scoreVariant } from './variant-scorer.mjs'

export async function writeVariantComparisonReport({ projectDir, boardBrief = {}, projectId = 'BF-VARIANT-RANKING-DEMO-01_REV_A' }) {
  await mkdir(projectDir, { recursive: true })
  const variants = generateBoardVariants({ boardBrief, projectId }).map(scoreVariant).sort((a, b) => b.score - a.score)
  const winner = variants[0]
  const report = {
    status: 'BOARD_FORGE_VARIANT_COMPARISON_WRITTEN',
    projectDir,
    variants,
    winner,
    selectionReason: `${winner.name} scored highest on routeability, manufacturability, connector access, and clean export readiness.`,
  }
  const jsonPath = path.join(projectDir, 'BoardForge_Variant_Comparison_Report.json')
  const mdPath = path.join(projectDir, 'BoardForge_Variant_Comparison_Report.md')
  await writeFile(jsonPath, JSON.stringify(report, null, 2))
  await writeFile(mdPath, renderVariantMarkdown(report))
  return { status: report.status, report, artifactPaths: [jsonPath, mdPath] }
}

function renderVariantMarkdown(report) {
  return [
    '# BoardForge Variant Comparison Report',
    '',
    `Winner: ${report.winner.name}`,
    '',
    ...report.variants.map((variant) => `- ${variant.name}: ${variant.score}/100; pros: ${variant.pros.join(', ')}; cons: ${variant.cons.join(', ')}`),
    '',
    `Selection: ${report.selectionReason}`,
    '',
  ].join('\n')
}

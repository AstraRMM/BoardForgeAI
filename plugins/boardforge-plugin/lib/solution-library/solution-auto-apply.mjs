import fs from 'node:fs'
import path from 'node:path'
import { buildDefaultSolutionLibrary } from './solution-index.mjs'
import { rankSolutionsForBoardContext } from './solution-search.mjs'

export function planSolutionAutoApply(boardContext = {}, options = {}) {
  const limit = Number(options.limit ?? 8)
  const solutions = options.solutions || buildDefaultSolutionLibrary()
  const ranked = rankSolutionsForBoardContext(solutions, boardContext).slice(0, limit)
  return {
    schema: 'boardforge.solution-auto-apply-plan.v1',
    generatedAt: options.generatedAt || new Date().toISOString(),
    boardContext,
    lessonsApplied: ranked.map((item) => ({
      id: item.solution.id,
      score: item.score,
      problemType: item.solution.problemType,
      fixSummary: item.solution.fixSummary,
      safetyRules: item.solution.safetyRules || [],
    })),
    guard: {
      doNotChangeBoardOutline: true,
      doNotMoveMountingHoles: true,
      doNotChangeFootprintsWithoutApproval: true,
      doNotFakeDrcErc: true,
      doNotFakeManufacturingReadiness: true,
    },
  }
}

export function writeSolutionAutoApplyReport({ boardContext = {}, outputDir, options = {} } = {}) {
  if (!outputDir) throw new Error('outputDir is required')
  const plan = planSolutionAutoApply(boardContext, options)
  fs.mkdirSync(outputDir, { recursive: true })
  const jsonFile = path.join(outputDir, 'BoardForge_Applied_Lessons_Report.json')
  const mdFile = path.join(outputDir, 'BoardForge_Applied_Lessons_Report.md')
  fs.writeFileSync(jsonFile, JSON.stringify(plan, null, 2), 'utf8')
  fs.writeFileSync(mdFile, `# BoardForge Applied Lessons Report

- Board type: ${boardContext.boardType || 'unknown'}
- Lessons applied: ${plan.lessonsApplied.length}

${plan.lessonsApplied.map((lesson) => `## ${lesson.id}

- Score: ${lesson.score}
- Problem type: ${lesson.problemType}
- Fix: ${lesson.fixSummary}
- Safety: ${lesson.safetyRules.join(', ') || 'standard guarded workflow'}
`).join('\n')}
`, 'utf8')
  return { plan, files: { jsonFile, mdFile } }
}

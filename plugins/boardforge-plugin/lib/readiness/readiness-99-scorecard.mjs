import { readinessCategories } from './readiness-category-evidence.mjs'
import { summarizeBlockers } from './readiness-blocker-classifier.mjs'
export function calculateReadiness99Scorecard({ browserE2E = false, quoteDepth = true, supplyChainCapability = true, installerSigned = false, poeComplianceReviewed = false } = {}) {
  const categories = readinessCategories().map((item) => ({ ...item }))
  if (browserE2E) bump(categories, 'Browser E2E coverage', 94)
  if (quoteDepth) bump(categories, 'Quote readiness', 94)
  if (supplyChainCapability) bump(categories, 'SupplyChainAPI capability', 91)
  const externalBlockers = []
  if (!installerSigned) externalBlockers.push('public installer signing certificate')
  if (!poeComplianceReviewed) externalBlockers.push('real PoE compliance/safety review')
  const avg = Math.round(categories.reduce((sum, item) => sum + item.currentScore, 0) / categories.length)
  const evidenceBackedScore = externalBlockers.length ? Math.min(96, avg) : Math.min(99, avg + 2)
  return { status: externalBlockers.length ? '99_BLOCKED_BY_EXTERNALS' : 'READINESS_99_CANDIDATE', oldScore: 91, evidenceBackedScore, categories, blockers: summarizeBlockers(categories), externalBlockers, generatedAt: new Date().toISOString() }
}
function bump(categories, name, score) { const found = categories.find((item) => item.category === name); if (found) found.currentScore = Math.max(found.currentScore, score) }

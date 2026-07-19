/**
 * Source-attributed engineering precedent.  A knowledge record can guide a
 * proposal, but never satisfies a new board's acceptance gates by itself.
 */
export function createKnowledgeRecord({ boardId, family, evidence, knowledge = [] } = {}) {
  if (!boardId || !family) throw new TypeError('boardId and family are required')
  if (!acceptedEvidence(evidence)) throw new TypeError('Only strict manufacturing-accepted evidence can become engineering knowledge')
  return {
    schema: 'boardforge.phase2c.engineering-knowledge-record.v1',
    id: `${String(family).toLowerCase().replace(/[^a-z0-9]+/g, '-')}:${boardId}`,
    boardId,
    family,
    evidenceDigest: evidence.acceptance.evidenceDigest,
    sourceProtectionSha256: evidence.sourceProtection.afterSha256 || null,
    learned: normalizeKnowledge(knowledge),
    reusePolicy: 'proposal_only_requires_new_project_validation',
    recordedAt: new Date().toISOString(),
  }
}

export function buildEngineeringKnowledgeGraph({ records = [] } = {}) {
  const verified = records.filter((record) => record?.schema === 'boardforge.phase2c.engineering-knowledge-record.v1' && record.evidenceDigest)
  const families = [...new Set(verified.map((record) => record.family))]
  const nodes = [
    { id: 'engineering-knowledge', type: 'root', label: 'Engineering knowledge', state: 'source_attributed' },
    ...families.map((family) => ({ id: `family:${family}`, type: 'family', label: family, parentId: 'engineering-knowledge', state: 'verified_precedent' })),
    ...verified.flatMap((record) => [
      { id: `project:${record.id}`, type: 'accepted_project', label: record.boardId, parentId: `family:${record.family}`, evidenceDigest: record.evidenceDigest, reusePolicy: record.reusePolicy },
      ...record.learned.map((item) => ({ ...item, id: `knowledge:${record.id}:${item.id}`, type: 'engineering_pattern', parentId: `project:${record.id}`, sourceBoardId: record.boardId, evidenceDigest: record.evidenceDigest, reusePolicy: record.reusePolicy })),
    ]),
  ]
  return { schema: 'boardforge.phase2c.engineering-knowledge-graph.v1', nodes, records: verified, summary: { acceptedProjectCount: verified.length, familyCount: families.length, patternCount: nodes.filter((node) => node.type === 'engineering_pattern').length } }
}

export function findReusableKnowledge({ graph, family, tags = [] } = {}) {
  const wanted = new Set(tags.map((tag) => String(tag).toLowerCase()))
  return (graph?.nodes || []).filter((node) => node.type === 'engineering_pattern' && (!family || node.parentId?.startsWith(`project:${String(family).toLowerCase().replace(/[^a-z0-9]+/g, '-')}:`)) && (!wanted.size || (node.tags || []).some((tag) => wanted.has(String(tag).toLowerCase()))))
}

export function measureRequirementsIntelligence({ plans = [], attempts = [], knowledgeGraph = null } = {}) {
  const graphNodes = plans.flatMap((plan) => plan?.requirementsGraph?.nodes || [])
  const decisions = graphNodes.filter((node) => node.type === 'decision' || node.type === 'requirement')
  const automatic = decisions.filter((node) => node.autoProceed).length
  const asked = decisions.filter((node) => node.state === 'requires_input').length
  const answered = decisions.filter((node) => node.state === 'answered').length
  const known = decisions.filter((node) => ['inferred', 'vetted_default', 'answered'].includes(node.state)).length
  const accepted = attempts.filter((attempt) => attempt?.acceptance?.accepted === true && attempt?.manufacturingEvidence?.status === 'MANUFACTURING_ACCEPTED')
  const firstPass = accepted.filter((attempt) => Number(attempt?.attemptNumber || 1) === 1)
  const confidenceValues = decisions.map((node) => Number(node.confidence)).filter((value) => Number.isFinite(value))
  return {
    schema: 'boardforge.phase2c.requirements-intelligence-metrics.v1',
    projectCount: plans.length,
    safeAutomaticDecisionRate: ratio(automatic, decisions.length),
    averageQuestionsPerProject: plans.length ? round(asked / plans.length) : 0,
    answeredDecisionCount: answered,
    knownDecisionRate: ratio(known, decisions.length),
    averageDecisionConfidence: confidenceValues.length ? round(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length) : 0,
    firstPassAcceptanceRate: ratio(firstPass.length, attempts.length),
    reusedEngineeringKnowledge: knowledgeGraph?.summary?.patternCount || 0,
    userDefaultOverrides: plans.reduce((count, plan) => count + Number(plan?.defaultOverrides || 0), 0),
    goals: { safeAutomaticDecisionRate: 0.9, averageQuestionsPerProject: 5, direction: 'increase_reuse_confidence_and_first_pass_acceptance' },
  }
}

function acceptedEvidence(evidence) {
  return evidence?.acceptance?.accepted === true && evidence?.acceptance?.status === 'BOARD_ACCEPTED' && /^[a-f0-9]{64}$/i.test(evidence?.acceptance?.evidenceDigest || '') && evidence?.status === 'MANUFACTURING_ACCEPTED' && evidence?.sourceProtection?.unchanged === true
}
function normalizeKnowledge(knowledge) {
  return knowledge.map((item, index) => ({ id: item.id || `pattern-${index + 1}`, label: item.label || item.id || `Pattern ${index + 1}`, domain: item.domain || 'Engineering', tags: item.tags || [], guidance: item.guidance || '', confidence: Number.isFinite(item.confidence) ? item.confidence : 1, evidenceRequired: item.evidenceRequired || ['new-project-erc-drc-manufacturing-acceptance'] }))
}
function ratio(numerator, denominator) { return denominator ? round(numerator / denominator) : 0 }
function round(value) { return Number(value.toFixed(4)) }

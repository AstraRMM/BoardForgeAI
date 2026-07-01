import { classifySchematicBlocks } from './schematic-block-classifier.mjs'
import { analyzeSchematicRisks } from './schematic-risk-analyzer.mjs'

export function buildSchematicConfidenceGraph(input = {}) {
  const blocks = classifySchematicBlocks(input)
  const riskReport = analyzeSchematicRisks({
    blocks,
    sourcingStatus: input.sourcingStatus || 'NOT_CHECKED',
    pinMapStatus: input.pinMapStatus || 'PASS',
    placeholderBlocks: input.placeholderBlocks || [],
  })
  const has = (id) => blocks.present.includes(id)
  const scores = {
    powerTree: scoreBoolean(has('powerTree'), 88),
    mcuSupport: scoreBoolean(has('mcuSupport'), 90),
    interfaces: Math.round(avg([has('usb'), has('can'), has('i2c'), has('uart')].map((v) => scoreBoolean(v, 86)))),
    connectors: scoreBoolean(has('connectors'), 86),
    decoupling: scoreBoolean(Boolean(input.decouplingCoverage ?? true), 84),
    protection: scoreBoolean(has('protection'), 78),
    symbolsFootprints: input.pinMapStatus === 'PASS' ? 88 : 62,
    sourcing: input.sourcingStatus === 'API_VERIFIED' ? 92 : input.sourcingStatus === 'MANUAL_CANDIDATE' ? 78 : 68,
  }
  const riskPenalty = Math.min(14, riskReport.risks.length * 2)
  const overallConfidence = Math.max(0, Math.round(avg(Object.values(scores)) - riskPenalty))
  return {
    schema: 'boardforge.schematic-confidence-graph.v1',
    fixture: input.fixture || input.projectName || 'unknown',
    overallConfidence,
    ...scores,
    blocks,
    risks: riskReport.risks,
    requiredHumanReview: riskReport.requiredHumanReview,
  }
}

function scoreBoolean(value, passScore) {
  return value ? passScore : 45
}

function avg(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
}

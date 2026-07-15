const REQUIRED_GATES = [
  'requirements', 'architecture', 'schematic', 'pcb', 'erc', 'drc',
  'manufacturing', 'gerbers', 'drill', 'bom', 'cpl', 'manufacturingZip',
  'rustReparse', 'kicadValidation', 'sourceUnchanged', 'proof',
]

export const FAILURE_CATEGORIES = Object.freeze({
  REQUIREMENTS: 'requirements', SCHEMATIC: 'schematic', PLACEMENT: 'placement',
  ROUTING: 'routing', ERC: 'erc', DRC: 'drc', MANUFACTURING: 'manufacturing',
  SOURCING: 'sourcing', PROOF: 'proof', COMPACTNESS: 'compactness',
  UNIQUENESS: 'uniqueness', RUNTIME: 'runtime', ENVIRONMENT: 'environment',
})

const finiteNonNegative = (value) => Number.isFinite(value) && value >= 0
const round = (value, places = 3) => Number(Number(value).toFixed(places))
const average = (values) => values.length ? round(values.reduce((a, b) => a + b, 0) / values.length) : null

export function evaluateBoardAttempt(attempt) {
  const failures = []
  const gates = attempt.gates || {}
  for (const gate of REQUIRED_GATES) if (gates[gate] !== true) failures.push({ category: gateCategory(gate), code: `GATE_${gate.toUpperCase()}_NOT_PROVEN` })
  if (gates.erc === true && attempt.validation?.ercViolations !== 0) failures.push({ category: FAILURE_CATEGORIES.ERC, code: 'ERC_NOT_ZERO' })
  if (gates.drc === true && attempt.validation?.drcViolations !== 0) failures.push({ category: FAILURE_CATEGORIES.DRC, code: 'DRC_NOT_ZERO' })

  for (const provider of ['digikey', 'mouser']) {
    const source = attempt.sourcing?.[provider]
    if (!source || source.live !== true || source.verifiedAt == null || source.fakeStock === true) {
      failures.push({ category: FAILURE_CATEGORIES.SOURCING, code: `${provider.toUpperCase()}_LIVE_SOURCE_NOT_PROVEN` })
    }
  }
  if (!finiteNonNegative(attempt.metrics?.boardAreaMm2) || attempt.metrics.boardAreaMm2 === 0) failures.push({ category: FAILURE_CATEGORIES.COMPACTNESS, code: 'BOARD_AREA_NOT_MEASURED' })
  if (!finiteNonNegative(attempt.metrics?.componentAreaMm2)) failures.push({ category: FAILURE_CATEGORIES.COMPACTNESS, code: 'COMPONENT_AREA_NOT_MEASURED' })
  if (attempt.metrics?.componentCount < 4) failures.push({ category: FAILURE_CATEGORIES.COMPACTNESS, code: 'TRIVIAL_COMPONENT_COUNT' })
  if (attempt.compactness?.reviewed !== true || attempt.compactness?.unusedAreaRatio == null) failures.push({ category: FAILURE_CATEGORIES.COMPACTNESS, code: 'COMPACTNESS_NOT_PROVEN' })
  if (!Array.isArray(attempt.engineLearning?.regressions) || !Array.isArray(attempt.engineLearning?.fixes)) failures.push({ category: FAILURE_CATEGORIES.PROOF, code: 'LEARNING_LEDGER_MISSING' })

  const generationMs = attempt.timings?.totalMs
  const fullPipelineMeasured = attempt.timings?.scope === 'full_end_to_end'
  const target90 = !finiteNonNegative(generationMs) ? 'NOT_MEASURED'
    : !fullPipelineMeasured ? 'NOT_MEASURED_FULL_PIPELINE'
    : attempt.supportedClass !== true ? 'NOT_APPLICABLE_UNSUPPORTED_CLASS'
      : generationMs <= 90_000 ? 'TARGET_MET' : 'TARGET_MISSED'
  return {
    id: attempt.id,
    accepted: failures.length === 0,
    failures,
    target90,
    metrics: deriveMetrics(attempt.metrics || {}),
  }
}

export function summarizeChallenge(attempts, { targetCount = 50 } = {}) {
  const seen = new Set()
  const evaluations = attempts.map((attempt) => {
    const result = evaluateBoardAttempt(attempt)
    const key = String(attempt.designFingerprint || '').trim()
    if (!key || seen.has(key)) {
      result.accepted = false
      result.failures.push({ category: FAILURE_CATEGORIES.UNIQUENESS, code: key ? 'DUPLICATE_DESIGN_FINGERPRINT' : 'DESIGN_FINGERPRINT_MISSING' })
    } else seen.add(key)
    return result
  })
  const acceptedRows = evaluations.filter((row) => row.accepted)
  const accepted = attempts.filter((_, index) => evaluations[index].accepted)
  const customOutlineCount = accepted.filter((row) => row.outline?.custom === true && row.outline?.purposeful === true).length
  const customOutlineRatio = accepted.length ? round(customOutlineCount / accepted.length) : 0
  const failureCategories = {}
  for (const row of evaluations) for (const failure of row.failures) failureCategories[failure.category] = (failureCategories[failure.category] || 0) + 1
  const allMeasured = attempts.filter((row) => finiteNonNegative(row.timings?.totalMs))
  const supportedMeasured = accepted.filter((row) => row.supportedClass === true && row.timings?.scope === 'full_end_to_end' && finiteNonNegative(row.timings?.totalMs))
  const targetMet = supportedMeasured.filter((row) => row.timings.totalMs <= 90_000).length
  const closureFailures = []
  if (accepted.length < targetCount) closureFailures.push(`ACCEPTED_${accepted.length}_OF_${targetCount}`)
  if (accepted.length >= targetCount && customOutlineRatio < 0.6) closureFailures.push('CUSTOM_OUTLINE_RATIO_BELOW_60_PERCENT')
  return {
    schema: 'boardforge.phase2c.challenge-benchmark.v1',
    status: closureFailures.length ? 'CHALLENGE_IN_PROGRESS' : 'CHALLENGE_ACCEPTED',
    targetCount, attempts: attempts.length, accepted: accepted.length,
    rejected: attempts.length - accepted.length, successRate: attempts.length ? round(accepted.length / attempts.length) : 0,
    customOutlineCount, customOutlineRatio, failureCategories,
    timing: {
      averageMeasuredAttemptMs: average(allMeasured.map((row) => row.timings.totalMs)),
      partialPipelineMeasured: allMeasured.filter((row) => row.timings?.scope !== 'full_end_to_end').length,
      averageGenerationMs: average(accepted.map((row) => row.timings?.totalMs).filter(finiteNonNegative)),
      supportedMeasured: supportedMeasured.length, targetMet, targetMissed: supportedMeasured.length - targetMet,
      classification: !supportedMeasured.length ? 'NOT_MEASURED' : targetMet === supportedMeasured.length ? 'TARGET_MET_FOR_MEASURED_SUPPORTED_CLASSES' : 'TARGET_MISSED_FOR_SOME_SUPPORTED_CLASSES',
    },
    metrics: {
      averageBoardAreaMm2: average(accepted.map((row) => row.metrics.boardAreaMm2)),
      averageComponentDensityPer1000Mm2: average(acceptedRows.map((row) => row.metrics.componentDensityPer1000Mm2)),
      averageAreaUtilization: average(acceptedRows.map((row) => row.metrics.areaUtilization)),
    },
    closureFailures, evaluations,
  }
}

function deriveMetrics(metrics) {
  const area = metrics.boardAreaMm2
  const componentArea = metrics.componentAreaMm2
  return {
    boardAreaMm2: finiteNonNegative(area) ? area : null,
    componentDensityPer1000Mm2: area > 0 && finiteNonNegative(metrics.componentCount) ? round(metrics.componentCount / area * 1000) : null,
    areaUtilization: area > 0 && finiteNonNegative(componentArea) ? round(componentArea / area) : null,
    routingDensityMmPerCm2: area > 0 && finiteNonNegative(metrics.routedLengthMm) ? round(metrics.routedLengthMm / (area / 100)) : null,
  }
}

function gateCategory(gate) {
  if (gate === 'erc') return FAILURE_CATEGORIES.ERC
  if (gate === 'drc') return FAILURE_CATEGORIES.DRC
  if (['manufacturing', 'gerbers', 'drill', 'bom', 'cpl', 'manufacturingZip'].includes(gate)) return FAILURE_CATEGORIES.MANUFACTURING
  if (['proof', 'sourceUnchanged', 'rustReparse', 'kicadValidation'].includes(gate)) return FAILURE_CATEGORIES.PROOF
  if (gate === 'schematic') return FAILURE_CATEGORIES.SCHEMATIC
  return FAILURE_CATEGORIES.REQUIREMENTS
}

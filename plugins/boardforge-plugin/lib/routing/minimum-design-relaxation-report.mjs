import fs from 'node:fs/promises'

export function buildMinimumDesignRelaxationOptions(blockers = [], options = {}) {
  const unresolved = blockers.length || Number(options.remainingUnconnected || 0)
  return [
    ['move small passive by 0.25-0.50 mm', false, 'low'],
    ['rotate support passive or test pad if footprint allows', false, 'low'],
    ['move non-critical connector inside fixed outline by 0.5-1.0 mm', true, 'medium'],
    ['allow smaller legal through via', true, 'medium'],
    ['allow one more layer pair', true, 'medium'],
    ['allow microvias', true, 'high'],
    ['allow via-in-pad', true, 'high'],
    ['increase board outline locally', true, 'high'],
    ['change footprint/package', true, 'high'],
  ].map(([option, violatesHardLock, risk], index) => ({
    option,
    violatesHardLock,
    expectedUnconnectedReduction: Math.max(0, Math.ceil(unresolved / (index + 3))),
    expectedDrcImprovement: Math.max(0, Math.ceil(unresolved / (index + 4))),
    risk,
    whyNeeded: 'remaining routeability blockers persist after exact/local/regional routing',
    recommended: index === 0,
  }))
}

export async function writeMinimumDesignRelaxationReport(report, { jsonPath, markdownPath } = {}) {
  if (jsonPath) await fs.writeFile(jsonPath, JSON.stringify(report, null, 2))
  if (markdownPath) {
    const lines = ['# BoardForge Minimum Design Relaxation Report', '']
    for (const option of report.options || []) {
      lines.push(`- ${option.option}: expected unconnected reduction ${option.expectedUnconnectedReduction}, hard lock ${option.violatesHardLock}, risk ${option.risk}`)
    }
    await fs.writeFile(markdownPath, lines.join('\n'))
  }
  return { jsonPath, markdownPath }
}

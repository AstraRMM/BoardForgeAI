import fs from 'node:fs/promises'

export async function writeRouterEnsembleReport(report, { jsonPath, markdownPath } = {}) {
  if (jsonPath) await fs.writeFile(jsonPath, JSON.stringify(report, null, 2))
  if (markdownPath) {
    const lines = ['# BoardForge Router Ensemble Report', '']
    lines.push(`Input board: ${report.boardPath || ''}`)
    lines.push(`Best backend: ${report.best?.backend || 'none'}`)
    lines.push('')
    lines.push('## Backends')
    for (const backend of report.backends || []) {
      lines.push(`- ${backend.id}: ${backend.available ? 'available' : `unavailable (${(backend.missing || []).join(', ')})`}`)
    }
    lines.push('')
    lines.push('## Candidates')
    for (const result of report.scored || []) {
      lines.push(`- ${result.backend}: score ${result.score}, rejected ${result.rejected}, unconnected ${result.summary?.unconnected}`)
    }
    await fs.writeFile(markdownPath, lines.join('\n'))
  }
  return { jsonPath, markdownPath }
}

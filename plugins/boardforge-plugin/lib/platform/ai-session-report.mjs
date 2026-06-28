import { buildAiSessionReport } from './ai-command-runner.mjs'

export function writeAiSessionReport(commands = [], options = {}) {
  const report = {
    schema: 'boardforge.ai-session-report.v1',
    generatedAt: options.generatedAt || new Date().toISOString(),
    modelAdapter: options.modelAdapter || 'unknown',
    ...buildAiSessionReport(commands, options),
  }
  return report
}

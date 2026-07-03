export function recommendNextAction(blockers) {
  const critical = blockers.find((blocker) => blocker.severity === 'critical')
  if (critical) return critical.safeNextAction
  const api = blockers.find((blocker) => blocker.apiKeyRequired)
  if (api) return 'Keep PCB fab readiness separate from assembly readiness until supplier keys are configured.'
  return 'Project is ready for engineering review and optional dashboard publish.'
}

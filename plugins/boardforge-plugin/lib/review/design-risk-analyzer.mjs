export function analyzeDesignRisk({ health }) {
  const risks = []
  const validation = health.inputs.validation || {}
  const sourcing = health.inputs.sourcing || {}
  if ((validation.drc ?? 0) > 0) risks.push({ severity: 'critical', issue: 'DRC errors remain', recommendation: 'Run repair before manufacturing export.', blocking: true })
  if ((validation.erc ?? 0) > 0) risks.push({ severity: 'critical', issue: 'ERC errors remain', recommendation: 'Fix schematic/electrical errors before board release.', blocking: true })
  if ((validation.unconnected ?? 0) > 0) risks.push({ severity: 'high', issue: 'Unconnected ratsnest items remain', recommendation: 'Run route/finish pass and exact blocker report.', blocking: true })
  if (sourcing.state !== 'ASSEMBLY_READY_VERIFIED') risks.push({ severity: 'medium', issue: 'Assembly sourcing is not API verified', recommendation: 'Configure supplier API keys before claiming assembly readiness.', blocking: false })
  if (risks.length === 0) risks.push({ severity: 'info', issue: 'No board-release blockers detected in local artifacts', recommendation: 'Proceed to engineering review and supplier verification.', blocking: false })
  return risks
}

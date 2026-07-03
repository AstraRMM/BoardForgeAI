export function classifyProjectBlockers({ manifest }) {
  const validation = manifest.validation || {}
  const blockers = []
  if ((validation.shorts ?? 0) > 0) blockers.push(blocker('shorts_present', 'critical', 'Shorts remain on the board.', 'Run repair_drc in sandbox; rollback if connectivity worsens.'))
  if ((validation.drc ?? 0) > 0) blockers.push(blocker('drc_errors', 'critical', 'DRC errors remain.', 'Parse DRC tasks and repair highest-severity local issue first.'))
  if ((validation.erc ?? 0) > 0) blockers.push(blocker('erc_errors', 'critical', 'ERC errors remain.', 'Fix schematic/netlist issue before routing/manufacturing.'))
  if ((validation.unconnected ?? 0) > 0) blockers.push(blocker('unconnected_items', 'high', 'Ratsnest items remain.', 'Run route/finish pass or produce exact ratsnest blocker manifest.'))
  if (manifest.sourcing?.state !== 'ASSEMBLY_READY_VERIFIED') blockers.push(blocker('sourcing_not_verified', 'medium', 'Assembly sourcing is not API verified.', 'Configure supplier API keys before claiming assembly readiness.', { apiKeyRequired: true }))
  return blockers
}

function blocker(id, severity, issue, nextAction, extra = {}) {
  return {
    blockerId: id,
    severity,
    issue,
    whyItBlocked: issue,
    whatBoardForgeTried: 'Local artifact validation and project manifest gates were checked.',
    safeNextAction: nextAction,
    userApprovalRequired: false,
    apiKeyRequired: false,
    engineeringReviewRequired: false,
    ...extra,
  }
}

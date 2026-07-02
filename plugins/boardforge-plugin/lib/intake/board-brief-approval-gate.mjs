export function canBuildFromBrief(brief = {}, { briefApproved = false, devBypass = false } = {}) {
  const approved = Boolean(brief.briefApproved || briefApproved)
  const allowed = approved || devBypass
  return {
    schema: 'boardforge.board-brief-approval-gate.v1',
    allowed,
    briefApproved: approved,
    devBypass: Boolean(devBypass),
    blockers: allowed ? [] : ['board_brief_requires_user_approval'],
  }
}

export function requireBriefApproval(brief = {}, options = {}) {
  const gate = canBuildFromBrief(brief, options)
  if (!gate.allowed) {
    const error = new Error(`Board brief approval required: ${gate.blockers.join(', ')}`)
    error.gate = gate
    throw error
  }
  return gate
}

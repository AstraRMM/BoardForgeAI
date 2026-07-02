export function transitionConversation(session = {}, action, metadata = {}) {
  const history = [...(session.history || []), { action, at: new Date().toISOString(), ...metadata }]
  if (action === 'request_revision') {
    return { ...session, currentStage: 'revision_requested', approvalStatus: 'revision_requested', projectState: 'revision_requested', history }
  }
  if (action === 'approve') {
    return { ...session, currentStage: 'approved', approvalStatus: 'approved', projectState: 'brief_approved', history }
  }
  if (action === 'reject') {
    return { ...session, currentStage: 'rejected', approvalStatus: 'rejected', projectState: 'brief_rejected', history }
  }
  if (action === 'mark_candidate') {
    return { ...session, currentStage: 'approved', approvalStatus: 'approved', projectState: 'local_candidate', history }
  }
  return { ...session, history }
}

export function canBuildFromConversation(session = {}) {
  const allowed = session.approvalStatus === 'approved' || session.projectState === 'local_candidate'
  return {
    allowed,
    blockers: allowed ? [] : ['conversation_brief_requires_approval'],
    currentStage: session.currentStage,
    projectState: session.projectState,
  }
}

export function summarizeConversation(session = {}) {
  return {
    schema: 'boardforge.conversation-summary.v1',
    sessionId: session.sessionId,
    boardType: session.boardType,
    currentStage: session.currentStage,
    approvalStatus: session.approvalStatus,
    projectState: session.projectState,
    questionsAsked: session.questionsAsked || [],
    answeredFields: (session.answers || []).map((entry) => entry.field),
    conditionalFollowupsTriggered: session.conditionalFollowupsTriggered || [],
    assumptions: session.assumptions || [],
    risks: session.risks || [],
    buildBlocked: session.approvalStatus !== 'approved' && session.projectState !== 'local_candidate',
    publishBlocked: session.projectState !== 'approved_for_dashboard' && session.projectState !== 'dashboard_published',
  }
}

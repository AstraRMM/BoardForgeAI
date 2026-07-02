import { runQuestionEngine } from './question-engine.mjs'

export function applyConversationAnswers(session = {}, answerPatch = {}) {
  const answerMap = Object.fromEntries((session.answers || []).map((entry) => [entry.field, entry.value]))
  const answers = { ...answerMap, ...answerPatch }
  const plan = runQuestionEngine({ prompt: session.originalPrompt, boardType: session.boardType, answers })
  return {
    ...session,
    currentStage: plan.questionsToAsk.length ? 'followups' : 'brief_pending_approval',
    boardType: plan.boardType,
    questionsAsked: [...new Set([...(session.questionsAsked || []), ...plan.questionsToAsk])],
    answers: Object.entries(plan.answers || {}).map(([field, value]) => ({ field, value })),
    conditionalFollowupsTriggered: plan.conditionalFollowups,
    assumptions: plan.assumptions,
    risks: [...(plan.routingRisks || []), ...(plan.sourcingRisks || []), ...(plan.manufacturingRisks || [])],
    plan,
    history: [...(session.history || []), { action: 'apply_answers', at: new Date().toISOString(), answers: answerPatch }],
  }
}

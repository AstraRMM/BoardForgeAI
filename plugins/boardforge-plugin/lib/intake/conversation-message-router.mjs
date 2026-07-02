import { startConversationSession } from './conversation-session.mjs'
import { applyConversationAnswers } from './conversation-answer-applier.mjs'
import { transitionConversation } from './conversation-state-machine.mjs'

export function routeConversationMessage({ session = null, message = '', answers = {}, outputDir = null } = {}) {
  if (!session) return startConversationSession({ prompt: message, answers, outputDir })
  if (Object.keys(answers || {}).length) return applyConversationAnswers(session, answers)
  const text = String(message || '').toLowerCase()
  if (/approve/.test(text)) return transitionConversation(session, 'approve', { note: message })
  if (/reject/.test(text)) return transitionConversation(session, 'reject', { note: message })
  if (/revise|change|smaller|mounting ears|left edge|remove/.test(text)) return transitionConversation(session, 'request_revision', { note: message })
  return { ...session, history: [...(session.history || []), { action: 'message_recorded', at: new Date().toISOString(), note: message }] }
}

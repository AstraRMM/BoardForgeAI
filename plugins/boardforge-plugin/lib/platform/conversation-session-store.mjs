import { readConversationSession, writeConversationSession } from '../intake/conversation-session.mjs'

export const conversationSessionStore = {
  read: readConversationSession,
  write: writeConversationSession,
}

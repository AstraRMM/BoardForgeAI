import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { runQuestionEngine } from './question-engine.mjs'
import { generateBoardBrief, writeBoardBrief } from './board-brief-generator.mjs'

export function startConversationSession({ prompt = '', answers = {}, outputDir = null } = {}) {
  const plan = runQuestionEngine({ prompt, answers })
  return normalizeConversationSession({
    sessionId: `conv_${randomUUID()}`,
    originalPrompt: prompt,
    boardType: plan.boardType,
    currentStage: 'intake',
    questionsAsked: plan.questionsToAsk,
    answers: Object.entries(plan.answers || {}).map(([field, value]) => ({ field, value })),
    conditionalFollowupsTriggered: plan.conditionalFollowups,
    assumptions: plan.assumptions,
    risks: [...(plan.routingRisks || []), ...(plan.sourcingRisks || []), ...(plan.manufacturingRisks || [])],
    briefPath: '',
    approvalStatus: 'pending',
    projectState: 'local_draft',
    outputDir,
    plan,
    history: [{ action: 'start_session', at: new Date().toISOString(), note: prompt }],
  })
}

export function normalizeConversationSession(session = {}) {
  return {
    schema: 'boardforge.conversation-session.v1',
    sessionId: session.sessionId || `conv_${randomUUID()}`,
    originalPrompt: session.originalPrompt || '',
    boardType: session.boardType || 'robotics_controller',
    currentStage: session.currentStage || 'intake',
    questionsAsked: Array.isArray(session.questionsAsked) ? session.questionsAsked : [],
    answers: Array.isArray(session.answers) ? session.answers : [],
    conditionalFollowupsTriggered: Array.isArray(session.conditionalFollowupsTriggered) ? session.conditionalFollowupsTriggered : [],
    assumptions: Array.isArray(session.assumptions) ? session.assumptions : [],
    risks: Array.isArray(session.risks) ? session.risks : [],
    briefPath: session.briefPath || '',
    approvalStatus: session.approvalStatus || 'pending',
    projectState: session.projectState || 'local_draft',
    outputDir: session.outputDir || null,
    plan: session.plan || null,
    history: Array.isArray(session.history) ? session.history : [],
    updatedAt: new Date().toISOString(),
  }
}

export async function writeConversationSession({ session, outputDir }) {
  const targetDir = outputDir || session.outputDir
  if (!targetDir) throw new Error('outputDir is required')
  await mkdir(targetDir, { recursive: true })
  const file = path.join(targetDir, 'BoardForge_Conversation_Session.json')
  await writeFile(file, JSON.stringify(normalizeConversationSession({ ...session, outputDir: targetDir }), null, 2), 'utf8')
  return { file, session: normalizeConversationSession({ ...session, outputDir: targetDir }) }
}

export async function readConversationSession(file) {
  return normalizeConversationSession(JSON.parse(await readFile(file, 'utf8')))
}

export async function writeConversationBrief({ session, outputDir }) {
  const targetDir = outputDir || session.outputDir
  const brief = generateBoardBrief({ prompt: session.originalPrompt, plan: session.plan })
  const written = await writeBoardBrief({ brief: { ...brief, briefApproved: session.approvalStatus === 'approved' }, outputDir: targetDir })
  const next = normalizeConversationSession({
    ...session,
    currentStage: session.approvalStatus === 'approved' ? 'approved' : 'brief_pending_approval',
    briefPath: written.files.markdown,
    projectState: session.approvalStatus === 'approved' ? 'brief_approved' : 'brief_pending_approval',
    history: [...session.history, { action: 'write_brief', at: new Date().toISOString(), file: written.files.markdown }],
  })
  await writeConversationSession({ session: next, outputDir: targetDir })
  return { session: next, brief, files: written.files }
}

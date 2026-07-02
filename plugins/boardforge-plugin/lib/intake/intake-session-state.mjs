import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { runQuestionEngine } from './question-engine.mjs'

export function createIntakeSession({ prompt = '', answers = {}, outputDir = null } = {}) {
  const plan = runQuestionEngine({ prompt, answers })
  return {
    schema: 'boardforge.intake-session.v1',
    status: 'brief_pending_approval',
    prompt,
    boardType: plan.boardType,
    answers: plan.answers,
    questionsToAsk: plan.questionsToAsk,
    assumptions: plan.assumptions,
    skippedQuestions: plan.skippedQuestions,
    risks: {
      routing: plan.routingRisks,
      sourcing: plan.sourcingRisks,
      manufacturing: plan.manufacturingRisks,
    },
    outputDir,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export async function writeIntakeSession({ session, outputDir }) {
  if (!outputDir) throw new Error('outputDir is required')
  await mkdir(outputDir, { recursive: true })
  const file = path.join(outputDir, 'BoardForge_Intake_Session.json')
  await writeFile(file, JSON.stringify(session, null, 2), 'utf8')
  return { file, session }
}

export async function readIntakeSession(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

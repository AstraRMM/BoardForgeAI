import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { startConversationSession, writeConversationBrief, writeConversationSession, readConversationSession } from '../intake/conversation-session.mjs'
import { applyConversationAnswers } from '../intake/conversation-answer-applier.mjs'
import { transitionConversation } from '../intake/conversation-state-machine.mjs'
import { createProjectFromPrompt } from '../engine/create-project-from-prompt.mjs'
import { approveProjectForDashboard, markDashboardPublished } from './project-publish-gate.mjs'
import { transitionPublishState } from './project-publish-state.mjs'
import { assertPathIsAllowed } from './protected-path-guard.mjs'

export function createLocalArtifactApi({ rootDir }) {
  if (!rootDir) throw new Error('rootDir is required')
  return {
    async status() {
      return { status: 'BOARD_FORGE_LOCAL_ENGINE_AVAILABLE', mode: 'artifact-backed', rootDir, noFakeCloudExecution: true }
    },
    async startIntake({ prompt, projectId = 'BoardForge_Local_Intake' }) {
      const outputDir = path.join(rootDir, projectId)
      await mkdir(outputDir, { recursive: true })
      const session = startConversationSession({ prompt, outputDir })
      const written = await writeConversationSession({ session, outputDir })
      const brief = await writeConversationBrief({ session: written.session, outputDir })
      return { session: brief.session, sessionFile: written.file, briefFiles: brief.files }
    },
    async answerIntake({ sessionFile, answers }) {
      const session = await readConversationSession(sessionFile)
      const next = applyConversationAnswers(session, answers)
      const written = await writeConversationSession({ session: next, outputDir: path.dirname(sessionFile) })
      const brief = await writeConversationBrief({ session: written.session, outputDir: path.dirname(sessionFile) })
      return { session: brief.session, sessionFile: written.file, briefFiles: brief.files }
    },
    async generateBrief({ sessionFile }) {
      const session = await readConversationSession(sessionFile)
      return writeConversationBrief({ session, outputDir: path.dirname(sessionFile) })
    },
    async approveBrief({ sessionFile }) {
      const session = await readConversationSession(sessionFile)
      const approved = transitionConversation(session, 'approve', { actor: 'local-artifact-api' })
      const written = await writeConversationSession({ session: approved, outputDir: path.dirname(sessionFile) })
      const brief = await writeConversationBrief({ session: written.session, outputDir: path.dirname(sessionFile) })
      return { session: brief.session, sessionFile: written.file, briefFiles: brief.files }
    },
    async createProject({ sessionFile, devBypass = false }) {
      const session = await readConversationSession(sessionFile)
      return createProjectFromPrompt({ sessionPath: sessionFile, outputDir: path.dirname(sessionFile), approveBrief: session.approvalStatus === 'approved', devBypass })
    },
    async projectStatus({ projectDir }) {
      const guard = assertPathIsAllowed(projectDir)
      if (!guard.allowed) return { status: 'PROTECTED_PATH_REFUSED', reason: guard.reason }
      return readProjectStatus(projectDir)
    },
    async publishProject({ projectDir, confirm = false }) {
      const manifestPath = path.join(projectDir, 'BoardForge_Project_Manifest.json')
      const manifest = await readJson(manifestPath)
      if (!confirm) return { status: 'BOARD_FORGE_PUBLISH_BLOCKED_CONFIRM_REQUIRED', dashboardVisible: false }
      const approved = approveProjectForDashboard(manifest, { actor: 'local-artifact-api' })
      const published = markDashboardPublished(approved, { actor: 'local-artifact-api' })
      await writeFile(manifestPath, JSON.stringify(published, null, 2), 'utf8')
      return { status: 'PROJECT_SYNCED_TO_DASHBOARD', manifest: published }
    },
    async archiveProject({ projectDir }) {
      return updateProjectPublish(projectDir, 'archive')
    },
    async keepLocal({ projectDir }) {
      return updateProjectPublish(projectDir, 'keep_local')
    },
    async downloads({ projectDir }) {
      return readJson(path.join(projectDir, 'BoardForge_Downloads_Manifest.json'))
    },
    async reports({ projectDir }) {
      return readJson(path.join(projectDir, 'BoardForge_Project_Manifest.json'))
    },
  }
}

async function updateProjectPublish(projectDir, action) {
  const manifestPath = path.join(projectDir, 'BoardForge_Project_Manifest.json')
  const manifest = await readJson(manifestPath)
  const publish = transitionPublishState(manifest.publish || manifest, action, { actor: 'local-artifact-api' })
  const next = { ...manifest, publish, projectState: publish.projectState, dashboardVisible: publish.dashboardVisible, publishApproved: publish.publishApproved, syncStatus: publish.syncStatus }
  await writeFile(manifestPath, JSON.stringify(next, null, 2), 'utf8')
  return { status: `BOARD_FORGE_${action.toUpperCase()}_RECORDED`, manifest: next }
}

async function readProjectStatus(projectDir) {
  const manifest = await readJson(path.join(projectDir, 'BoardForge_Project_Manifest.json'))
  return {
    status: 'BOARD_FORGE_PROJECT_STATUS',
    projectDir,
    projectState: manifest.projectState,
    dashboardVisible: manifest.dashboardVisible,
    validation: manifest.validation,
    manufacturing: manifest.manufacturing,
    publish: manifest.publish,
  }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

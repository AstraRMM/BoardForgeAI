import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { startConversationSession, writeConversationBrief, writeConversationSession, readConversationSession } from '../intake/conversation-session.mjs'
import { applyConversationAnswers } from '../intake/conversation-answer-applier.mjs'
import { transitionConversation } from '../intake/conversation-state-machine.mjs'
import { createProjectFromPrompt } from '../engine/create-project-from-prompt.mjs'
import { approveProjectForDashboard, markDashboardPublished } from './project-publish-gate.mjs'
import { transitionPublishState } from './project-publish-state.mjs'
import { assertPathIsAllowed } from './protected-path-guard.mjs'
import { buildProjectDashboardData } from './project-dashboard-data.mjs'

const PROJECT_MANIFEST_FILENAME = 'BoardForge_Project_Manifest.json'
const PROJECT_MANIFEST_SCHEMA = 'boardforge.project-manifest.v1'

export function createLocalArtifactApi({ rootDir }) {
  if (!rootDir) throw new Error('rootDir is required')
  return {
    async status() {
      return { status: 'BOARD_FORGE_LOCAL_ENGINE_AVAILABLE', mode: 'artifact-backed', rootDir, noFakeCloudExecution: true }
    },
    async projectDashboard() {
      return readWorkspaceProjectDashboard(rootDir)
    },
    async startIntake({ prompt, projectId = 'BoardForge_Local_Intake' }) {
      const outputDir = resolveWorkspaceProjectDir(rootDir, projectId)
      await mkdir(outputDir, { recursive: true })
      const session = startConversationSession({ prompt, outputDir })
      const written = await writeConversationSession({ session, outputDir })
      const brief = await writeConversationBrief({ session: written.session, outputDir })
      return { session: brief.session, sessionFile: written.file, briefFiles: brief.files }
    },
    async answerIntake({ sessionFile, projectId, answers }) {
      sessionFile = resolveWorkspaceSessionFile(rootDir, { sessionFile, projectId })
      const session = await readConversationSession(sessionFile)
      const next = applyConversationAnswers(session, answers)
      const written = await writeConversationSession({ session: next, outputDir: path.dirname(sessionFile) })
      const brief = await writeConversationBrief({ session: written.session, outputDir: path.dirname(sessionFile) })
      return { session: brief.session, sessionFile: written.file, briefFiles: brief.files }
    },
    async generateBrief({ sessionFile, projectId }) {
      sessionFile = resolveWorkspaceSessionFile(rootDir, { sessionFile, projectId })
      const session = await readConversationSession(sessionFile)
      return writeConversationBrief({ session, outputDir: path.dirname(sessionFile) })
    },
    async approveBrief({ sessionFile, projectId }) {
      sessionFile = resolveWorkspaceSessionFile(rootDir, { sessionFile, projectId })
      const session = await readConversationSession(sessionFile)
      const approved = transitionConversation(session, 'approve', { actor: 'local-artifact-api' })
      const written = await writeConversationSession({ session: approved, outputDir: path.dirname(sessionFile) })
      const brief = await writeConversationBrief({ session: written.session, outputDir: path.dirname(sessionFile) })
      return { session: brief.session, sessionFile: written.file, briefFiles: brief.files }
    },
    async createProject({ sessionFile, projectId, devBypass = false }) {
      sessionFile = resolveWorkspaceSessionFile(rootDir, { sessionFile, projectId })
      const session = await readConversationSession(sessionFile)
      return createProjectFromPrompt({ sessionPath: sessionFile, outputDir: path.dirname(sessionFile), approveBrief: session.approvalStatus === 'approved', devBypass })
    },
    async projectStatus({ projectDir }) {
      const guard = assertPathIsAllowed(projectDir)
      if (!guard.allowed) return { status: 'PROTECTED_PATH_REFUSED', reason: guard.reason }
      return readProjectStatus(projectDir)
    },
    async publishProject({ projectDir, confirm = false }) {
      const manifestPath = path.join(projectDir, PROJECT_MANIFEST_FILENAME)
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
      return readJson(path.join(projectDir, PROJECT_MANIFEST_FILENAME))
    },
  }
}

const CONVERSATION_SESSION_FILENAME = 'BoardForge_Conversation_Session.json'

/**
 * Intake artifacts belong to a direct child of the configured local workspace.
 * Browser callers use `projectId`, never a user filesystem path. Keeping the
 * legacy sessionFile form bounded here also protects CLI callers from escaping
 * the configured workspace root.
 */
function resolveWorkspaceSessionFile(rootDir, { sessionFile, projectId } = {}) {
  if (projectId) return path.join(resolveWorkspaceProjectDir(rootDir, projectId), CONVERSATION_SESSION_FILENAME)
  if (!sessionFile) throw new Error('projectId is required for a local intake session')

  const workspaceRoot = path.resolve(rootDir)
  const candidate = path.resolve(sessionFile)
  const relative = path.relative(workspaceRoot, candidate)
  const allowed = Boolean(relative) && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative) && path.basename(candidate) === CONVERSATION_SESSION_FILENAME && path.dirname(path.relative(workspaceRoot, candidate)).split(path.sep).length === 1
  if (!allowed) throw new Error('intake session must remain inside a direct local workspace project')
  return candidate
}

function resolveWorkspaceProjectDir(rootDir, projectId) {
  const normalizedProjectId = String(projectId || '').trim()
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,80}$/.test(normalizedProjectId)) {
    throw new Error('projectId must use letters, numbers, hyphens, or underscores only')
  }
  return path.join(path.resolve(rootDir), normalizedProjectId)
}

async function updateProjectPublish(projectDir, action) {
  const manifestPath = path.join(projectDir, PROJECT_MANIFEST_FILENAME)
  const manifest = await readJson(manifestPath)
  const publish = transitionPublishState(manifest.publish || manifest, action, { actor: 'local-artifact-api' })
  const next = { ...manifest, publish, projectState: publish.projectState, dashboardVisible: publish.dashboardVisible, publishApproved: publish.publishApproved, syncStatus: publish.syncStatus }
  await writeFile(manifestPath, JSON.stringify(next, null, 2), 'utf8')
  return { status: `BOARD_FORGE_${action.toUpperCase()}_RECORDED`, manifest: next }
}

async function readProjectStatus(projectDir) {
  const manifest = await readJson(path.join(projectDir, PROJECT_MANIFEST_FILENAME))
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

/**
 * Reads only BoardForge project artifact directories directly under the local
 * engine root. This deliberately does not recurse into arbitrary user paths
 * or infer a project from unrelated KiCad files.
 */
async function readWorkspaceProjectDashboard(rootDir) {
  const workspaceRoot = path.resolve(rootDir)
  const entries = await readdir(workspaceRoot, { withFileTypes: true })
  const manifests = []
  const artifactPaths = []
  const warnings = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const projectDir = path.resolve(workspaceRoot, entry.name)
    if (!isDirectWorkspaceChild(workspaceRoot, projectDir)) continue

    const manifestPath = path.join(projectDir, PROJECT_MANIFEST_FILENAME)
    let manifest
    try {
      manifest = await readJson(manifestPath)
    } catch (error) {
      if (error?.code !== 'ENOENT') warnings.push(`Ignored unreadable BoardForge project artifact at ${entry.name}: ${error.message}`)
      continue
    }

    if (manifest?.schema !== PROJECT_MANIFEST_SCHEMA) {
      warnings.push(`Ignored ${entry.name}: ${PROJECT_MANIFEST_FILENAME} does not declare ${PROJECT_MANIFEST_SCHEMA}.`)
      continue
    }

    manifests.push({ ...manifest, sourceManifest: manifestPath })
    artifactPaths.push(manifestPath)
  }

  return {
    dashboard: buildProjectDashboardData(manifests, { sourceManifests: artifactPaths }),
    artifactPaths,
    warnings,
  }
}

function isDirectWorkspaceChild(workspaceRoot, candidate) {
  const relative = path.relative(workspaceRoot, candidate)
  return Boolean(relative) && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative) && path.dirname(relative) === '.'
}

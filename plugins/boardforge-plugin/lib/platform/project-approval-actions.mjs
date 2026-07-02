import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { assertPathIsAllowed } from './protected-path-guard.mjs'
import { defaultPublishState, transitionPublishState } from './project-publish-state.mjs'
import { writeProjectApprovalReport } from './project-approval-report.mjs'

export async function applyProjectApprovalAction({ projectDir, manifestPath, action, note = '', actor = 'cli' } = {}) {
  if (!projectDir) throw new Error('projectDir is required')
  const resolvedProjectDir = path.resolve(projectDir)
  const guard = assertPathIsAllowed(resolvedProjectDir)
  if (!guard.allowed) throw new Error(`Refused approval action: ${guard.reason} (${resolvedProjectDir})`)
  const resolvedManifestPath = path.resolve(manifestPath || path.join(resolvedProjectDir, 'BoardForge_Project_Manifest.json'))
  await mkdir(resolvedProjectDir, { recursive: true })
  const manifest = await readManifest(resolvedManifestPath, resolvedProjectDir)
  const transition = actionToTransition(action)
  const publish = transitionPublishState(manifest.publish || manifest, transition, { actor, note })
  const next = {
    ...manifest,
    publish,
    projectState: publish.projectState,
    briefApproved: publish.briefApproved,
    publishApproved: publish.publishApproved,
    dashboardVisible: publish.dashboardVisible,
    syncStatus: publish.syncStatus,
  }
  if (action === 'request-revision') {
    next.revision = await createRevisionArtifacts(resolvedProjectDir, note)
  }
  await writeFile(resolvedManifestPath, JSON.stringify(next, null, 2), 'utf8')
  const report = await writeProjectApprovalReport({ project: next, outputDir: resolvedProjectDir })
  return { status: `BOARD_FORGE_${action.toUpperCase().replace(/-/g, '_')}_RECORDED`, manifest: next, report: report.files }
}

async function readManifest(manifestPath, projectDir) {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch {
    return { schema: 'boardforge.project-manifest.v1', projectId: path.basename(projectDir), projectName: path.basename(projectDir), publish: defaultPublishState() }
  }
}

function actionToTransition(action) {
  if (action === 'approve-brief') return 'approve_brief'
  if (action === 'reject-brief') return 'reject_brief'
  if (action === 'request-revision') return 'request_revision'
  throw new Error(`Unsupported approval action: ${action}`)
}

async function createRevisionArtifacts(projectDir, note) {
  const historyPath = path.join(projectDir, 'BoardForge_Brief_Revision_History.json')
  let history = []
  try {
    history = JSON.parse(await readFile(historyPath, 'utf8'))
  } catch {
    history = []
  }
  const nextVersion = history.length + 1
  const source = path.join(projectDir, 'BoardForge_Board_Brief.md')
  const target = path.join(projectDir, `BoardForge_Board_Brief_v${nextVersion}.md`)
  try {
    await copyFile(source, target)
  } catch {
    await writeFile(target, `# BoardForge Board Brief v${nextVersion}\n\nRevision requested: ${note || 'no note'}\n`, 'utf8')
  }
  history.push({ version: nextVersion, action: 'revision_requested', note, file: target, at: new Date().toISOString() })
  await writeFile(historyPath, JSON.stringify(history, null, 2), 'utf8')
  return { version: nextVersion, historyPath, latestBrief: target }
}

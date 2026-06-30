import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildProjectDashboardCard, buildProjectDashboardData } from './project-dashboard-data.mjs'
import { buildProjectManifest } from './project-manifest.mjs'

export const BOARD_FORGE_PROJECT_ARTIFACT_FILES = Object.freeze({
  manifest: 'BoardForge_Project_Manifest.json',
  dashboardData: 'BoardForge_Project_Dashboard_Data.json',
  engineRunLog: 'BoardForge_Engine_Run_Log.json',
  userReport: 'BoardForge_User_Facing_Report.md',
  webProjectCard: 'BoardForge_Web_Project_Card.json',
  kicadPluginActionLog: 'BoardForge_KiCad_Plugin_Action_Log.json',
  cliReplayCommand: 'BoardForge_CLI_Replay_Command.txt',
})

export function buildProjectArtifactPack({ project = {}, evidence = {}, run = {}, actions = [] } = {}) {
  const manifest = buildProjectManifest(project, evidence)
  const dashboardData = buildProjectDashboardData([manifest], {
    generatedAt: run.generatedAt || evidence.generatedAt,
  })
  const webProjectCard = buildProjectDashboardCard(manifest)
  const replayCommand = buildReplayCommand({ project, evidence, manifest })
  const engineRunLog = buildEngineRunLog({ project, evidence, run, manifest, replayCommand })
  const kicadPluginActionLog = buildKicadPluginActionLog({ actions, project, run })
  const userReport = buildUserFacingReport({ manifest, webProjectCard, replayCommand, engineRunLog })

  return {
    schema: 'boardforge.project-artifact-pack.v1',
    generatedAt: engineRunLog.generatedAt,
    manifest,
    dashboardData,
    engineRunLog,
    userReport,
    webProjectCard,
    kicadPluginActionLog,
    cliReplayCommand: replayCommand,
  }
}

export async function writeProjectArtifactPack({ outputDir, project = {}, evidence = {}, run = {}, actions = [] } = {}) {
  if (!outputDir) throw new Error('outputDir is required')
  const artifactPack = buildProjectArtifactPack({ project, evidence, run, actions })
  await mkdir(outputDir, { recursive: true })

  const written = {}
  await writeJson(outputDir, BOARD_FORGE_PROJECT_ARTIFACT_FILES.manifest, artifactPack.manifest, written, 'manifest')
  await writeJson(outputDir, BOARD_FORGE_PROJECT_ARTIFACT_FILES.dashboardData, artifactPack.dashboardData, written, 'dashboardData')
  await writeJson(outputDir, BOARD_FORGE_PROJECT_ARTIFACT_FILES.engineRunLog, artifactPack.engineRunLog, written, 'engineRunLog')
  await writeText(outputDir, BOARD_FORGE_PROJECT_ARTIFACT_FILES.userReport, artifactPack.userReport, written, 'userReport')
  await writeJson(outputDir, BOARD_FORGE_PROJECT_ARTIFACT_FILES.webProjectCard, artifactPack.webProjectCard, written, 'webProjectCard')
  await writeJson(outputDir, BOARD_FORGE_PROJECT_ARTIFACT_FILES.kicadPluginActionLog, artifactPack.kicadPluginActionLog, written, 'kicadPluginActionLog')
  await writeText(outputDir, BOARD_FORGE_PROJECT_ARTIFACT_FILES.cliReplayCommand, `${artifactPack.cliReplayCommand}\n`, written, 'cliReplayCommand')

  return { artifactPack, files: written }
}

export function buildReplayCommand({ project = {}, evidence = {}, manifest = {} } = {}) {
  if (evidence.replayCommand) return evidence.replayCommand
  const boardPath = project.boardPath || manifest.boardPath || project.projectPath || ''
  const manifestPath = project.manifestPath || path.join(project.projectPath || '.', BOARD_FORGE_PROJECT_ARTIFACT_FILES.manifest)
  if (boardPath) return `npm run boardforge:validate -- --project "${boardPath}"`
  return `npm run boardforge:report -- --manifest "${manifestPath}"`
}

function buildEngineRunLog({ project, evidence, run, manifest, replayCommand }) {
  const startedAt = run.startedAt || evidence.startedAt || null
  const generatedAt = run.generatedAt || evidence.generatedAt || new Date().toISOString()
  return {
    schema: 'boardforge.engine-run-log.v1',
    runId: run.id || `${manifest.projectId}-run`,
    generatedAt,
    startedAt,
    completedAt: run.completedAt || generatedAt,
    controller: run.controller || 'boardforge_local_engine',
    projectId: manifest.projectId,
    projectName: manifest.projectName,
    workspace: project.workspace || null,
    boardPath: manifest.boardPath,
    schematicPath: manifest.schematicPath,
    status: manifest.status,
    validation: manifest.validation,
    manufacturing: manifest.manufacturing,
    workflowSteps: run.workflowSteps || [],
    lessonsSaved: run.lessonsSaved || evidence.lessonsSaved || [],
    replayCommand,
  }
}

function buildKicadPluginActionLog({ actions, project, run }) {
  return {
    schema: 'boardforge.kicad-plugin-action-log.v1',
    projectId: project.id || project.name || 'unnamed-project',
    generatedAt: run.generatedAt || new Date().toISOString(),
    actions: actions.map((action, index) => ({
      id: action.id || `action-${index + 1}`,
      type: action.type || 'unknown',
      status: action.status || 'recorded',
      createdAt: action.createdAt || run.generatedAt || null,
      command: action.command || null,
      reportPath: action.reportPath || null,
    })),
  }
}

function buildUserFacingReport({ manifest, webProjectCard, replayCommand, engineRunLog }) {
  const blockers = webProjectCard.criticalBlockers
    .map((blocker) => `- ${blocker.code}: ${blocker.count} (${blocker.severity})`)
    .join('\n') || '- none'

  return [
    `# BoardForge Project Report: ${manifest.projectName}`,
    '',
    `Status: ${manifest.status}`,
    `Readiness: ${webProjectCard.readiness}`,
    '',
    '## Validation',
    `- shorts: ${manifest.validation.shorts}`,
    `- unconnected: ${manifest.validation.unconnected}`,
    `- forbidden vias: ${manifest.validation.forbiddenVias}`,
    `- DRC violations: ${manifest.validation.drcViolations}`,
    `- ERC violations: ${manifest.validation.ercViolations}`,
    '',
    '## Manufacturing',
    `- ready: ${manifest.manufacturing.ready}`,
    `- ZIP: ${manifest.manufacturing.zip || 'not exported'}`,
    `- blocked reason: ${manifest.manufacturing.blockedReason || 'none'}`,
    '',
    '## Blockers',
    blockers,
    '',
    '## Next Action',
    webProjectCard.nextAction,
    '',
    '## Replay',
    `\`${replayCommand}\``,
    '',
    '## Engine',
    `- run id: ${engineRunLog.runId}`,
    `- controller: ${engineRunLog.controller}`,
    `- generated at: ${engineRunLog.generatedAt}`,
    '',
  ].join('\n')
}

async function writeJson(outputDir, filename, value, written, key) {
  const filePath = path.join(outputDir, filename)
  await writeFile(filePath, JSON.stringify(value, null, 2), 'utf8')
  written[key] = filePath
}

async function writeText(outputDir, filename, value, written, key) {
  const filePath = path.join(outputDir, filename)
  await writeFile(filePath, value, 'utf8')
  written[key] = filePath
}

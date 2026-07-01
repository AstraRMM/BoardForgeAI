import fs from 'node:fs'
import path from 'node:path'

export function readLocalEngineStatus(projectDir) {
  const root = path.resolve(projectDir || process.cwd())
  const runLog = readJson(path.join(root, 'BoardForge_Engine_Run_Log.json'))
  const manifest = readJson(path.join(root, 'BoardForge_Project_Manifest.json'))
  const pluginLog = readJson(path.join(root, 'BoardForge_KiCad_Plugin_Action_Log.json'))
  const replayFile = path.join(root, 'BoardForge_CLI_Replay_Command.txt')
  return {
    schema: 'boardforge.local-engine-status.v1',
    source: 'local_artifact_polling',
    projectDir: root,
    projectId: manifest?.projectId || manifest?.id || runLog?.projectId || path.basename(root),
    currentStage: runLog?.workflowSteps?.at?.(-1) || pluginLog?.latestStatus?.latestAction || 'unknown',
    latestStatus: runLog?.status || manifest?.status || pluginLog?.latestStatus?.status || 'unknown',
    latestBoard: runLog?.boardPath || manifest?.boardPath || null,
    drc: runLog?.validation?.drcViolations ?? manifest?.validation?.drcViolations ?? manifest?.validation?.drcErrors ?? null,
    erc: runLog?.validation?.ercViolations ?? manifest?.validation?.ercErrors ?? null,
    shorts: runLog?.validation?.shorts ?? manifest?.validation?.shorts ?? null,
    unconnected: runLog?.validation?.unconnected ?? manifest?.validation?.unconnected ?? null,
    manufacturingReady: Boolean(runLog?.manufacturing?.ready || manifest?.manufacturing?.ready),
    manufacturingZip: runLog?.manufacturing?.zip || manifest?.manufacturing?.zip || null,
    latestReport: existingPath(root, 'BoardForge_User_Facing_Report.md') || existingPath(root, 'BoardForge_Dirty_Repair_Final_Status.md'),
    cliReplayCommand: fs.existsSync(replayFile) ? fs.readFileSync(replayFile, 'utf8').trim() : runLog?.replayCommand || null,
    blockedReason: runLog?.manufacturing?.blockedReason || manifest?.manufacturing?.blockedReason || null,
  }
}

function readJson(file) {
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function existingPath(root, name) {
  const file = path.join(root, name)
  return fs.existsSync(file) ? file : null
}

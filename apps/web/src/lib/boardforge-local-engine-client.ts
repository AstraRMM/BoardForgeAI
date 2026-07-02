import { dirtyRepairEngineStatus } from './boardforge-engine-status'
import { localArtifactApiContract } from './boardforge-local-artifact-client'

export type LocalEngineBridgeStatus = {
  schema: 'boardforge.local-engine-status.v1'
  source: 'local_artifact_polling'
  projectDir: string
  projectId: string
  currentStage: string
  latestStatus: string
  latestBoard: string | null
  drc: number | null
  erc: number | null
  shorts: number | null
  unconnected: number | null
  manufacturingReady: boolean
  manufacturingZip: string | null
  latestReport: string | null
  cliReplayCommand: string | null
  blockedReason: string | null
}

export const localEngineOfflineMessage =
  'BoardForge Local Engine is offline. Start it to generate, route, repair, or export boards.'

export function getLocalEngineStatusCopy() {
  return {
    status: 'local_engine_required',
    message: localEngineOfflineMessage || localArtifactApiContract.offlineMessage,
    artifactBacked: true,
    noFakeCloudExecution: true,
  }
}

export function getLocalEngineBridgeStatus(): LocalEngineBridgeStatus {
  return {
    schema: 'boardforge.local-engine-status.v1',
    source: 'local_artifact_polling',
    projectDir: 'C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\BF-DIRTY-REPAIR-PROOF-01_REV_A',
    projectId: dirtyRepairEngineStatus.projectId,
    currentStage: 'writeProductArtifacts',
    latestStatus: dirtyRepairEngineStatus.latestStatus,
    latestBoard: dirtyRepairEngineStatus.currentBoardFile,
    drc: dirtyRepairEngineStatus.drcAfter,
    erc: dirtyRepairEngineStatus.ercAfter,
    shorts: dirtyRepairEngineStatus.shortsAfter,
    unconnected: dirtyRepairEngineStatus.unconnectedAfter,
    manufacturingReady: dirtyRepairEngineStatus.manufacturingReady,
    manufacturingZip: dirtyRepairEngineStatus.manufacturingZip,
    latestReport: 'C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\BF-DIRTY-REPAIR-PROOF-01_REV_A\\BoardForge_Dirty_Repair_Final_Status.md',
    cliReplayCommand: dirtyRepairEngineStatus.cliReplayCommand,
    blockedReason: dirtyRepairEngineStatus.blocker,
  }
}

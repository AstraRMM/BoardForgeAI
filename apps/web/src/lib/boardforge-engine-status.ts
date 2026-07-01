export type BoardForgeEngineStatus = {
  schema: 'boardforge.web-engine-status.v1'
  source: 'local_artifact'
  projectId: string
  fixtureName: string
  readinessEvidenceCategory: string
  latestStatus: string
  startingBoard: string
  finalBoard: string
  currentBoardFile: string
  drcBefore: number
  drcAfter: number
  ercBefore: number
  ercAfter: number
  shortsBefore: number
  shortsAfter: number
  unconnectedBefore: number
  unconnectedAfter: number
  transactionsAttempted: number
  transactionsCommitted: number
  transactionsRolledBack: number
  manufacturingReady: boolean
  manufacturingZip: string | null
  blocker: string | null
  cliReplayCommand: string
}

export const dirtyRepairEngineStatus: BoardForgeEngineStatus = {
  schema: 'boardforge.web-engine-status.v1',
  source: 'local_artifact',
  projectId: 'BF-DIRTY-REPAIR-PROOF-01_REV_A',
  fixtureName: 'Dirty-to-clean physical repair proof',
  readinessEvidenceCategory: 'dirty_to_clean_physical_repair',
  latestStatus: 'dirty_repair_manufacturing_candidate_generated',
  startingBoard: 'C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\BF-DIRTY-REPAIR-PROOF-01_REV_A\\BF-DIRTY-REPAIR-PROOF-01_REV_A_dirty_start.kicad_pcb',
  finalBoard: 'C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\BF-DIRTY-REPAIR-PROOF-01_REV_A\\BF-DIRTY-REPAIR-PROOF-01_REV_A_clean_manufacturing_candidate.kicad_pcb',
  currentBoardFile: 'C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\BF-DIRTY-REPAIR-PROOF-01_REV_A\\BF-DIRTY-REPAIR-PROOF-01_REV_A_clean_manufacturing_candidate.kicad_pcb',
  drcBefore: 10,
  drcAfter: 0,
  ercBefore: 0,
  ercAfter: 0,
  shortsBefore: 1,
  shortsAfter: 0,
  unconnectedBefore: 0,
  unconnectedAfter: 0,
  transactionsAttempted: 8,
  transactionsCommitted: 8,
  transactionsRolledBack: 0,
  manufacturingReady: true,
  manufacturingZip: 'C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\BF-DIRTY-REPAIR-PROOF-01_REV_A\\manufacturing\\BF-DIRTY-REPAIR-PROOF-01_REV_A_JLCPCB.zip',
  blocker: null,
  cliReplayCommand: 'npm run boardforge:dirty-repair-proof',
}

export function getBoardForgeEngineStatus(projectId?: string) {
  if (!projectId || projectId === dirtyRepairEngineStatus.projectId) return dirtyRepairEngineStatus
  return { ...dirtyRepairEngineStatus, projectId }
}

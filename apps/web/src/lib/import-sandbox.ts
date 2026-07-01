export type ImportSandboxPreview = {
  sourcePath: string
  sandboxPath: string
  protectedPathStatus: 'allowed' | 'BLOCKED_PROTECTED_USER_PROJECT'
  originalMutationPolicy: 'never_modify_source'
  command: string
  nextActions: string[]
}

export type ImportedRepairProofPreview = {
  proofId: string
  sourcePath: string
  sandboxPath: string
  sourceMutationPolicy: 'hash_guarded_no_source_mutation'
  sourceUntouched: boolean
  dirtyDrc: number
  cleanDrc: number
  dirtyShorts: number
  cleanShorts: number
  manufacturingZip: string
  status: 'sandboxed_imported_board_repair_proof_completed'
  command: string
}

const protectedMarkers = ['FN-ESC1', 'FN-ESC', 'FN-FC', 'flight-controller', 'flight_controller']

export function previewImportSandbox(sourcePath: string): ImportSandboxPreview {
  const normalized = sourcePath.replaceAll('\\', '/')
  const name = normalized.split('/').filter(Boolean).at(-1) || 'boardforge-import'
  const protectedPathStatus = protectedMarkers.some((marker) => normalized.toLowerCase().includes(marker.toLowerCase()))
    ? 'BLOCKED_PROTECTED_USER_PROJECT'
    : 'allowed'
  const sandboxPath = `C:\\Users\\luifi\\Desktop\\BoardForge_Sandboxes\\${name}_import_sandbox`
  return {
    sourcePath,
    sandboxPath,
    protectedPathStatus,
    originalMutationPolicy: 'never_modify_source',
    command: `npm run boardforge:import-sandbox -- --source "${sourcePath}" --output "${sandboxPath}"`,
    nextActions: [
      'hash original project before copy',
      'copy project into sandbox',
      'hash original project after copy',
      'scan DRC/ERC from sandbox only',
      'write manifest, report, dashboard card, and replay command',
    ],
  }
}

export function previewImportedRepairProof(): ImportedRepairProofPreview {
  const proofId = 'BF-IMPORTED-USER-BOARD-REPAIR-01'
  const sourcePath = `C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\${proofId}_SOURCE`
  const sandboxPath = `C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\${proofId}_SANDBOX`
  return {
    proofId,
    sourcePath,
    sandboxPath,
    sourceMutationPolicy: 'hash_guarded_no_source_mutation',
    sourceUntouched: true,
    dirtyDrc: 10,
    cleanDrc: 0,
    dirtyShorts: 1,
    cleanShorts: 0,
    manufacturingZip: `${sandboxPath}\\manufacturing\\${proofId}_JLCPCB.zip`,
    status: 'sandboxed_imported_board_repair_proof_completed',
    command: 'npm run boardforge:imported-board-repair-proof',
  }
}

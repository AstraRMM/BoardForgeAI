export type ImportSandboxPreview = {
  sourcePath: string
  sandboxPath: string
  protectedPathStatus: 'allowed' | 'BLOCKED_PROTECTED_USER_PROJECT'
  originalMutationPolicy: 'never_modify_source'
  command: string
  nextActions: string[]
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

export type BoardForgeManifest = {
  schema: string
  projectId: string
  projectName: string
  status: string
  validation: {
    shorts: number
    unconnected: number
    forbiddenVias: number
    drcViolations: number
    ercViolations: number
  }
  manufacturing: {
    ready: boolean
    zip: string | null
    blockedReason: string | null
  }
  reports: Record<string, string>
  replay: {
    command: string | null
  }
}

export function readinessLabel(manifest: BoardForgeManifest): 'ready' | 'blocked' | 'review' {
  const v = manifest.validation
  if (manifest.manufacturing.ready && v.shorts === 0 && v.unconnected === 0 && v.forbiddenVias === 0 && v.drcViolations === 0 && v.ercViolations === 0) return 'ready'
  if (v.shorts > 0 || v.forbiddenVias > 0 || v.unconnected > 0 || v.drcViolations > 0 || v.ercViolations > 0) return 'blocked'
  return 'review'
}

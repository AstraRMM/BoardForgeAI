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

export type BoardForgeReadiness = 'ready' | 'blocked' | 'review'

export type BoardForgeDashboardCard = {
  schema: 'boardforge.project-dashboard-card.v1'
  projectId: string
  projectName: string
  status: string
  boardPath: string | null
  schematicPath: string | null
  readiness: BoardForgeReadiness
  routingCompletionPercent: number
  routeabilityScore?: number
  validation: BoardForgeManifest['validation'] & {
    drcErrors?: number
    drcWarnings?: number
    ercErrors?: number
    ercWarnings?: number
    namedNets?: number
    routedSegments?: number
    nettedPads?: number
    schematicGraphStatus?: string
  }
  manufacturing: BoardForgeManifest['manufacturing']
  reports: Record<string, string>
  replayCommand: string | null
  criticalBlockers: Array<{
    code: string
    count: number
    severity: 'critical' | 'error' | 'review'
  }>
  nextAction: string
  sourceManifest: string | null
  honestyBadges?: string[]
  importSandbox?: {
    status: string
    originalUntouched: boolean
    report: string
  }
}

export type BoardForgeDashboardData = {
  schema: 'boardforge.project-dashboard-data.v1'
  generatedAt: string
  summary: {
    totalProjects: number
    manufacturingReady: number
    blocked: number
    review: number
    needsRouting: number
    cleanDrcErc: number
  }
  projects: BoardForgeDashboardCard[]
}

export function readinessLabel(manifest: BoardForgeManifest): BoardForgeReadiness {
  const v = manifest.validation
  if (manifest.manufacturing.ready && v.shorts === 0 && v.unconnected === 0 && v.forbiddenVias === 0 && v.drcViolations === 0 && v.ercViolations === 0) return 'ready'
  if (v.shorts > 0 || v.forbiddenVias > 0 || v.unconnected > 0 || v.drcViolations > 0 || v.ercViolations > 0) return 'blocked'
  return 'review'
}

export function dashboardCardLabel(card: BoardForgeDashboardCard): BoardForgeReadiness {
  if (card.readiness === 'ready' && card.manufacturing.ready && card.criticalBlockers.length === 0) return 'ready'
  if (card.criticalBlockers.some((blocker) => blocker.severity === 'critical' || blocker.severity === 'error')) return 'blocked'
  return 'review'
}

export function dashboardSummaryLabel(data: BoardForgeDashboardData): 'all-ready' | 'blocked' | 'review' {
  if (data.summary.blocked > 0 || data.projects.some((project) => dashboardCardLabel(project) === 'blocked')) return 'blocked'
  if (data.summary.manufacturingReady === data.summary.totalProjects && data.summary.totalProjects > 0) return 'all-ready'
  return 'review'
}

export type BoardForgeReadinessEvidence = {
  schema: 'boardforge.readiness-evidence.v1'
  readiness: number
  generatedAt: string
  evidence: {
    cleanFixtures: number
    manufacturingExports: number
    dirtyToCleanRepairs: number
    categoryCoverage: number
    safeImports: number
  }
  knownGaps: string[]
  latestTests: Array<{
    command: string
    status: 'passed' | 'failed' | 'not_run'
  }>
}

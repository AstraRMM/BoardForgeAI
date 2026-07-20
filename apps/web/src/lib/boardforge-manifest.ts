import type { BrowserPcbSnapshotV1 } from './pcb-editor/model'

export type BoardForgeManifest = {
  schema: string
  projectId: string
  projectName: string
  status: string
  validation: {
    shorts: number | null
    unconnected: number | null
    forbiddenVias: number | null
    drcViolations: number | null
    ercViolations: number | null
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
  publish?: BoardForgePublishState
  projectState?: BoardForgeProjectState
  publishApproved?: boolean
  dashboardVisible?: boolean
  syncStatus?: string
}

export type BoardForgeProjectState =
  | 'local_draft'
  | 'local_candidate'
  | 'approved_for_dashboard'
  | 'dashboard_published'
  | 'archived'
  | 'failed_experiment'

export type BoardForgePublishState = {
  schema?: 'boardforge.project-publish-state.v1'
  projectState: BoardForgeProjectState
  publishApproved: boolean
  dashboardVisible: boolean
  syncStatus: string
  userApprovalRequired: boolean
  approvalHistory: Array<{
    action: string
    at: string
    actor: string
    note?: string
  }>
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
  publish?: BoardForgePublishState
  projectState?: BoardForgeProjectState
  publishApproved?: boolean
  dashboardVisible?: boolean
  syncStatus?: string
  /** Helper-confirmed raster render; no local path or image bytes are exposed. */
  artifacts?: {
    preview3d?: { available: true; mimeType: 'image/png' | 'image/webp' }
  }
  localOnly?: boolean
  /** Browser-only working data, never local-engine KiCad evidence. */
  browserDraft?: BoardForgeBrowserDraft
}

export type BoardForgeBrowserDraft = {
  schema: 'boardforge.browser-draft.v1'
  kind: 'board' | 'outline' | 'import' | 'pcb'
  updatedAt: string
  summary: string
  outline?: {
    preset: string
    closed: boolean
    pointsMm: Array<{ x: number; y: number }>
    mountingHolesMm: Array<{
      ref: string
      x: number
      y: number
      diameterMm: number
      keepoutMm: number
      plating: 'plated' | 'non-plated'
      locked: boolean
    }>
    browserValidation: {
      status: 'valid' | 'blocked'
      routeabilityScore: number
      risk: 'Low' | 'Medium' | 'High' | 'Blocked'
      blockers: string[]
    }
  }
  /** Exact browser sandbox model. It has never passed the KiCad candidate pipeline. */
  pcb?: BrowserPcbSnapshotV1
  /** Browser-only circuit planning data. It is never KiCad source or a netlist. */
  schematicPlan?: BoardForgeBrowserSchematicPlan
}

export type BoardForgeBrowserSchematicPlan = {
  schema: 'boardforge.browser-schematic-plan.v1'
  version: 1
  title: string
  updatedAt: string
  notes: string
  components: Array<{ id: string; reference: string; value: string; notes: string }>
  connections: Array<{ id: string; fromComponentId: string; toComponentId: string; netName: string }>
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
  if ([v.shorts, v.unconnected, v.forbiddenVias, v.drcViolations, v.ercViolations].some((value) => value === null)) return 'review'
  if (manifest.manufacturing.ready && v.shorts === 0 && v.unconnected === 0 && v.forbiddenVias === 0 && v.drcViolations === 0 && v.ercViolations === 0) return 'ready'
  if ([v.shorts, v.forbiddenVias, v.unconnected, v.drcViolations, v.ercViolations].some((value) => (value ?? 0) > 0)) return 'blocked'
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

export function normalizePublishState(input?: Partial<BoardForgePublishState> | BoardForgeManifest | BoardForgeDashboardCard): BoardForgePublishState {
  const publish = ('publish' in (input || {}) ? (input as BoardForgeManifest | BoardForgeDashboardCard).publish : input) as Partial<BoardForgePublishState> | undefined
  const projectState = publish?.projectState || (input as BoardForgeManifest | BoardForgeDashboardCard | undefined)?.projectState || 'local_draft'
  const dashboardVisible = projectState === 'dashboard_published'
  return {
    schema: 'boardforge.project-publish-state.v1',
    projectState,
    publishApproved: Boolean(publish?.publishApproved || (input as BoardForgeManifest | BoardForgeDashboardCard | undefined)?.publishApproved || projectState === 'approved_for_dashboard' || projectState === 'dashboard_published'),
    dashboardVisible,
    syncStatus: publish?.syncStatus || (input as BoardForgeManifest | BoardForgeDashboardCard | undefined)?.syncStatus || (dashboardVisible ? 'synced' : 'not_synced'),
    userApprovalRequired: projectState !== 'dashboard_published',
    approvalHistory: publish?.approvalHistory || [],
  }
}

export function isDashboardPublished(project: BoardForgeManifest | BoardForgeDashboardCard): boolean {
  return normalizePublishState(project).projectState === 'dashboard_published'
}

export function filterDashboardPublishedProjects<T extends BoardForgeManifest | BoardForgeDashboardCard>(projects: T[]): T[] {
  return projects.filter((project) => isDashboardPublished(project))
}

export function filterLocalDraftProjects<T extends BoardForgeManifest | BoardForgeDashboardCard>(projects: T[]): T[] {
  return projects.filter((project) => !isDashboardPublished(project))
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

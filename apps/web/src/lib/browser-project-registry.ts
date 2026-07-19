import type { BoardForgeBrowserDraft, BoardForgeDashboardCard, BoardForgeDashboardData } from './boardforge-manifest'

const key = 'boardforge.browser-projects.v1'
const libraryMetadataKey = 'boardforge.browser-project-library.v1'
const activityKey = 'boardforge.browser-project-activity.v1'

/**
 * Personal library organization is intentionally stored separately from a
 * project record. It is browser-local UI state, never helper/KiCad state.
 */
export type BrowserProjectLibraryMetadata = Record<string, {
  favorite?: true
  archived?: true
  updatedAt: string
}>

/**
 * A small, deliberately browser-only audit trail. These events describe
 * changes to the registry record, not KiCad work, validation, or releases.
 */
export type BrowserProjectActivity = {
  id: string
  action: 'created' | 'renamed'
  at: string
  detail?: string
}

export type BrowserProjectActivityRegistry = Record<string, BrowserProjectActivity[]>

export function readBrowserProjectLibraryMetadata(): BrowserProjectLibraryMetadata {
  if (typeof window === 'undefined') return {}
  try {
    const stored = JSON.parse(window.localStorage.getItem(libraryMetadataKey) || '{}')
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored as BrowserProjectLibraryMetadata : {}
  } catch { return {} }
}

export function saveBrowserProjectLibraryMetadata(projectId: string, changes: { favorite?: boolean; archived?: boolean }) {
  if (typeof window === 'undefined') return
  const current = readBrowserProjectLibraryMetadata()
  const next = { ...current[projectId], ...toMetadata(changes), updatedAt: new Date().toISOString() }
  if (!next.favorite && !next.archived) {
    delete current[projectId]
  } else {
    current[projectId] = next
  }
  window.localStorage.setItem(libraryMetadataKey, JSON.stringify(current))
}
export function readBrowserProjects(): BoardForgeDashboardData {
  if (typeof window === 'undefined') return empty()
  try { const projects = JSON.parse(window.localStorage.getItem(key) || '[]') as BoardForgeDashboardCard[]; return { ...empty(), projects, summary: summary(projects) } } catch { return empty() }
}
export function saveBrowserProject(project: BoardForgeDashboardCard) {
  const existing = readBrowserProjects().projects.find((item) => item.projectId === project.projectId)
  const current = readBrowserProjects().projects.filter((item) => item.projectId !== project.projectId)
  window.localStorage.setItem(key, JSON.stringify([project, ...current]))
  if (!existing) recordBrowserProjectActivity(project.projectId, 'created')
}

export function readBrowserProjectActivity(projectId: string): BrowserProjectActivity[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = JSON.parse(window.localStorage.getItem(activityKey) || '{}')
    const entries = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored[projectId] : []
    return Array.isArray(entries) ? entries.filter(isActivity).sort((left, right) => right.at.localeCompare(left.at)) : []
  } catch { return [] }
}

/** Only records events for a project currently owned by this browser registry. */
export function recordBrowserProjectActivity(projectId: string, action: BrowserProjectActivity['action'], detail?: string) {
  if (typeof window === 'undefined' || !readBrowserProjects().projects.some((project) => project.projectId === projectId)) return
  let registry: BrowserProjectActivityRegistry = {}
  try {
    const stored = JSON.parse(window.localStorage.getItem(activityKey) || '{}')
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) registry = stored as BrowserProjectActivityRegistry
  } catch { /* Replace corrupt browser-only activity storage below. */ }
  const entry: BrowserProjectActivity = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, action, at: new Date().toISOString(), ...(detail ? { detail } : {}) }
  registry[projectId] = [entry, ...(Array.isArray(registry[projectId]) ? registry[projectId].filter(isActivity) : [])].slice(0, 50)
  window.localStorage.setItem(activityKey, JSON.stringify(registry))
}

/** Browser project records are deliberately the only records this module can mutate. */
export function removeBrowserProject(projectId: string) {
  if (typeof window === 'undefined') return
  const current = readBrowserProjects().projects.filter((item) => item.projectId !== projectId)
  window.localStorage.setItem(key, JSON.stringify(current))
  const metadata = readBrowserProjectLibraryMetadata()
  if (metadata[projectId]) {
    delete metadata[projectId]
    window.localStorage.setItem(libraryMetadataKey, JSON.stringify(metadata))
  }
  try {
    const activity = JSON.parse(window.localStorage.getItem(activityKey) || '{}')
    if (activity && typeof activity === 'object' && !Array.isArray(activity) && activity[projectId]) {
      delete activity[projectId]
      window.localStorage.setItem(activityKey, JSON.stringify(activity))
    }
  } catch { /* The removed project has no readable browser activity to clean up. */ }
}
export function createBrowserProject({ projectId, projectName, prompt, kind = 'browser_board', browserDraft }: { projectId: string; projectName: string; prompt: string; kind?: 'browser_board' | 'browser_outline' | 'browser_import'; browserDraft?: BoardForgeBrowserDraft }): BoardForgeDashboardCard {
  const isOutline = kind === 'browser_outline'
  return {
    schema: 'boardforge.project-dashboard-card.v1', projectId, projectName,
    status: isOutline ? 'BROWSER_OUTLINE_DRAFT' : kind === 'browser_import' ? 'BROWSER_IMPORTED_DRAFT' : 'BROWSER_BOARD_DRAFT',
    boardPath: null, schematicPath: null, readiness: 'review', routingCompletionPercent: 0,
    validation: { shorts: null, unconnected: null, forbiddenVias: null, drcViolations: null, ercViolations: null },
    manufacturing: { ready: false, zip: null, blockedReason: 'Browser project requires KiCad validation before release.' },
    reports: { browserDraft: prompt }, replayCommand: null,
    criticalBlockers: [{ code: 'browser_validation_not_run', count: 1, severity: 'review' }],
    nextAction: 'Continue editing in BoardForge, then pair the desktop helper to create and validate KiCad files.',
    sourceManifest: null, honestyBadges: ['Browser draft', 'Validation not run'],
    projectState: 'local_draft', publishApproved: false, dashboardVisible: true, syncStatus: 'browser_saved', localOnly: true,
    browserDraft,
  }
}
function empty(): BoardForgeDashboardData { return { schema: 'boardforge.project-dashboard-data.v1', generatedAt: new Date().toISOString(), projects: [], summary: { totalProjects: 0, manufacturingReady: 0, blocked: 0, review: 0, needsRouting: 0, cleanDrcErc: 0 } } }
function summary(projects: BoardForgeDashboardCard[]) { return { totalProjects: projects.length, manufacturingReady: projects.filter((p) => p.manufacturing.ready).length, blocked: projects.filter((p) => p.readiness === 'blocked').length, review: projects.filter((p) => p.readiness === 'review').length, needsRouting: projects.filter((p) => p.routingCompletionPercent < 100).length, cleanDrcErc: projects.filter((p) => p.validation.drcViolations === 0 && p.validation.ercViolations === 0).length } }

function toMetadata(changes: { favorite?: boolean; archived?: boolean }) {
  return Object.fromEntries(Object.entries(changes).map(([key, value]) => [key, value ? true : undefined])) as { favorite?: true; archived?: true }
}

function isActivity(value: unknown): value is BrowserProjectActivity {
  if (!value || typeof value !== 'object') return false
  const event = value as Partial<BrowserProjectActivity>
  return typeof event.id === 'string' && (event.action === 'created' || event.action === 'renamed') && typeof event.at === 'string' && (!event.detail || typeof event.detail === 'string')
}

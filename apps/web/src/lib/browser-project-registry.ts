import type { BoardForgeBrowserDraft, BoardForgeDashboardCard, BoardForgeDashboardData } from './boardforge-manifest'

const key = 'boardforge.browser-projects.v1'
const libraryMetadataKey = 'boardforge.browser-project-library.v1'

/**
 * Personal library organization is intentionally stored separately from a
 * project record. It is browser-local UI state, never helper/KiCad state.
 */
export type BrowserProjectLibraryMetadata = Record<string, {
  favorite?: true
  archived?: true
  updatedAt: string
}>

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
  const current = readBrowserProjects().projects.filter((item) => item.projectId !== project.projectId)
  window.localStorage.setItem(key, JSON.stringify([project, ...current]))
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

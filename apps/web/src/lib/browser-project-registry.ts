import type { BoardForgeBrowserDraft, BoardForgeDashboardCard, BoardForgeDashboardData } from './boardforge-manifest'
import type { BrowserPcbSnapshotV1 } from './pcb-editor/model'

const key = 'boardforge.browser-projects.v1'
const libraryMetadataKey = 'boardforge.browser-project-library.v1'
const activityKey = 'boardforge.browser-project-activity.v1'

/**
 * Portable browser-workspace data is deliberately narrower than a dashboard
 * card. It carries only browser-authored drafts; helper paths, KiCad evidence,
 * validation and release state are never trusted on import.
 */
export type BrowserWorkspaceExport = {
  schema: 'boardforge.browser-workspace-export.v1'
  exportedAt: string
  projects: BoardForgeDashboardCard[]
}

/** A portable export of exactly one browser-owned project and its draft data. */
export type BrowserProjectExport = {
  schema: 'boardforge.browser-project-export.v1'
  exportedAt: string
  project: BoardForgeDashboardCard
}

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
  action: 'created' | 'duplicated' | 'renamed' | 'exported' | 'pcb_snapshot_saved' | 'outline_saved' | 'schematic_plan_saved'
  at: string
  detail?: string
}

export type BrowserProjectActivityRegistry = Record<string, BrowserProjectActivity[]>

const browserWorkspaceExportSchema = 'boardforge.browser-workspace-export.v1'
const browserProjectExportSchema = 'boardforge.browser-project-export.v1'
const maxImportedProjects = 500

export type BrowserWorkspaceImportPreview = {
  projects: BoardForgeDashboardCard[]
  ignored: number
  warnings: string[]
}

export type BrowserWorkspaceMergeResult = {
  added: number
  updated: number
  ignored: number
  warnings: string[]
}

/**
 * `kind` predates projects that can hold more than one browser workspace.
 * Treat it as a compact legacy label only; the presence of an artifact is the
 * authoritative answer to whether it can be opened.
 */
export type BrowserDraftArtifact = 'pcb' | 'outline' | 'schematicPlan'

export function hasBrowserDraftArtifact(draft: BoardForgeBrowserDraft | undefined, artifact: BrowserDraftArtifact) {
  return artifact === 'pcb' ? Boolean(draft?.pcb)
    : artifact === 'outline' ? Boolean(draft?.outline)
      : Boolean(draft?.schematicPlan)
}

export function browserDraftArtifacts(draft: BoardForgeBrowserDraft | undefined): BrowserDraftArtifact[] {
  return (['pcb', 'outline', 'schematicPlan'] as const).filter((artifact) => hasBrowserDraftArtifact(draft, artifact))
}

/** Preserve unrelated browser artifacts whenever one workspace saves. */
export function mergeBrowserDraft(existing: BoardForgeBrowserDraft | undefined, update: BoardForgeBrowserDraft): BoardForgeBrowserDraft {
  const merged = { ...existing, ...update, schema: 'boardforge.browser-draft.v1' as const }
  const artifacts = browserDraftArtifacts(merged)
  return {
    ...merged,
    // A multi-artifact project deliberately has no exclusive editor kind.
    kind: artifacts.length === 1 && artifacts[0] === 'pcb' ? 'pcb'
      : artifacts.length === 1 && artifacts[0] === 'outline' ? 'outline'
        : 'board',
  }
}

export function browserDraftProjectStatus(draft: BoardForgeBrowserDraft | undefined, fallback = 'BROWSER_BOARD_DRAFT') {
  const artifacts = browserDraftArtifacts(draft)
  if (artifacts.length !== 1) return fallback
  return artifacts[0] === 'pcb' ? 'BROWSER_PCB_DRAFT'
    : artifacts[0] === 'outline' ? 'BROWSER_OUTLINE_DRAFT'
      : fallback
}

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

/** Produces a portable snapshot of browser-owned projects only. */
export function exportBrowserWorkspace(): BrowserWorkspaceExport {
  return {
    schema: 'boardforge.browser-workspace-export.v1',
    exportedAt: new Date().toISOString(),
    projects: readBrowserProjects().projects.filter((project) => project.localOnly === true),
  }
}

/**
 * Produce a portable record for one browser-local project. This deliberately
 * passes through the same reconstruction boundary as import/duplication, so
 * a corrupted local record cannot export helper paths, validation, release,
 * manufacturing, or publishing claims. Text values receive a final path
 * redaction pass because browser-authored notes can contain pasted file paths.
 */
export function exportBrowserProject(projectId: string): BrowserProjectExport | null {
  if (typeof window === 'undefined') return null
  const source = readBrowserProjects().projects.find((project) => project.projectId === projectId)
  const project = source ? normalizeImportedBrowserProject(source) : null
  if (!project) return null
  return {
    schema: browserProjectExportSchema,
    exportedAt: new Date().toISOString(),
    project: redactExportedBrowserText(project),
  }
}

export function saveBrowserProject(project: BoardForgeDashboardCard) {
  const existing = readBrowserProjects().projects.find((item) => item.projectId === project.projectId)
  const current = readBrowserProjects().projects.filter((item) => item.projectId !== project.projectId)
  const browserDraft = project.browserDraft ? mergeBrowserDraft(existing?.browserDraft, project.browserDraft) : existing?.browserDraft
  const normalized = browserDraft ? {
    ...project,
    ...(browserDraft ? { browserDraft } : {}),
    reports: { ...existing?.reports, ...project.reports, browserDraft: browserDraft.summary },
    ...(project.localOnly || existing?.localOnly ? { status: browserDraftProjectStatus(browserDraft, project.status) } : {}),
  } : project
  window.localStorage.setItem(key, JSON.stringify([normalized, ...current]))
  if (!existing) recordBrowserProjectActivity(project.projectId, 'created')
}

/**
 * Create a separate browser-owned copy of a saved browser project.  This is
 * intentionally not a generic dashboard-card clone: paired-helper records
 * are not eligible, and every KiCad, validation, release, and helper field is
 * rebuilt through createBrowserProject rather than carried into the copy.
 */
export function duplicateBrowserProject(projectId: string): BoardForgeDashboardCard | null {
  if (typeof window === 'undefined') return null
  const source = readBrowserProjects().projects.find((project) => project.projectId === projectId)
  if (!source || source.localOnly !== true) return null

  // Reuse the import boundary as a defensive parser. It also means corrupt
  // localStorage cannot turn a duplicate into a carrier for helper metadata.
  const normalized = normalizeImportedBrowserProject(source)
  if (!normalized) return null
  const browserDraft = normalized.browserDraft ? cloneBrowserDraft(normalized.browserDraft) : undefined
  const copy = createBrowserProject({
    projectId: nextBrowserProjectId(),
    projectName: nextCopyName(normalized.projectName),
    prompt: browserDraft?.summary || normalized.reports.browserDraft || 'Copied browser workspace. KiCad validation has not run.',
    kind: browserDraft?.kind === 'outline' ? 'browser_outline' : browserDraft?.kind === 'pcb' ? 'browser_pcb' : browserDraft?.kind === 'import' ? 'browser_import' : 'browser_board',
    ...(browserDraft ? { browserDraft } : {}),
  })
  saveBrowserProject(copy)
  recordBrowserProjectActivity(copy.projectId, 'duplicated', `Copied from ${normalized.projectName} in this browser`)
  return copy
}

/**
 * Validate a portable browser-workspace export before it can reach storage.
 * Import is deliberately a one-way normalization boundary: helper paths,
 * validation results, release state, and account/publish state are discarded.
 */
export function previewBrowserWorkspaceImport(value: unknown): BrowserWorkspaceImportPreview {
  if (!isRecord(value) || value.schema !== browserWorkspaceExportSchema) {
    throw new Error('Choose a BoardForge browser workspace export (.json) created by this Settings page.')
  }
  if (!Array.isArray(value.projects)) {
    throw new Error('This browser workspace export is missing its project list.')
  }
  if (value.projects.length > maxImportedProjects) {
    throw new Error(`This export contains more than ${maxImportedProjects} projects. Split it into smaller exports before importing.`)
  }

  const projects: BoardForgeDashboardCard[] = []
  const warnings: string[] = []
  const seen = new Set<string>()
  for (const [index, rawProject] of value.projects.entries()) {
    const project = normalizeImportedBrowserProject(rawProject)
    if (!project) {
      warnings.push(`Project ${index + 1} was skipped because it is not a valid browser-local BoardForge project.`)
      continue
    }
    if (seen.has(project.projectId)) {
      warnings.push(`Project “${project.projectName}” was skipped because this export repeats its project ID.`)
      continue
    }
    seen.add(project.projectId)
    projects.push(project)
  }
  if (!projects.length && value.projects.length) {
    throw new Error('No importable browser-local projects were found. Helper-backed projects and invalid records are never imported here.')
  }
  return { projects, ignored: value.projects.length - projects.length, warnings }
}

/** Merge only normalized browser-local records; paired helper records are never read or changed. */
export function mergeBrowserWorkspaceImport(value: unknown): BrowserWorkspaceMergeResult {
  if (typeof window === 'undefined') throw new Error('Browser workspace import is only available in a browser session.')
  const preview = previewBrowserWorkspaceImport(value)
  const existing = new Set(readBrowserProjects().projects.map((project) => project.projectId))
  let added = 0
  let updated = 0
  for (const project of preview.projects) {
    if (existing.has(project.projectId)) updated += 1
    else added += 1
    saveBrowserProject(project)
  }
  return { added, updated, ignored: preview.ignored, warnings: preview.warnings }
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
export function createBrowserProject({ projectId, projectName, prompt, kind = 'browser_board', browserDraft }: { projectId: string; projectName: string; prompt: string; kind?: 'browser_board' | 'browser_outline' | 'browser_import' | 'browser_pcb'; browserDraft?: BoardForgeBrowserDraft }): BoardForgeDashboardCard {
  const isOutline = kind === 'browser_outline'
  return {
    schema: 'boardforge.project-dashboard-card.v1', projectId, projectName,
    status: isOutline ? 'BROWSER_OUTLINE_DRAFT' : kind === 'browser_import' ? 'BROWSER_IMPORTED_DRAFT' : kind === 'browser_pcb' ? 'BROWSER_PCB_DRAFT' : 'BROWSER_BOARD_DRAFT',
    boardPath: null, schematicPath: null, readiness: 'review', routingCompletionPercent: 0,
    validation: { shorts: null, unconnected: null, forbiddenVias: null, drcViolations: null, ercViolations: null },
    manufacturing: { ready: false, zip: null, blockedReason: 'Browser project requires KiCad validation before release.' },
    reports: { browserDraft: prompt }, replayCommand: null,
    criticalBlockers: [{ code: 'browser_validation_not_run', count: 1, severity: 'review' }],
    nextAction: 'Continue editing in BoardForge, then pair the desktop helper to create and validate KiCad files.',
    sourceManifest: null, honestyBadges: ['Browser draft', 'Validation not run'],
    projectState: 'local_draft', publishApproved: false, dashboardVisible: true, syncStatus: 'browser_saved', localOnly: true,
    ...(browserDraft ? { browserDraft } : {}),
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
  return typeof event.id === 'string' && (
    event.action === 'created' ||
    event.action === 'duplicated' ||
    event.action === 'renamed' ||
    event.action === 'exported' ||
    event.action === 'pcb_snapshot_saved' ||
    event.action === 'outline_saved' ||
    event.action === 'schematic_plan_saved'
  ) && typeof event.at === 'string' && (!event.detail || typeof event.detail === 'string')
}

function normalizeImportedBrowserProject(value: unknown): BoardForgeDashboardCard | null {
  if (!isRecord(value) || value.schema !== 'boardforge.project-dashboard-card.v1' || value.localOnly !== true) return null
  if (!isProjectId(value.projectId) || !isNonBlankString(value.projectName, 160)) return null
  const browserDraft = value.browserDraft === undefined ? undefined : parseBrowserDraft(value.browserDraft)
  if (value.browserDraft !== undefined && !browserDraft) return null
  const prompt = isRecord(value.reports) && isNonBlankString(value.reports.browserDraft, 2_000)
    ? value.reports.browserDraft
    : browserDraft?.summary || 'Imported browser workspace. KiCad validation has not run.'
  return createBrowserProject({
    projectId: value.projectId,
    projectName: value.projectName.trim(),
    prompt,
    kind: browserDraft?.kind === 'outline' ? 'browser_outline' : browserDraft?.kind === 'pcb' ? 'browser_pcb' : browserDraft?.kind === 'import' ? 'browser_import' : 'browser_board',
    browserDraft: browserDraft ?? undefined,
  })
}

function parseBrowserDraft(value: unknown): BoardForgeBrowserDraft | null {
  if (!isRecord(value) || value.schema !== 'boardforge.browser-draft.v1' || !isNonBlankString(value.updatedAt, 80) || !isNonBlankString(value.summary, 2_000)) return null
  if (value.kind !== 'board' && value.kind !== 'outline' && value.kind !== 'import' && value.kind !== 'pcb') return null
  const outline = value.outline === undefined ? undefined : parseOutlineDraft(value.outline)
  const pcb = value.pcb === undefined ? undefined : parsePcbSnapshot(value.pcb)
  const schematicPlan = value.schematicPlan === undefined ? undefined : parseSchematicPlan(value.schematicPlan)
  if ((value.outline !== undefined && !outline) || (value.pcb !== undefined && !pcb) || (value.schematicPlan !== undefined && !schematicPlan)) return null
  return { schema: 'boardforge.browser-draft.v1', kind: value.kind, updatedAt: value.updatedAt, summary: value.summary, ...(outline ? { outline } : {}), ...(pcb ? { pcb } : {}), ...(schematicPlan ? { schematicPlan } : {}) }
}

function parseOutlineDraft(value: unknown): NonNullable<BoardForgeBrowserDraft['outline']> | null {
  if (!isRecord(value) || !isNonBlankString(value.preset, 160) || typeof value.closed !== 'boolean' || !Array.isArray(value.pointsMm) || !Array.isArray(value.mountingHolesMm) || !isRecord(value.browserValidation)) return null
  if (value.pointsMm.length > 10_000 || value.mountingHolesMm.length > 1_000) return null
  if (!value.pointsMm.every((point) => isRecord(point) && isFiniteNumber(point.x) && isFiniteNumber(point.y))) return null
  if (!value.mountingHolesMm.every((hole) => isRecord(hole) && isNonBlankString(hole.ref, 160) && isFiniteNumber(hole.x) && isFiniteNumber(hole.y) && isFiniteNumber(hole.diameterMm) && isFiniteNumber(hole.keepoutMm) && (hole.plating === 'plated' || hole.plating === 'non-plated') && typeof hole.locked === 'boolean')) return null
  const validation = value.browserValidation
  if ((validation.status !== 'valid' && validation.status !== 'blocked') || !isFiniteNumber(validation.routeabilityScore) || !['Low', 'Medium', 'High', 'Blocked'].includes(String(validation.risk)) || !Array.isArray(validation.blockers) || validation.blockers.length > 500 || !validation.blockers.every((blocker) => isNonBlankString(blocker, 500))) return null
  return value as NonNullable<BoardForgeBrowserDraft['outline']>
}

function parsePcbSnapshot(value: unknown): BrowserPcbSnapshotV1 | null {
  if (!isRecord(value) || value.schema !== 'boardforge.browser-pcb-snapshot/v1' || !isNonBlankString(value.savedAt, 80) || !isNonBlankString(value.sandboxSource, 4_000_000) || !Array.isArray(value.transactions) || value.transactions.length > 5_000) return null
  if (!isBrowserPcbDocument(value.document)) return null
  return value as unknown as BrowserPcbSnapshotV1
}

function parseSchematicPlan(value: unknown): NonNullable<BoardForgeBrowserDraft['schematicPlan']> | null {
  if (!isRecord(value) || value.schema !== 'boardforge.browser-schematic-plan.v1' || value.version !== 1 || !isNonBlankString(value.title, 300) || !isNonBlankString(value.updatedAt, 80) || typeof value.notes !== 'string' || value.notes.length > 20_000 || !Array.isArray(value.components) || !Array.isArray(value.connections) || value.components.length > 1_000 || value.connections.length > 5_000) return null
  if (!value.components.every((component) => isRecord(component) && isNonBlankString(component.id, 160) && isNonBlankString(component.reference, 160) && typeof component.value === 'string' && component.value.length <= 1_000 && typeof component.notes === 'string' && component.notes.length <= 5_000)) return null
  if (!value.connections.every((connection) => isRecord(connection) && isNonBlankString(connection.id, 160) && isNonBlankString(connection.fromComponentId, 160) && isNonBlankString(connection.toComponentId, 160) && typeof connection.netName === 'string' && connection.netName.length <= 300)) return null
  return value as NonNullable<BoardForgeBrowserDraft['schematicPlan']>
}

/** Browser drafts contain plain persisted data; JSON cloning prevents callers
 * from sharing mutable nested outline, PCB, or schematic records. */
function cloneBrowserDraft(draft: BoardForgeBrowserDraft): BoardForgeBrowserDraft {
  return JSON.parse(JSON.stringify(draft)) as BoardForgeBrowserDraft
}

/** Remove local absolute/UNC paths from browser-authored free text without
 * changing the export's structured browser-draft data model. */
function redactExportedBrowserText(project: BoardForgeDashboardCard): BoardForgeDashboardCard {
  const clone = JSON.parse(JSON.stringify(project)) as BoardForgeDashboardCard
  const redact = (value: unknown): unknown => {
    if (typeof value === 'string') return value
      .replace(/(?:[A-Za-z]:[\\/]|\\\\)[^\s"'`<>()[\]{}]+/g, '[local path]')
      .replace(/(?:file:\/\/)?\/(?:Users|home|tmp|var|private|etc|mnt|Volumes)\/[^\s"'`<>()[\]{}]+/gi, '[local path]')
    if (Array.isArray(value)) return value.map(redact)
    if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item)]))
    return value
  }
  return redact(clone) as BoardForgeDashboardCard
}

function nextBrowserProjectId() {
  const suffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `browser-copy-${suffix}`
}

function nextCopyName(projectName: string) {
  const existing = new Set(readBrowserProjects().projects.map((project) => project.projectName.trim().toLocaleLowerCase()))
  const base = `Copy of ${projectName}`.slice(0, 160)
  if (!existing.has(base.toLocaleLowerCase())) return base
  for (let index = 2; index < 10_000; index += 1) {
    const suffix = ` (${index})`
    const candidate = `${base.slice(0, 160 - suffix.length)}${suffix}`
    if (!existing.has(candidate.toLocaleLowerCase())) return candidate
  }
  return `${base.slice(0, 145)} ${Date.now()}`
}

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }
function isFiniteNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) }
function isNonBlankString(value: unknown, maxLength: number): value is string { return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength }
function isProjectId(value: unknown): value is string { return isNonBlankString(value, 128) && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value) }
function isBrowserPcbDocument(value: unknown) {
  if (!isRecord(value) || value.schema !== 'boardforge.pcb-view/v1' || !isNonBlankString(value.documentId, 200) || !Number.isInteger(value.revision) || !isNonBlankString(value.sourceSha256, 200) || value.units !== 'mm' || !isNonBlankString(value.title, 500) || !isRecord(value.bounds) || !isRecord(value.bounds.min) || !isRecord(value.bounds.max) || !isFiniteNumber(value.bounds.min.x) || !isFiniteNumber(value.bounds.min.y) || !isFiniteNumber(value.bounds.max.x) || !isFiniteNumber(value.bounds.max.y) || !isFiniteNumber(value.unconnectedCount) || !isFiniteNumber(value.unsupportedCount)) return false
  return ['layers', 'footprints', 'tracks', 'vias', 'graphics', 'ratsnest', 'violations'].every((field) => Array.isArray(value[field]))
}

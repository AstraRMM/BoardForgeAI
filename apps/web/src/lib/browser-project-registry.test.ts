import assert from 'node:assert/strict'
import test from 'node:test'
// Node's built-in TypeScript runner needs the source extension; Next's bundler does not load this test module.
// @ts-expect-error -- TypeScript source import is supported by node --experimental-strip-types.
import { browserDraftArtifacts, createBrowserProject, duplicateBrowserProject, exportBrowserWorkspace, hasBrowserDraftArtifact, mergeBrowserWorkspaceImport, previewBrowserWorkspaceImport, readBrowserProjectActivity, readBrowserProjectLibraryMetadata, readBrowserProjects, recordBrowserProjectActivity, removeBrowserProject, saveBrowserProject, saveBrowserProjectLibraryMetadata } from './browser-project-registry.ts'

const registryKey = 'boardforge.browser-projects.v1'

class MemoryStorage {
  private values = new Map<string, string>()

  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

function inBrowser(run: (storage: MemoryStorage) => void) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const storage = new MemoryStorage()
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } })
  try { run(storage) } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous)
    else Reflect.deleteProperty(globalThis, 'window')
  }
}

test('browser project records remain explicitly local-only and unvalidated', () => inBrowser(() => {
  const project = createBrowserProject({ projectId: 'browser-safety', projectName: 'Browser safety', prompt: 'A browser-only board request.' })

  assert.deepEqual(project.validation, { shorts: null, unconnected: null, forbiddenVias: null, drcViolations: null, ercViolations: null })
  assert.deepEqual(project.manufacturing, { ready: false, zip: null, blockedReason: 'Browser project requires KiCad validation before release.' })
  assert.equal(project.localOnly, true)
  assert.equal(project.readiness, 'review')
  assert.equal(project.publishApproved, false)
  assert.equal(project.boardPath, null)
  assert.equal(project.schematicPath, null)
  assert.equal(project.sourceManifest, null)
  assert.equal(project.status, 'BROWSER_BOARD_DRAFT')
}))

test('browser PCB snapshots are retained as browser-only project data without validation claims', () => inBrowser(() => {
  const snapshot = {
    schema: 'boardforge.browser-pcb-snapshot/v1' as const,
    savedAt: '2026-07-19T00:00:00.000Z',
    sandboxSource: '(kicad_pcb (version 20240108))',
    document: { schema: 'boardforge.pcb-view/v1' as const, documentId: 'pcb-draft', revision: 4, sourceSha256: 'snapshot-sha', units: 'mm' as const, title: 'Saved PCB', bounds: { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } }, layers: [], footprints: [], tracks: [], vias: [], graphics: [], ratsnest: [], unconnectedCount: 0, violations: [], unsupportedCount: 0 },
    transactions: [],
  }
  const project = createBrowserProject({ projectId: 'browser-pcb', projectName: 'Saved PCB', prompt: 'Browser PCB draft.', kind: 'browser_pcb', browserDraft: { schema: 'boardforge.browser-draft.v1', kind: 'pcb', updatedAt: snapshot.savedAt, summary: 'Browser PCB snapshot. KiCad validation not run.', pcb: snapshot } })
  saveBrowserProject(project)
  recordBrowserProjectActivity(project.projectId, 'pcb_snapshot_saved', '0 footprints, 0 tracks, 0 vias')
  const saved = readBrowserProjects().projects[0]

  assert.equal(saved.status, 'BROWSER_PCB_DRAFT')
  assert.equal(saved.localOnly, true)
  assert.equal(saved.validation.drcViolations, null)
  assert.equal(saved.browserDraft?.kind, 'pcb')
  assert.equal(saved.browserDraft?.pcb?.sandboxSource, snapshot.sandboxSource)
  assert.equal(saved.browserDraft?.pcb?.document.sourceSha256, snapshot.document.sourceSha256)
  assert.deepEqual(readBrowserProjectActivity(project.projectId).map((event) => event.action).sort(), ['created', 'pcb_snapshot_saved'])
  assert.equal(readBrowserProjectActivity(project.projectId).find((event) => event.action === 'pcb_snapshot_saved')?.detail, '0 footprints, 0 tracks, 0 vias')
}))

test('saving a browser record upserts it and removal only changes browser storage', () => inBrowser((storage) => {
  const first = createBrowserProject({ projectId: 'browser-rename', projectName: 'Original name', prompt: 'Original.' })
  const retained = createBrowserProject({ projectId: 'browser-retained', projectName: 'Retained draft', prompt: 'Retain.' })
  saveBrowserProject(first)
  saveBrowserProject(retained)
  saveBrowserProject({ ...first, projectName: 'Renamed browser draft' })

  assert.equal(readBrowserProjects().projects.length, 2)
  assert.equal(readBrowserProjects().projects.find((project) => project.projectId === first.projectId)?.projectName, 'Renamed browser draft')
  removeBrowserProject(first.projectId)

  assert.deepEqual(readBrowserProjects().projects.map((project) => project.projectId), [retained.projectId])
  assert.equal(JSON.parse(storage.getItem(registryKey) || '[]')[0].localOnly, true)
}))

test('browser registry ignores corrupt local storage rather than inventing project evidence', () => inBrowser((storage) => {
  storage.setItem(registryKey, '{not valid json')
  const data = readBrowserProjects()

  assert.deepEqual(data.projects, [])
  assert.deepEqual(data.summary, { totalProjects: 0, manufacturingReady: 0, blocked: 0, review: 0, needsRouting: 0, cleanDrcErc: 0 })
}))

test('favorites and archive state are browser-only library metadata', () => inBrowser(() => {
  const project = createBrowserProject({ projectId: 'browser-organize', projectName: 'Organize me', prompt: 'A browser draft.' })
  saveBrowserProject(project)
  saveBrowserProjectLibraryMetadata(project.projectId, { favorite: true, archived: true })
  assert.deepEqual(readBrowserProjectLibraryMetadata()[project.projectId] && { favorite: true, archived: true }, { favorite: true, archived: true })
  removeBrowserProject(project.projectId)
  assert.equal(readBrowserProjectLibraryMetadata()[project.projectId], undefined)
}))

test('browser activity records only actual browser project actions and is deleted with its draft', () => inBrowser(() => {
  const project = createBrowserProject({ projectId: 'browser-history', projectName: 'History draft', prompt: 'A browser draft.' })
  saveBrowserProject(project)
  recordBrowserProjectActivity(project.projectId, 'renamed', 'Renamed history draft')
  recordBrowserProjectActivity('not-a-browser-project', 'renamed', 'Must not be retained')

  assert.deepEqual(readBrowserProjectActivity(project.projectId).map((event) => event.action).sort(), ['created', 'renamed'])
  assert.equal(readBrowserProjectActivity(project.projectId).find((event) => event.action === 'renamed')?.detail, 'Renamed history draft')
  assert.deepEqual(readBrowserProjectActivity('not-a-browser-project'), [])
  removeBrowserProject(project.projectId)
  assert.deepEqual(readBrowserProjectActivity(project.projectId), [])
}))

test('browser schematic plans persist as browser-only intent without KiCad evidence', () => inBrowser(() => {
  const project = createBrowserProject({ projectId: 'browser-schematic-plan', projectName: 'Planning draft', prompt: 'Plan a power path.' })
  const schematicPlan = {
    schema: 'boardforge.browser-schematic-plan.v1' as const,
    version: 1 as const,
    title: 'Power concept', updatedAt: '2026-07-19T00:00:00.000Z', notes: 'Review with KiCad candidate.',
    components: [{ id: 'u1', reference: 'U1', value: 'Regulator', notes: '' }],
    connections: [],
  }
  saveBrowserProject({ ...project, browserDraft: { schema: 'boardforge.browser-draft.v1', kind: 'board', updatedAt: schematicPlan.updatedAt, summary: 'Browser-only schematic planning.', schematicPlan } })
  recordBrowserProjectActivity(project.projectId, 'schematic_plan_saved', '1 components, 0 planned nets')

  const saved = readBrowserProjects().projects.find((entry) => entry.projectId === project.projectId)
  assert.equal(saved?.browserDraft?.schematicPlan?.title, 'Power concept')
  assert.equal(saved?.schematicPath, null)
  assert.equal(saved?.validation.ercViolations, null)
  assert.equal(readBrowserProjectActivity(project.projectId).some((event) => event.action === 'schematic_plan_saved'), true)
}))

test('saving PCB, outline, and schematic browser work preserves every artifact on one project', () => inBrowser(() => {
  const project = createBrowserProject({ projectId: 'browser-multi-artifact', projectName: 'Multi-artifact draft', prompt: 'Keep every browser workspace.' })
  const updatedAt = '2026-07-19T00:00:00.000Z'
  const outline = {
    preset: 'rounded-rectangle', closed: true, pointsMm: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], mountingHolesMm: [],
    browserValidation: { status: 'valid' as const, routeabilityScore: 80, risk: 'Low' as const, blockers: [] },
  }
  const pcb = {
    schema: 'boardforge.browser-pcb-snapshot/v1' as const, savedAt: updatedAt, sandboxSource: '(kicad_pcb (version 20240108))', transactions: [],
    document: { schema: 'boardforge.pcb-view/v1' as const, documentId: 'multi', revision: 1, sourceSha256: 'multi-sha', units: 'mm' as const, title: 'Multi', bounds: { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } }, layers: [], footprints: [], tracks: [], vias: [], graphics: [], ratsnest: [], unconnectedCount: 0, violations: [], unsupportedCount: 0 },
  }
  const schematicPlan = { schema: 'boardforge.browser-schematic-plan.v1' as const, version: 1 as const, title: 'Multi plan', updatedAt, notes: '', components: [], connections: [] }

  saveBrowserProject({ ...project, browserDraft: { schema: 'boardforge.browser-draft.v1', kind: 'outline', updatedAt, summary: 'Outline only.', outline } })
  saveBrowserProject({ ...project, browserDraft: { schema: 'boardforge.browser-draft.v1', kind: 'pcb', updatedAt, summary: 'PCB only.', pcb } })
  saveBrowserProject({ ...project, browserDraft: { schema: 'boardforge.browser-draft.v1', kind: 'board', updatedAt, summary: 'Schematic only.', schematicPlan } })

  const saved = readBrowserProjects().projects[0]
  assert.deepEqual(browserDraftArtifacts(saved.browserDraft).sort(), ['outline', 'pcb', 'schematicPlan'])
  assert.equal(hasBrowserDraftArtifact(saved.browserDraft, 'pcb'), true)
  assert.equal(hasBrowserDraftArtifact(saved.browserDraft, 'outline'), true)
  assert.equal(hasBrowserDraftArtifact(saved.browserDraft, 'schematicPlan'), true)
  assert.equal(saved.browserDraft?.kind, 'board')
  // Reopening goes through the persisted project record, not an editor-local cache.
  assert.equal(saved.browserDraft?.pcb?.document.sourceSha256, 'multi-sha')
  assert.equal(saved.browserDraft?.schematicPlan?.title, 'Multi plan')
  assert.equal(saved.status, 'BROWSER_BOARD_DRAFT')
  assert.equal(saved.boardPath, null)
  assert.equal(saved.schematicPath, null)
  assert.equal(saved.sourceManifest, null)
  assert.equal(saved.validation.drcViolations, null)
  assert.equal(saved.validation.ercViolations, null)
  assert.equal(saved.manufacturing.ready, false)
}))

test('browser outline saves are retained as local editor activity without manufacturing claims', () => inBrowser(() => {
  const project = createBrowserProject({ projectId: 'browser-outline', projectName: 'Hook outline', prompt: 'Browser outline.', kind: 'browser_outline' })
  saveBrowserProject(project)
  recordBrowserProjectActivity(project.projectId, 'outline_saved', '8 outline vertices, 4 mounting holes')

  const activity = readBrowserProjectActivity(project.projectId)
  assert.deepEqual(activity.map((event) => event.action).sort(), ['created', 'outline_saved'])
  assert.equal(activity.find((event) => event.action === 'outline_saved')?.detail, '8 outline vertices, 4 mounting holes')
  assert.equal(readBrowserProjects().projects[0]?.manufacturing.ready, false)
  assert.equal(readBrowserProjects().projects[0]?.validation.drcViolations, null)
}))

test('duplicating a browser project deep-copies browser work while rebuilding every engineering claim', () => inBrowser(() => {
  const updatedAt = '2026-07-19T00:00:00.000Z'
  const source = createBrowserProject({ projectId: 'copy-source', projectName: 'Power planner', prompt: 'Original browser intent.', browserDraft: {
    schema: 'boardforge.browser-draft.v1', kind: 'board', updatedAt, summary: 'Browser engineering plan. KiCad validation not run.',
    outline: { preset: 'rounded', closed: true, pointsMm: [{ x: 0, y: 0 }, { x: 20, y: 0 }], mountingHolesMm: [], browserValidation: { status: 'valid', routeabilityScore: 70, risk: 'Low', blockers: [] } },
    schematicPlan: { schema: 'boardforge.browser-schematic-plan.v1', version: 1, title: 'Power plan', updatedAt, notes: '', components: [{ id: 'u1', reference: 'U1', value: 'Regulator', notes: '' }], connections: [] },
  } })
  saveBrowserProject(source)

  const duplicate = duplicateBrowserProject(source.projectId)
  assert.ok(duplicate)
  assert.notEqual(duplicate.projectId, source.projectId)
  assert.equal(duplicate.projectName, 'Copy of Power planner')
  assert.equal(duplicate.localOnly, true)
  assert.equal(duplicate.boardPath, null)
  assert.equal(duplicate.schematicPath, null)
  assert.equal(duplicate.sourceManifest, null)
  assert.equal(duplicate.replayCommand, null)
  assert.equal(duplicate.readiness, 'review')
  assert.equal(duplicate.validation.drcViolations, null)
  assert.equal(duplicate.validation.ercViolations, null)
  assert.equal(duplicate.manufacturing.ready, false)
  assert.equal(duplicate.browserDraft?.outline?.pointsMm[0]?.x, 0)
  assert.equal(duplicate.browserDraft?.schematicPlan?.components[0]?.reference, 'U1')
  assert.notEqual(duplicate.browserDraft, source.browserDraft)
  assert.deepEqual(readBrowserProjectActivity(duplicate.projectId).map((event) => event.action).sort(), ['created', 'duplicated'])
  assert.match(readBrowserProjectActivity(duplicate.projectId).find((event) => event.action === 'duplicated')?.detail || '', /Power planner/)
}))

test('browser duplication rejects helper records and uses an available copy name', () => inBrowser(() => {
  const first = createBrowserProject({ projectId: 'copy-first', projectName: 'Project', prompt: 'A browser draft.' })
  const existingCopy = createBrowserProject({ projectId: 'copy-existing', projectName: 'Copy of Project', prompt: 'A browser draft.' })
  saveBrowserProject(first)
  saveBrowserProject(existingCopy)
  assert.equal(duplicateBrowserProject(first.projectId)?.projectName, 'Copy of Project (2)')

  // This mimics a card returned by the helper. It must never become copyable
  // through the browser-local mutation API.
  const helperLike = { ...first, projectId: 'helper-project', localOnly: false, status: 'READY', boardPath: 'C:\\helper\\board.kicad_pcb' }
  const stored = JSON.parse((globalThis.window as unknown as { localStorage: MemoryStorage }).localStorage.getItem(registryKey) || '[]')
  ;(globalThis.window as unknown as { localStorage: MemoryStorage }).localStorage.setItem(registryKey, JSON.stringify([helperLike, ...stored]))
  assert.equal(duplicateBrowserProject('helper-project'), null)
}))

test('workspace imports reject malformed and helper-shaped exports without inventing browser projects', () => inBrowser(() => {
  assert.throws(() => previewBrowserWorkspaceImport('{not-json'), /BoardForge browser workspace export/)
  assert.throws(() => previewBrowserWorkspaceImport({ schema: 'wrong', projects: [] }), /BoardForge browser workspace export/)
  assert.throws(() => previewBrowserWorkspaceImport({
    schema: 'boardforge.browser-workspace-export.v1', projects: [{
      projectId: 'helper-project', projectName: 'Untrusted helper claim',
      schema: 'boardforge.project-dashboard-card.v1', localOnly: false,
      boardPath: 'C:\\secret\\board.kicad_pcb', schematicPath: 'C:\\secret\\board.kicad_sch',
      validation: { drcViolations: 0 }, manufacturing: { ready: true },
    }],
  }), /No importable browser-local projects/)
  assert.deepEqual(readBrowserProjects().projects, [])
}))

test('workspace import rebuilds local-only state and merges without accepting KiCad or release claims', () => inBrowser(() => {
  const existing = createBrowserProject({ projectId: 'portable-board', projectName: 'Existing browser board', prompt: 'Keep existing PCB.' })
  const pcb = {
    schema: 'boardforge.browser-pcb-snapshot/v1' as const, savedAt: '2026-07-19T00:00:00.000Z', sandboxSource: '(kicad_pcb)', transactions: [],
    document: { schema: 'boardforge.pcb-view/v1' as const, documentId: 'portable', revision: 1, sourceSha256: 'existing-sha', units: 'mm' as const, title: 'Portable', bounds: { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } }, layers: [], footprints: [], tracks: [], vias: [], graphics: [], ratsnest: [], unconnectedCount: 0, violations: [], unsupportedCount: 0 },
  }
  saveBrowserProject({ ...existing, browserDraft: { schema: 'boardforge.browser-draft.v1', kind: 'pcb', updatedAt: pcb.savedAt, summary: 'Existing PCB draft.', pcb } })

  const imported = {
    schema: 'boardforge.browser-workspace-export.v1', exportedAt: '2026-07-19T00:00:00.000Z', projects: [{
      schema: 'boardforge.project-dashboard-card.v1', projectId: 'portable-board', projectName: 'Imported renamed board', localOnly: true,
      boardPath: 'C:\\should-never-return.kicad_pcb', schematicPath: 'C:\\should-never-return.kicad_sch', sourceManifest: 'C:\\manifest.json', replayCommand: 'run private command',
      readiness: 'ready', routingCompletionPercent: 100, validation: { shorts: 0, unconnected: 0, forbiddenVias: 0, drcViolations: 0, ercViolations: 0 },
      manufacturing: { ready: true, zip: 'C:\\package.zip', blockedReason: null }, reports: { browserDraft: 'Imported browser outline only.' },
      browserDraft: { schema: 'boardforge.browser-draft.v1', kind: 'outline', updatedAt: '2026-07-19T00:00:00.000Z', summary: 'Imported outline draft.', outline: { preset: 'rounded', closed: true, pointsMm: [{ x: 0, y: 0 }], mountingHolesMm: [], browserValidation: { status: 'valid', routeabilityScore: 100, risk: 'Low', blockers: [] } } },
    }],
  }

  assert.deepEqual(mergeBrowserWorkspaceImport(imported), { added: 0, updated: 1, ignored: 0, warnings: [] })
  const saved = readBrowserProjects().projects
  assert.equal(saved.length, 1)
  assert.equal(saved[0]?.projectName, 'Imported renamed board')
  assert.equal(saved[0]?.localOnly, true)
  assert.equal(saved[0]?.boardPath, null)
  assert.equal(saved[0]?.schematicPath, null)
  assert.equal(saved[0]?.sourceManifest, null)
  assert.equal(saved[0]?.replayCommand, null)
  assert.equal(saved[0]?.readiness, 'review')
  assert.equal(saved[0]?.manufacturing.ready, false)
  assert.equal(saved[0]?.validation.drcViolations, null)
  assert.equal(saved[0]?.browserDraft?.outline?.preset, 'rounded')
  assert.equal(saved[0]?.browserDraft?.pcb?.document.sourceSha256, 'existing-sha')
  assert.equal(exportBrowserWorkspace().projects[0]?.projectId, 'portable-board')
}))

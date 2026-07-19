import assert from 'node:assert/strict'
import test from 'node:test'
// Node's built-in TypeScript runner needs the source extension; Next's bundler does not load this test module.
// @ts-expect-error -- TypeScript source import is supported by node --experimental-strip-types.
import { createBrowserProject, readBrowserProjectActivity, readBrowserProjectLibraryMetadata, readBrowserProjects, recordBrowserProjectActivity, removeBrowserProject, saveBrowserProject, saveBrowserProjectLibraryMetadata } from './browser-project-registry.ts'

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
  const saved = readBrowserProjects().projects[0]

  assert.equal(saved.status, 'BROWSER_PCB_DRAFT')
  assert.equal(saved.localOnly, true)
  assert.equal(saved.validation.drcViolations, null)
  assert.equal(saved.browserDraft?.kind, 'pcb')
  assert.equal(saved.browserDraft?.pcb?.sandboxSource, snapshot.sandboxSource)
  assert.equal(saved.browserDraft?.pcb?.document.sourceSha256, snapshot.document.sourceSha256)
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

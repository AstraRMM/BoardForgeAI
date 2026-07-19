import assert from 'node:assert/strict'
import test from 'node:test'
// Node's built-in TypeScript runner needs the source extension; Next's bundler does not load this test module.
// @ts-expect-error -- TypeScript source import is supported by node --experimental-strip-types.
import { createBrowserProject, readBrowserProjects, removeBrowserProject, saveBrowserProject } from './browser-project-registry.ts'

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

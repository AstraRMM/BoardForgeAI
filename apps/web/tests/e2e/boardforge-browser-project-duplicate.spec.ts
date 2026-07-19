import { expect, test } from '@playwright/test'

const registryKey = 'boardforge.browser-projects.v1'

test('duplicating a browser project makes an independent browser-only copy with its saved artifacts', async ({ page }) => {
  const sourceId = 'browser-duplicate-source'
  const sourceName = 'USB sensor concept'
  const sourceDraft = {
    schema: 'boardforge.browser-draft.v1', kind: 'board', updatedAt: '2026-07-19T12:00:00.000Z', summary: 'USB sensor browser concept.',
    outline: {
      preset: 'rounded_rectangle', closed: true,
      pointsMm: [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 20 }, { x: 0, y: 20 }],
      mountingHolesMm: [{ ref: 'H1', x: 3, y: 3, diameterMm: 3.2, keepoutMm: 1, plating: 'non-plated', locked: false }],
      browserValidation: { status: 'valid', routeabilityScore: 82, risk: 'Low', blockers: [] },
    },
    schematicPlan: {
      schema: 'boardforge.browser-schematic-plan.v1', version: 1, title: 'USB sensor concept', updatedAt: '2026-07-19T12:00:00.000Z', notes: 'Browser planning only.',
      components: [{ id: 'component-u1', reference: 'U1', value: 'Sensor controller', notes: '' }],
      connections: [],
    },
  }

  await page.addInitScript(({ id, name, draft, key }) => {
    window.localStorage.setItem(key, JSON.stringify([{
      schema: 'boardforge.project-dashboard-card.v1', projectId: id, projectName: name, status: 'BROWSER_BOARD_DRAFT',
      boardPath: null, schematicPath: null, readiness: 'review', routingCompletionPercent: 0,
      validation: { shorts: null, unconnected: null, forbiddenVias: null, drcViolations: null, ercViolations: null },
      manufacturing: { ready: false, zip: null, blockedReason: 'Browser project requires KiCad validation before release.' },
      reports: { browserDraft: draft.summary }, replayCommand: null,
      criticalBlockers: [{ code: 'browser_validation_not_run', count: 1, severity: 'review' }],
      nextAction: 'Continue browser planning.', sourceManifest: null, honestyBadges: ['Browser draft', 'Validation not run'],
      projectState: 'local_draft', publishApproved: false, dashboardVisible: true, syncStatus: 'browser_saved', localOnly: true,
      browserDraft: draft,
    }]))
  }, { id: sourceId, name: sourceName, draft: sourceDraft, key: registryKey })

  await page.goto(`/projects/${sourceId}`)
  await expect(page.getByText('Board outline', { exact: true })).toBeVisible()
  await expect(page.getByText('Schematic intent', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Duplicate browser project' }).click()
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
  await expect(page.getByText('Copy of USB sensor concept', { exact: true })).toBeVisible()
  await expect(page.getByText(/not KiCad files, validation evidence, or manufacturing output/i)).toBeVisible()
  await expect(page.getByText(/Not run.+not treated as passing/i)).toBeVisible()

  const duplicated = await page.evaluate(({ key, sourceProjectId }) => {
    const projects = JSON.parse(window.localStorage.getItem(key) || '[]')
    const source = projects.find((project: { projectId: string }) => project.projectId === sourceProjectId)
    const copy = projects.find((project: { projectId: string }) => project.projectId !== sourceProjectId)
    return { source, copy, count: projects.length }
  }, { key: registryKey, sourceProjectId: sourceId })

  expect(duplicated.count).toBe(2)
  expect(duplicated.copy.projectId).not.toBe(sourceId)
  expect(duplicated.copy.browserDraft).toEqual(duplicated.source.browserDraft)
  expect(duplicated.copy).toMatchObject({
    localOnly: true, boardPath: null, schematicPath: null, replayCommand: null, sourceManifest: null,
    publishApproved: false, readiness: 'review', projectState: 'local_draft', syncStatus: 'browser_saved',
    validation: { shorts: null, unconnected: null, forbiddenVias: null, drcViolations: null, ercViolations: null },
    manufacturing: { ready: false, zip: null },
  })

  // Changing the source record after duplication cannot mutate the saved copy.
  const copyId = duplicated.copy.projectId as string
  await page.evaluate(({ key, sourceProjectId }) => {
    const projects = JSON.parse(window.localStorage.getItem(key) || '[]')
    const source = projects.find((project: { projectId: string }) => project.projectId === sourceProjectId)
    source.browserDraft.outline.pointsMm[0].x = 99
    window.localStorage.setItem(key, JSON.stringify(projects))
  }, { key: registryKey, sourceProjectId: sourceId })
  const copyFirstPoint = await page.evaluate(({ key, copyProjectId }) => {
    const projects = JSON.parse(window.localStorage.getItem(key) || '[]')
    return projects.find((project: { projectId: string }) => project.projectId === copyProjectId).browserDraft.outline.pointsMm[0].x
  }, { key: registryKey, copyProjectId: copyId })
  expect(copyFirstPoint).toBe(0)
})

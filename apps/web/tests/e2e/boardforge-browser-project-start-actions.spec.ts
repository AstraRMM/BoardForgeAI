import { expect, test } from '@playwright/test'

test('a browser project can start either browser engineering workspace with its project ID', async ({ page }) => {
  const projectId = 'browser-start-actions'
  await page.addInitScript((id) => {
    window.localStorage.setItem('boardforge.browser-projects.v1', JSON.stringify([{
      schema: 'boardforge.project-dashboard-card.v1', projectId: id, projectName: 'Browser controller concept', status: 'BROWSER_BOARD_DRAFT',
      boardPath: null, schematicPath: null, readiness: 'review', routingCompletionPercent: 0,
      validation: { shorts: null, unconnected: null, forbiddenVias: null, drcViolations: null, ercViolations: null },
      manufacturing: { ready: false, zip: null, blockedReason: 'Validation not run.' }, reports: { browserDraft: 'Browser-only request.' },
      replayCommand: null, criticalBlockers: [], nextAction: 'Continue browser planning.', sourceManifest: null,
      honestyBadges: ['Browser draft', 'Validation not run'], projectState: 'local_draft', publishApproved: false,
      dashboardVisible: true, syncStatus: 'browser_saved', localOnly: true,
    }]))
  }, projectId)
  await page.goto(`/projects/${projectId}`)

  const pcbHref = await page.getByRole('link', { name: 'Start browser PCB draft' }).getAttribute('href')
  const schematicHref = await page.getByRole('link', { name: 'Start browser schematic plan' }).getAttribute('href')
  expect(pcbHref).toBe(`/pcb-workspace?project=${encodeURIComponent(projectId)}`)
  expect(schematicHref).toBe(`/schematic-workspace?project=${encodeURIComponent(projectId)}`)

  await page.goto(schematicHref!)
  await expect(page.getByRole('heading', { name: /Capture circuit intent before KiCad work/i })).toBeVisible()
  await expect(page.getByLabel('Browser project')).toHaveValue(projectId)
  await expect(page.getByText(/does not read, write, validate, or claim to be a KiCad schematic/i)).toBeVisible()
})

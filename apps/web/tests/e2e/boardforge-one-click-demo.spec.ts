import { expect, test } from '@playwright/test'
import { attachSecretLeakGuard, writeE2EReport } from './helpers/boardforge-e2e-report'

test('one-click demo page shows honest local artifact-backed flow', async ({ page }) => {
  const guard = attachSecretLeakGuard(page)
  await page.goto('/demo')
  await expect(page.getByRole('heading', { name: /Run The Guided Workflow/i })).toBeVisible()
  await expect(page.getByText(/local workflow package/i).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /Guided local workflow/i })).toBeVisible()
  await expect(page.getByText(/Compact robotics controller/i)).toBeVisible()
  await expect(page.getByText(/sourcing stays blocked when supplier credentials are missing/i).first()).toBeVisible()
  expect(await page.locator('body').innerText()).not.toMatch(/npm run|NOT_CHECKED/)
  await guard.assertNoLeaks()
  await writeE2EReport('BoardForge_One_Click_Demo_E2E_Report', {
    title: 'BoardForge One Click Demo E2E Report',
    status: 'PASSED_WITH_LIMITATIONS',
    route: '/demo',
    proves: ['demo page loads', 'polished local workflow action visible', 'demo package limitation visible', 'project gallery visible', 'no browser-visible secrets or raw commands'],
    limitation: 'Browser page describes the protected local workflow; local engine execution remains desktop-helper backed.',
  })
})

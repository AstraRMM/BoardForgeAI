import { expect, test } from '@playwright/test'
import { attachSecretLeakGuard, writeE2EReport } from './helpers/boardforge-e2e-report'

test('one-click demo page shows honest local artifact-backed flow', async ({ page }) => {
  const guard = attachSecretLeakGuard(page)
  await page.goto('/demo')
  await expect(page.getByRole('heading', { name: /Run The Guided Alpha Flow/i })).toBeVisible()
  await expect(page.getByText(/npm run boardforge:demo/i).first()).toBeVisible()
  await expect(page.getByText(/One-click public demo mode/i)).toBeVisible()
  await expect(page.getByText(/safe local demo package/i)).toBeVisible()
  await expect(page.getByText(/Compact robotics controller/i)).toBeVisible()
  await expect(page.getByText(/sourcing NOT_CHECKED when keys are missing/i)).toBeVisible()
  await guard.assertNoLeaks()
  await writeE2EReport('BoardForge_One_Click_Demo_E2E_Report', {
    title: 'BoardForge One Click Demo E2E Report',
    status: 'PASSED_WITH_LIMITATIONS',
    route: '/demo',
    proves: ['demo page loads', 'demo command visible', 'demo package limitation visible', 'project gallery visible', 'no browser-visible secrets'],
    limitation: 'Browser page points to the local demo command; it does not yet launch the local engine job from the browser.',
  })
})

import { expect, test } from '@playwright/test'
import { attachSecretLeakGuard, writeE2EReport } from './helpers/boardforge-e2e-report'

test('approved-only publish gate is visible and local candidates stay explicit', async ({ page }) => {
  const guard = attachSecretLeakGuard(page)
  await page.goto('/projects/BF-DENSE-CONTROL-01_REV_A')
  await expect(page.getByText(/Approval and Publish Gate/i)).toBeVisible()
  await expect(page.getByText(/Publishing requires explicit confirmation/i)).toBeVisible()
  await expect(page.getByText(/Keep Local/i).first()).toBeVisible()
  await expect(page.getByText(/Archive/i).first()).toBeVisible()
  await expect(page.getByText(/Publish with Confirm/i)).toBeVisible()
  await expect(page.getByText(/Dashboard visible/i)).toBeVisible()
  await guard.assertNoLeaks()
  await writeE2EReport('BoardForge_Approved_Publish_E2E_Report', {
    title: 'BoardForge Approved Publish E2E Report',
    status: 'PASSED_WITH_LIMITATIONS',
    route: '/projects/BF-DENSE-CONTROL-01_REV_A',
    proves: ['approval gate visible', 'publish confirmation copy visible', 'keep local/archive controls visible'],
    limitation: 'Current browser panel documents publish gates; server-side publish mutation remains local-engine backed.',
  })
})

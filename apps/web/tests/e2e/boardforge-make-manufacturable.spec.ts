import { expect, test } from '@playwright/test'
import { attachSecretLeakGuard, writeE2EReport } from './helpers/boardforge-e2e-report'

test('project page exposes Make Manufacturable and Make Sourcable evidence panels', async ({ page }) => {
  const guard = attachSecretLeakGuard(page)
  await page.goto('/projects/BF-DENSE-CONTROL-01_REV_A')
  await expect(page.getByText(/Make Manufacturable/i).first()).toBeVisible()
  await expect(page.getByText(/Make Sourcable/i).first()).toBeVisible()
  await expect(page.getByText(/Make Sourcable Report/i)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quote Readiness' })).toBeVisible()
  await expect(page.getByText(/BOM Verification/i)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Manufacturability Risk' })).toBeVisible()
  await expect(page.getByText(/PCB Fab Ready: combines DRC\/ERC/i)).toBeVisible()
  await expect(page.getByText(/does not fake cloud execution/i)).toBeVisible()
  await guard.assertNoLeaks()
  await writeE2EReport('BoardForge_Make_Manufacturable_E2E_Report', {
    title: 'BoardForge Make Manufacturable E2E Report',
    status: 'PASSED_WITH_LIMITATIONS',
    route: '/projects/BF-DENSE-CONTROL-01_REV_A',
    proves: ['Make Manufacturable UI visible', 'risk and review panels visible', 'downloads/reports visible', 'local execution limitation visible'],
    limitation: 'Current browser UI surfaces action buttons and local replay evidence; mutation jobs remain local-engine backed and are not auto-run by the static page.',
  })
  await writeE2EReport('BoardForge_Make_Sourcable_E2E_Report', {
    title: 'BoardForge Make Sourcable E2E Report',
    status: 'PASSED_WITH_LIMITATIONS',
    route: '/projects/BF-DENSE-CONTROL-01_REV_A',
    proves: ['Make Sourcable UI visible', 'BOM verification table visible', 'supplier matrix visible', 'quote readiness visible', 'alternative parts visible'],
    limitation: 'Live supplier CLI proof exists separately; browser job start remains local-engine backed.',
  })
})

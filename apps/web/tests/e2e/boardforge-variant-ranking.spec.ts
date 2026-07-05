import { expect, test } from '@playwright/test'
import { attachSecretLeakGuard, writeE2EReport } from './helpers/boardforge-e2e-report'

test('variant ranking panel is visible with engineering and manufacturing scoring intent', async ({ page }) => {
  const guard = attachSecretLeakGuard(page)
  await page.goto('/projects/BF-DENSE-CONTROL-01_REV_A')
  await expect(page.getByText('Variant ranking', { exact: true })).toBeVisible()
  await expect(page.getByText(/compact/i)).toBeVisible()
  await expect(page.getByText(/connector-friendly/i)).toBeVisible()
  await expect(page.getByText(/routing-friendly/i)).toBeVisible()
  await expect(page.getByText(/manufacturing-friendly/i)).toBeVisible()
  await expect(page.getByText(/Ranks DRC\/ERC, routeability, area, connector access/i)).toBeVisible()
  await guard.assertNoLeaks()
  await writeE2EReport('BoardForge_Variant_Ranking_E2E_Report', {
    title: 'BoardForge Variant Ranking E2E Report',
    status: 'PASSED_WITH_LIMITATIONS',
    route: '/projects/BF-DENSE-CONTROL-01_REV_A',
    proves: ['variant ranking panel visible', '2-4 variant options visible', 'engineering/manufacturing scoring intent visible'],
    limitation: 'Browser currently presents variant ranking evidence; live variant generation is still local-engine backed.',
  })
})

import { expect, test } from '@playwright/test'
import { attachSecretLeakGuard, writeE2EReport } from './helpers/boardforge-e2e-report'

test('import page explains sandbox copy and source protection', async ({ page }) => {
  const guard = attachSecretLeakGuard(page)
  await page.goto('/import')
  await expect(page.getByRole('heading', { name: /Import Existing KiCad Project/i })).toBeVisible()
  await expect(page.getByText(/copy into a sandbox/i)).toBeVisible()
  await expect(page.getByText(/Source hashes prove the original stayed untouched/i)).toBeVisible()
  await expect(page.getByText(/Make Manufacturable on sandbox only/i)).toBeVisible()
  await guard.assertNoLeaks()
  await writeE2EReport('BoardForge_Import_Sandbox_E2E_Report', {
    title: 'BoardForge Import Sandbox E2E Report',
    status: 'PASSED_WITH_LIMITATIONS',
    route: '/import',
    proves: ['import page loads', 'sandbox copy language visible', 'source hash protection language visible'],
    limitation: 'Browser UI documents sandbox import flow; file-picker import execution is local-engine backed.',
  })
  await writeE2EReport('BoardForge_Source_Protection_E2E_Report', {
    title: 'BoardForge Source Protection E2E Report',
    status: 'PASSED_WITH_LIMITATIONS',
    route: '/import',
    proves: ['source protection visible in browser', 'no protected ESC/FC files loaded', 'no browser-visible secrets'],
    limitation: 'Hash-before/hash-after proof is produced by local import sandbox reports, not by this static browser page.',
  })
})

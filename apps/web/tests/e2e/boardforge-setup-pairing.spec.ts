import { expect, test } from '@playwright/test'
import { attachSecretLeakGuard, writeE2EReport } from './helpers/boardforge-e2e-report'

test('setup page exposes local engine pairing contract without leaking secrets', async ({ page }) => {
  const guard = attachSecretLeakGuard(page)
  await page.goto('/setup')
  await expect(page.getByRole('heading', { name: /Pair the live website to your local engine/i })).toBeVisible()
  await expect(page.getByText(/Secure local engine pairing/i)).toBeVisible()
  await expect(page.getByText(/GET \/pairing\/code/i)).toBeVisible()
  await expect(page.getByText(/POST \/pairing\/verify/i)).toBeVisible()
  await expect(page.getByText(/POST \/pairing\/revoke/i)).toBeVisible()
  await expect(page.getByText(/Browser-origin POST actions require a local session token/i)).toBeVisible()
  await expect(page.getByText(/Protected path guard/i)).toBeVisible()
  await guard.assertNoLeaks()
  await writeE2EReport('BoardForge_Browser_Setup_Pairing_E2E_Report', {
    title: 'BoardForge Browser Setup Pairing E2E Report',
    status: 'PASSED_WITH_LIMITATIONS',
    route: '/setup',
    proves: ['setup page loads', 'pairing routes are visible', 'local token requirement is visible', 'protected path guard is visible', 'no browser-visible secrets'],
    limitation: 'Current UI exposes pairing contract and routes; it does not yet include typed invalid/valid pairing form controls in-browser.',
  })
})

import { expect, test } from '@playwright/test'
import { attachSecretLeakGuard, writeE2EReport } from './helpers/boardforge-e2e-report'

test('live supplier sourcing UI shows DigiKey and Mouser evidence without fake stock', async ({ page }) => {
  const guard = attachSecretLeakGuard(page)
  await page.goto('/projects/BF-DENSE-CONTROL-01_REV_A')
  await expect(page.getByText(/Sourcing Command Center/i)).toBeVisible()
  await expect(page.getByText(/No fake stock/i)).toBeVisible()
  await expect(page.getByText('CONFIGURED').first()).toBeVisible()
  await expect(page.getByText(/AUTHENTICATED_LOCAL_ENGINE/i)).toBeVisible()
  await expect(page.getByText(/DIGIKEY_PRODUCTINFORMATIONV4_REACHABLE/i)).toBeVisible()
  await expect(page.getByText(/MOUSER_SEARCH_API_VERIFIED/i)).toBeVisible()
  await expect(page.getByText(/CL10B104KB8NNNC/i)).toBeVisible()
  await expect(page.getByText(/MCP1700T-3302E\/TT/i)).toBeVisible()
  await expect(page.getByRole('cell', { name: 'RC0603FR-0710KL' })).toBeVisible()
  await expect(page.getByText(/MOUSER_OUT_OF_STOCK_DIGIKEY_IN_STOCK/i)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Supplier Matrix' })).toBeVisible()
  await expect(page.getByText(/Quote Readiness/i).first()).toBeVisible()
  await expect(page.getByText(/Candidate Alternatives/i)).toBeVisible()
  await guard.assertNoLeaks()
  await writeE2EReport('BoardForge_Live_Supplier_Sourcing_E2E_Report', {
    title: 'BoardForge Live Supplier Sourcing E2E Report',
    status: 'PASSED_WITH_LIVE_CLI_EVIDENCE_AND_BROWSER_DISCLOSURE',
    route: '/projects/BF-DENSE-CONTROL-01_REV_A',
    proves: ['DigiKey configured/authenticated status visible', 'Mouser configured Search API status visible', 'known live lookup examples visible', 'Mouser out-of-stock result disclosed', 'BOM table visible', 'Supplier Matrix visible', 'Quote Readiness visible', 'Alternative Parts visible', 'no browser-visible secrets'],
    limitation: 'Browser consumes redacted local evidence/sample manifest. Actual live API calls are verified by CLI reports, not called directly from browser.',
  })
})

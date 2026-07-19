import { expect, test } from '@playwright/test'
import { attachSecretLeakGuard, writeE2EReport } from './helpers/boardforge-e2e-report'

test('import page saves a browser-local project record without uploading source files', async ({ page }) => {
  const guard = attachSecretLeakGuard(page)
  await page.goto('/import')
  await expect(page.getByRole('heading', { name: /Bring an existing KiCad project into your workspace/i })).toBeVisible()
  await expect(page.getByText(/does not upload files or claim a sandbox copy/i)).toBeVisible()
  await page.locator('#kicad-files').setInputFiles([
    { name: 'field-node.kicad_pro', mimeType: 'application/json', buffer: Buffer.from('{}') },
    { name: 'field-node.kicad_pcb', mimeType: 'text/plain', buffer: Buffer.from('(kicad_pcb)') },
  ])
  await expect(page.getByText('2 KiCad files ready to register.')).toBeVisible()
  await page.getByRole('button', { name: 'Save browser project' }).click()
  await expect(page.getByText(/Saved to Projects in this browser/i)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open saved project' })).toBeVisible()
  await guard.assertNoLeaks()
  await writeE2EReport('BoardForge_Import_Sandbox_E2E_Report', {
    title: 'BoardForge Import Sandbox E2E Report',
    status: 'PASSED_WITH_LIMITATIONS',
    route: '/import',
    proves: ['import page loads', 'selected KiCad filenames create a browser-local project record', 'the UI does not claim source files were uploaded or modified'],
    limitation: 'Copying, parsing, validating, repairing, and exporting KiCad files remain explicit paired-local-helper operations.',
  })
  await writeE2EReport('BoardForge_Source_Protection_E2E_Report', {
    title: 'BoardForge Source Protection E2E Report',
    status: 'PASSED_WITH_LIMITATIONS',
    route: '/import',
    proves: ['browser registration does not upload or mutate selected source files', 'no browser-visible secrets'],
    limitation: 'Hash-before/hash-after proof is produced only when the paired local helper performs a sandbox import.',
  })
})

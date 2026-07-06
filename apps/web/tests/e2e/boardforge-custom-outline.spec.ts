import { expect, test } from '@playwright/test'
import { attachSecretLeakGuard, writeE2EReport } from './helpers/boardforge-e2e-report'

test('custom board shape studio exposes visual outline workflow and no-fake KiCad gates', async ({ page }) => {
  const guard = attachSecretLeakGuard(page)
  await page.goto('/custom-board-generator')
  await expect(page.getByRole('heading', { name: /Custom Board Shape Studio/i })).toBeVisible()
  await expect(page.getByRole('img', { name: /Custom board outline editor/i })).toBeVisible()
  await expect(page.getByText(/BoardForge_Mechanical_Constraints/i)).toBeVisible()
  await page.getByLabel(/Preset/i).selectOption('drone-stack')
  await expect(page.getByText(/42 x 42 mm/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /Validate with local engine/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Generate KiCad outline/i })).toBeVisible()
  await expect(page.getByText(/Blocked means blocked/i)).toBeVisible()
  await expect(page.getByText(/Edge.Cuts closed/i)).toBeVisible()
  const prompt = await page.getByLabel(/Codex prompt for BoardForge outline/i).inputValue()
  expect(prompt).toMatch(/custom_outline_generate_kicad/)
  expect(prompt).toMatch(/Edge\.Cuts/)
  await guard.assertNoLeaks()
  await writeE2EReport('BoardForge_Custom_Outline_E2E_Report', {
    title: 'BoardForge Custom Outline E2E Report',
    status: 'PASSED_WITH_LIMITATIONS',
    route: '/custom-board-generator',
    proves: ['visual SVG editor visible', 'drone stack preset updates dimensions', 'local validation/generation buttons visible', 'Codex prompt includes exact Edge.Cuts handoff', 'blocked outline policy visible'],
    limitation: 'Browser test does not require a running localhost engine; local engine outline routes are covered by node tests.',
  })
})

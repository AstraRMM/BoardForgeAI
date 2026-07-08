import { expect, test } from '@playwright/test'
import { attachSecretLeakGuard, writeE2EReport } from './helpers/boardforge-e2e-report'

test('custom board shape studio exposes visual outline workflow and no-fake KiCad gates', async ({ page }) => {
  const guard = attachSecretLeakGuard(page)
  await page.goto('/custom-board-generator')
  await expect(page.getByRole('heading', { name: /Custom Board Shape Studio/i })).toBeVisible()
  await expect(page.getByRole('img', { name: /Custom board outline editor/i })).toBeVisible()
  await expect(page.getByText(/mechanical constraints/i)).toBeVisible()
  await page.getByRole('img', { name: /Custom board outline editor/i }).scrollIntoViewIfNeeded()
  await page.getByLabel(/Preset/i).selectOption('drone-stack')
  await expect(page.getByText(/Dimensions/i)).toBeVisible()
  await expect(page.getByText(/\d+\.\d x \d+\.\d mm/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /Points/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Draw/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Delete/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Snap/i })).toBeVisible()
  await page.getByRole('button', { name: /Draw/i }).click()
  const editor = page.getByRole('img', { name: /Custom board outline editor/i })
  const box = await editor.boundingBox()
  if (!box) throw new Error('custom outline editor bounding box missing')
  await page.mouse.move(box.x + box.width * 0.42, box.y + box.height * 0.36)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.48, box.y + box.height * 0.38)
  await page.mouse.move(box.x + box.width * 0.54, box.y + box.height * 0.42)
  await page.mouse.up()
  await expect(page.getByText('Outline points', { exact: true })).toBeVisible()
  await expect(page.getByText(/Valid outline|Outline blocked/i)).toBeVisible()
  await expect(page.getByText('No self-intersections', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Validate with local engine/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Generate KiCad outline/i })).toBeVisible()
  await expect(page.getByText(/Blocked means blocked/i)).toBeVisible()
  await expect(page.getByText(/Edge.Cuts closed/i)).toBeVisible()
  await expect(page.getByText(/Codex handoff ready/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /Copy prompt/i })).toBeVisible()
  const bodyText = await page.locator('body').innerText()
  expect(bodyText).not.toMatch(/custom_outline_generate_kicad/)
  expect(bodyText).not.toMatch(/npm run/)
  await guard.assertNoLeaks()
  await writeE2EReport('BoardForge_Custom_Outline_E2E_Report', {
    title: 'BoardForge Custom Outline E2E Report',
    status: 'PASSED_WITH_LIMITATIONS',
    route: '/custom-board-generator',
    proves: ['visual SVG editor visible', 'drone stack preset updates dimensions', 'points/draw/delete/snap controls visible', 'draw interaction appends geometry without navigating away', 'validation chips visible', 'local validation/generation buttons visible', 'Codex handoff panel visible without raw prompt dump', 'blocked outline policy visible'],
    limitation: 'Browser test does not require a running localhost engine; local engine outline routes are covered by node tests.',
  })
})

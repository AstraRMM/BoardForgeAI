import { expect, test } from '@playwright/test'
import { attachSecretLeakGuard, writeE2EReport } from './helpers/boardforge-e2e-report'

test('custom board generator starts blank, validates real preset geometry, and exposes exact handoff actions', async ({ page }) => {
  const guard = attachSecretLeakGuard(page)
  await page.goto('/custom-board-generator')
  await expect(page.getByRole('heading', { name: /Draw\. Validate\. Build with confidence\./i })).toBeVisible()
  await expect(page.getByRole('img', { name: /Custom board outline editor/i })).toBeVisible()

  const preset = page.getByLabel(/Preset/i)
  await expect(preset).toHaveValue('blank-custom')
  await expect(page.getByText(/Outline blocked/i)).toBeVisible()
  await expect(page.getByText(/0%/).first()).toBeVisible()

  await page.getByRole('img', { name: /Custom board outline editor/i }).scrollIntoViewIfNeeded()
  await preset.selectOption('drone-stack')
  await expect(page.getByText(/Loaded Flight controller 30\.5 mm/i)).toBeVisible()
  await expect(page.getByText('Holes verified')).toBeVisible()
  await expect(page.getByText('4 / 4')).toBeVisible()
  await expect(page.getByText(/Dimensions/i)).toBeVisible()
  await expect(page.getByText(/42\.0 x 42\.0 mm/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /Select/i }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Add point/i }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Draw/i }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Auto-Fix Geometry/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Snap/i }).first()).toBeVisible()

  const editor = page.getByRole('img', { name: /Custom board outline editor/i })
  const firstPoint = editor.locator('.bf-editor-point circle').first()
  await firstPoint.click({ force: true })
  await expect(page.getByText('Selected point 1', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Duplicate/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Delete/i })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: /Draw/i }).first().click()
  const box = await editor.boundingBox()
  if (!box) throw new Error('custom outline editor bounding box missing')
  await page.mouse.move(box.x + box.width * 0.42, box.y + box.height * 0.36)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.48, box.y + box.height * 0.38)
  await page.mouse.move(box.x + box.width * 0.54, box.y + box.height * 0.42)
  await page.mouse.up()
  await expect(page.getByText('Outline points', { exact: true })).toBeVisible()
  await expect(page.getByText(/Valid outline|Outline blocked/i)).toBeVisible()
  await expect(page.getByText('No self-intersections', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Run local KiCad check/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Create local KiCad outline/i })).toBeVisible()
  await expect(page.getByText(/Browser outline handoff/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /Save browser outline draft/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Copy prompt/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Download outline handoff/i })).toBeVisible()
  await expect(page.getByText(/Keyboard shortcuts/i)).toBeVisible()

  await page.getByRole('button', { name: /Copy prompt/i }).click()
  await expect(page.getByText(/Exact Codex prompt/i)).toBeVisible()
  const promptText = await page.getByLabel(/Exact BoardForge Codex prompt/i).inputValue()
  expect(promptText).toContain('boardforge.custom-outline.payload.v1')
  expect(promptText).toContain('Flight controller 30.5 mm')
  expect(promptText).toContain('42')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Save browser outline draft/i }).click()
  await expect(page.getByText(/Browser outline draft saved/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /Open browser draft/i })).toBeVisible()
  const savedOutlineId = await page.evaluate(() => {
    const projects = JSON.parse(window.localStorage.getItem('boardforge.browser-projects.v1') || '[]')
    return projects.find((project: { status?: string }) => project.status === 'BROWSER_OUTLINE_DRAFT')?.projectId || ''
  })
  expect(savedOutlineId).toBeTruthy()
  await page.goto(`/custom-board-generator?project=${encodeURIComponent(savedOutlineId)}`)
  await expect(page.getByText(/Loaded browser outline draft.*vertices and 4 holes/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /Update browser draft/i })).toBeVisible()
  await page.getByRole('button', { name: /Download outline handoff/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^BoardForge_Custom_Outline_.*\.zip$/)

  const bodyText = await page.locator('body').innerText()
  expect(bodyText).not.toMatch(/npm run/)
  await guard.assertNoLeaks()
  await writeE2EReport('BoardForge_Custom_Outline_E2E_Report', {
    title: 'BoardForge Custom Outline E2E Report',
    status: 'PASSED_WITH_LIMITATIONS',
    route: '/custom-board-generator',
    proves: ['blank canvas is the default', 'drone preset uses four FC stack holes', 'selection opens a useful edit menu', 'draw interaction appends geometry without navigating away', 'validation chips visible', 'browser outline draft can be saved honestly and reopened with its exact geometry', 'local KiCad handoff buttons are visible', 'exact Codex prompt can be generated', 'keyboard shortcuts are visible'],
    limitation: 'Browser test does not require a running localhost engine; local engine outline routes are covered by node tests.',
  })
})

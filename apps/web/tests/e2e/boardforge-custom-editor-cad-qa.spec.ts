import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'

const editorFor = (page: Page) => page.getByRole('img', { name: /Custom board outline editor/i })

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true, animations: 'disabled' })
}

async function drawStroke(page: Page, editor: Locator) {
  await editor.scrollIntoViewIfNeeded()
  const box = await editor.boundingBox()
  if (!box) throw new Error('custom outline editor bounds missing')
  const samples = [
    [.25, .30], [.42, .27], [.58, .36], [.62, .57], [.45, .68], [.27, .57], [.25, .33],
  ] as const
  await page.mouse.move(box.x + box.width * samples[0][0], box.y + box.height * samples[0][1])
  await page.mouse.down()
  for (const [x, y] of samples.slice(1)) {
    await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 4 })
  }
  await page.mouse.up()
}

async function addOpenRectangle(page: Page, editor: Locator) {
  await page.getByRole('button', { name: /Add point/i }).first().click()
  await editor.scrollIntoViewIfNeeded()
  const box = await editor.boundingBox()
  if (!box) throw new Error('custom outline editor bounds missing')
  for (const [x, y] of [[.18, .32], [.38, .32], [.38, .58], [.18, .58]] as const) {
    await page.mouse.click(box.x + box.width * x, box.y + box.height * y)
  }
  await expect(editor.locator('.bf-editor-point')).toHaveCount(4)
}

test.describe('custom editor CAD completion and visual QA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/custom-board-generator')
    await expect(editorFor(page)).toBeVisible()
  })

  test('Draw exposes a reversible preview with simplification and smoothing controls', async ({ page }, testInfo) => {
    const editor = editorFor(page)
    await page.getByRole('button', { name: /^Draw$/i }).first().click()
    await drawStroke(page, editor)

    await expect(page.getByText('Draw preview', { exact: true })).toBeVisible()
    await expect(page.locator('span').filter({ hasText: /points.*simplif|simplif.*points/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Accept$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Simplify More/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Smooth$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Close Shape/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Cancel$/i })).toBeVisible()
    await capture(page, testInfo, 'draw-preview')

    const beforeSimplify = await editor.locator('.bf-editor-draw-preview-point').count()
    await page.getByRole('button', { name: /Simplify More/i }).click()
    expect(await editor.locator('.bf-editor-draw-preview-point').count()).toBeLessThanOrEqual(beforeSimplify)
    await page.getByRole('button', { name: /^Smooth$/i }).click()
    await page.getByRole('button', { name: /^Cancel$/i }).click()
    await expect(page.getByText('Draw preview', { exact: true })).toBeHidden()

    await drawStroke(page, editor)
    await page.getByRole('button', { name: /Close Shape/i }).click()
    await page.getByRole('button', { name: /^Accept$/i }).click()
    await expect(page.getByRole('button', { name: /^Undo$/i })).toBeEnabled()
    await page.getByRole('button', { name: /^Undo$/i }).click()
    await expect(editor.locator('.bf-editor-point')).toHaveCount(0)
  })

  test('edge selection exposes CAD edge actions without changing geometry', async ({ page }, testInfo) => {
    await page.getByLabel(/Preset/i).selectOption('l-shape')
    const editor = editorFor(page)
    const pointCount = await editor.locator('.bf-editor-point').count()
    await page.getByRole('button', { name: /^Select$/i }).first().click()
    const edge = editor.locator('.bf-editor-edge').first()
    await expect(edge).toHaveCount(1)
    await edge.click({ force: true })

    await expect(page.getByText('Selected edge', { exact: true })).toBeVisible()
    await expect(page.getByText(/^Length:/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Straighten/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Add midpoint/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Split edge/i })).toBeVisible()
    await capture(page, testInfo, 'selected-edge')
    await expect(editor.locator('.bf-editor-point')).toHaveCount(pointCount)
  })

  test('Fill Section previews a local repair, accepts it, and records one undo transaction', async ({ page }, testInfo) => {
    const editor = editorFor(page)
    await addOpenRectangle(page, editor)
    const untouchedPoint = await editor.locator('.bf-editor-point').nth(1).getAttribute('data-point-id')
    const pointsBefore = await editor.locator('.bf-editor-point').count()

    await page.getByRole('button', { name: /^Select$/i }).first().click()
    await editor.scrollIntoViewIfNeeded()
    await editor.locator('.bf-editor-point').first().click({ force: true })
    await editor.locator('.bf-editor-point').last().click({ force: true, modifiers: ['Shift'] })
    await page.getByRole('button', { name: /Fill Section/i }).click()
    await editor.scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: /Straight Fill/i }).click()

    await expect(page.getByText('Fill Section preview', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Accept Fill/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Reject/i })).toBeVisible()
    await capture(page, testInfo, 'fill-section-preview')

    await page.getByRole('button', { name: /Accept Fill/i }).click()
    await expect(page.getByText(/Area unavailable/i)).toBeHidden()
    await expect(editor.locator(`[data-point-id="${untouchedPoint}"]`)).toHaveCount(1)
    await page.getByRole('button', { name: /^Undo$/i }).click()
    await expect(editor.locator('.bf-editor-point')).toHaveCount(pointsBefore)
    await expect(page.getByText(/Area unavailable/i)).toBeVisible()
    await page.getByRole('button', { name: /^Redo$/i }).click()
    await expect(page.getByText(/Area unavailable/i)).toBeHidden()
  })

  test('captures default, zoom, pan, selection, fill, and mobile editor states', async ({ page }, testInfo) => {
    const editor = editorFor(page)
    await page.getByLabel(/Preset/i).selectOption('drone-stack')
    await capture(page, testInfo, 'default')

    await page.getByTitle('Zoom In').click()
    await expect(page.getByLabel('Zoom percentage')).toHaveText('125%')
    await capture(page, testInfo, 'zoomed-in')
    await page.getByTitle('Zoom Out').click()
    await capture(page, testInfo, 'zoomed-out')

    await page.getByRole('button', { name: /^Pan$/i }).click()
    const box = await editor.boundingBox()
    if (!box) throw new Error('custom outline editor bounds missing')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 30)
    await page.mouse.up()
    await capture(page, testInfo, 'panned')

    await page.getByRole('button', { name: /^Select$/i }).first().click()
    await editor.locator('.bf-editor-point').first().click({ force: true })
    await capture(page, testInfo, 'selected-point')

    await page.getByRole('button', { name: /Fill Whole Board/i }).click()
    await expect(page.getByText(/Fill Whole Board preview/i)).toBeVisible()
    await capture(page, testInfo, 'fill-whole-board-preview')

    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    await expect(editorFor(page)).toBeVisible()
    await capture(page, testInfo, 'mobile')
    await expect(page.getByRole('button', { name: /^Select$/i }).first()).toBeVisible()
    await expect(page.getByLabel('Zoom percentage')).toBeVisible()
  })
})

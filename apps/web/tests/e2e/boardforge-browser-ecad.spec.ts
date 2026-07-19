import { expect, test } from '@playwright/test'

test('browser PCB workspace exposes real editable KiCad-compatible objects', async ({ page }) => {
  await page.goto('/pcb-workspace')
  const editor = page.getByRole('application', { name: /Interactive PCB editor/i })
  await expect(editor).toBeVisible()
  await expect(page.getByText(/Rust revision 0/)).toBeVisible()
  await expect(page.getByText(/source protected/i)).toBeVisible()
  await expect(page.getByText(/footprints/i)).toBeVisible()
  await expect(page.getByText(/tracks.*via/i)).toBeVisible()

  await page.getByRole('button', { name: 'Fit board' }).click()

  await editor.getByRole('button', { name: 'Select U1' }).dispatchEvent('pointerdown', { pointerId: 1, button: 0 })
  await expect(page.getByText('U1', { exact: true }).last()).toBeVisible()
  await page.getByRole('button', { name: 'Rotate' }).click()
  await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('button', { name: 'Redo' })).toBeEnabled()

  await page.getByRole('button', { name: 'measure' }).click()
  const box = await editor.boundingBox()
  if (!box) throw new Error('PCB editor bounds missing')
  await page.mouse.click(box.x + box.width * .35, box.y + box.height * .4)
  await page.mouse.click(box.x + box.width * .55, box.y + box.height * .55)
  await expect(editor.getByText(/mm$/)).toBeVisible()
})

test('custom outline editor loads Rust WASM geometry metrics', async ({ page }) => {
  await page.goto('/custom-board-generator')
  await page.getByLabel(/Preset/i).selectOption('l-shape')
  await expect(page.getByText('Rust/WASM', { exact: true })).toBeVisible()
  await expect(page.getByText('Loading WASM', { exact: true })).toBeHidden()
  await expect(page.getByText(/Area unavailable/i)).toBeHidden()
})

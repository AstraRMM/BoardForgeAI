import { expect, test } from '@playwright/test'

test('schematic workspace edits only an explicitly approved save candidate', async ({ page }) => {
  await page.goto('/schematic-workspace')
  const editor = page.getByRole('application', { name: 'Interactive schematic editor' })
  await expect(editor).toBeVisible()
  await expect(page.getByText(/symbols/).first()).toBeVisible()
  await expect(page.getByText(/wires/).first()).toBeVisible()

  await page.getByRole('button', { name: /U1 ·/ }).click()
  const value = page.getByLabel('value')
  await expect(value).toBeVisible()
  const original = await value.inputValue()
  await value.fill(`${original}-E2E`)
  await expect(page.getByText('Change preview')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Approve candidate' })).toBeEnabled()

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(value).toHaveValue(original)
  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(value).toHaveValue(`${original}-E2E`)

  const save = page.getByRole('button', { name: 'Create save candidate' })
  await expect(save).toBeDisabled()
  await page.getByRole('button', { name: 'Approve candidate' }).click()
  await expect(save).toBeEnabled()
  await save.click()
  await expect(page.getByText(/Local engine handoff required/)).toBeVisible()
})

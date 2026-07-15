import { expect, test } from '@playwright/test'

test('schematic workspace edits only an explicitly approved save candidate', async ({ page }) => {
  const requests: unknown[] = []
  await page.route('http://127.0.0.1:38991/kicad/v2/candidate/write', async route => {
    requests.push(route.request().postDataJSON())
    await route.fulfill({ json: { id: 'candidate-e2e', state: 'queued', progress: 20, summary: 'Candidate written to sandbox', warnings: [], errors: [] } })
  })
  await page.route('http://127.0.0.1:38991/kicad/v2/candidate/validate', async route => {
    await route.fulfill({ json: { id: 'candidate-e2e', state: 'ready', progress: 100, summary: 'ERC validation passed', warnings: [], errors: [] } })
  })
  await page.route('http://127.0.0.1:38991/kicad/v2/candidate/promote', async route => {
    await route.fulfill({ json: { id: 'candidate-e2e', state: 'promoted', progress: 100, summary: 'Promoted after approval', warnings: [], errors: [] } })
  })
  await page.goto('/schematic-workspace')
  const editor = page.getByRole('application', { name: 'Interactive schematic editor' })
  await expect(editor).toBeVisible()
  await expect(page.getByText(/symbols/).first()).toBeVisible()
  await expect(page.getByText(/wires/).first()).toBeVisible()

  await page.getByRole('button', { name: /R1 ·/ }).click()
  const value = page.getByLabel('value')
  await expect(value).toBeVisible()
  const original = await value.inputValue()
  await value.fill(`${original}-E2E`)
  await expect(page.getByText('Change preview')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Approve transaction' })).toBeEnabled()

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(value).toHaveValue(original)
  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(value).toHaveValue(`${original}-E2E`)

  const save = page.getByRole('button', { name: 'Send to local engine' })
  await expect(save).toBeDisabled()
  await page.getByRole('button', { name: 'Approve transaction' }).click()
  await expect(save).toBeEnabled()
  await save.click()
  await expect(page.getByRole('region', { name: 'Candidate report' })).toContainText('ready')
  expect(requests).toHaveLength(1)
  expect(requests[0]).toMatchObject({ contractVersion: 'kicad-edit-v2', approved: true, transaction: { version: 1 }, writePolicy: { directWrite: false, requireExplicitPromotion: true } })
  await page.getByRole('button', { name: 'Promote to local project' }).click()
  await expect(page.getByRole('region', { name: 'Candidate report' })).toContainText('promoted')
})

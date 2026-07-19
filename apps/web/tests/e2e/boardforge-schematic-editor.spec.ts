import { expect, test } from '@playwright/test'

test('legacy schematic workspace URL preserves its safe authenticated project-library destination', async ({ page }) => {
  await page.goto('/schematic-workspace')

  await expect(page).toHaveURL(/\/login\?returnTo=%2Fschematic-workspace$/)
  await expect(page.getByRole('application', { name: 'Interactive schematic editor' })).toHaveCount(0)
})

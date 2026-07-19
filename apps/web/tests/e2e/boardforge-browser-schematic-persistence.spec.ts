import { expect, test } from '@playwright/test'

test('browser schematic planning persists intent and remains explicitly outside KiCad', async ({ page }) => {
  await page.goto('/new-board')
  await page.getByLabel(/Describe the purpose/i).fill('A browser-only USB sensor concept for persistence testing.')
  await page.getByRole('button', { name: 'Save browser draft' }).click()
  await expect(page.getByText(/Browser draft saved\. It is a request record only/i)).toBeVisible()

  await page.goto('/schematic-workspace')
  await expect(page.getByRole('heading', { name: /Capture circuit intent before KiCad work/i })).toBeVisible()
  await expect(page.getByText(/does not read, write, validate, or claim to be a KiCad schematic/i)).toBeVisible()
  await expect(page.getByText(/Nothing on this page changes source files/i)).toBeVisible()

  await page.getByPlaceholder('U1').fill('U1')
  await page.getByPlaceholder('USB-C controller').fill('USB-C controller')
  await page.getByRole('button', { name: 'Add component' }).click()
  await page.getByPlaceholder('U1').fill('J1')
  await page.getByPlaceholder('USB-C controller').fill('USB-C connector')
  await page.getByRole('button', { name: 'Add component' }).click()
  await expect(page.getByText('U1', { exact: true })).toBeVisible()
  await expect(page.getByText('J1', { exact: true })).toBeVisible()

  const selectors = page.locator('select')
  await selectors.nth(1).selectOption({ index: 1 })
  await selectors.nth(2).selectOption({ index: 2 })
  await page.getByPlaceholder('VBUS, I2C_SDA, POWER_EN').fill('VBUS')
  await page.getByRole('button', { name: 'Add connection' }).click()
  await page.getByRole('button', { name: 'Save browser plan' }).click()
  await expect(page.getByText(/Browser plan saved\. It is not a KiCad schematic, netlist, validation result, or source file/i)).toBeVisible()

  await page.reload()
  await expect(page.getByText('USB-C controller', { exact: true })).toBeVisible()
  await expect(page.getByText('USB-C connector', { exact: true })).toBeVisible()
  await expect(page.getByText('VBUS', { exact: true })).toBeVisible()
  await expect(page.getByText(/KiCad candidate and run ERC/i)).toBeVisible()
})

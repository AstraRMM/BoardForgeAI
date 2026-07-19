import { expect, test } from '@playwright/test'

test('Projects opens a browser project into and back from its browser-only schematic workspace', async ({ page }) => {
  const prompt = 'browser workspace e2e flow request'
  const projectName = 'Browser Workspace E2e Flow Request'

  await page.goto('/new-board')
  await page.getByLabel(/Describe the purpose/i).fill(prompt)
  await page.getByRole('button', { name: 'Save browser draft' }).click()
  await expect(page.getByText(/Browser draft saved\. It is a request record only/i)).toBeVisible()

  await page.goto('/projects')
  const projectCard = page.locator('.bf-project-card-wrap').filter({
    has: page.getByRole('heading', { name: projectName, exact: true }),
  })
  await expect(projectCard).toBeVisible()
  await projectCard.getByRole('link', { name: 'Open project workspace' }).click()

  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
  await expect(page.getByText(/These controls change only the project record saved in this browser/i)).toBeVisible()
  await expect(page.getByText(/Not run.+not treated as passing/i)).toBeVisible()

  await page.getByRole('link', { name: 'Start browser schematic plan' }).click()
  await expect(page.getByRole('heading', { name: /Capture circuit intent before KiCad work/i })).toBeVisible()
  await expect(page.getByText(/does not read, write, validate, or claim to be a KiCad schematic/i)).toBeVisible()
  await expect(page.getByText(/Nothing on this page changes source files/i)).toBeVisible()

  await page.getByPlaceholder('U1').fill('U1')
  await page.getByPlaceholder('USB-C controller').fill('USB-C controller')
  await page.getByRole('button', { name: 'Add component' }).click()
  await page.getByRole('button', { name: 'Save browser plan' }).click()
  await expect(page.getByText(/Browser plan saved\. It is not a KiCad schematic, netlist, validation result, or source file/i)).toBeVisible()

  await page.getByRole('link', { name: 'Open project record' }).click()
  await expect(page.getByRole('link', { name: 'Open saved schematic plan' })).toBeVisible()
  await page.getByRole('link', { name: 'Open saved schematic plan' }).click()
  await expect(page.getByText('U1', { exact: true })).toBeVisible()
  await expect(page.getByText('USB-C controller', { exact: true })).toBeVisible()
  await expect(page.getByText(/saved only in this browser/i)).toBeVisible()
})

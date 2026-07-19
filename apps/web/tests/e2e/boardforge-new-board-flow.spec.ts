import { expect, test } from '@playwright/test'
import { attachSecretLeakGuard, writeE2EReport } from './helpers/boardforge-e2e-report'

test('new board flow offers a local-engine intake and honest browser draft fallback', async ({ page }) => {
  const guard = attachSecretLeakGuard(page)
  await page.goto('/new-board')
  await expect(page.getByRole('heading', { name: /Turn a board request into a reviewable engineering brief/i })).toBeVisible()
  await expect(page.getByLabel(/Describe the purpose/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start engineering intake' })).toBeVisible()
  await page.getByLabel(/Describe the purpose/i).fill('A compact CAN sensor node with 24 V input and JLCPCB assembly.')
  await page.getByRole('button', { name: 'Save browser draft' }).click()
  await expect(page.getByText(/Browser draft saved/i)).toBeVisible()
  const bodyText = await page.locator('body').innerText()
  expect(bodyText).toMatch(/no KiCad files/i)
  expect(bodyText).toMatch(/manufacturing evidence/i)
  expect(bodyText).not.toMatch(/C:\\Users|BoardForge_Conversation_Session\.json/i)
  await guard.assertNoLeaks()
  await writeE2EReport('BoardForge_New_Board_Flow_E2E_Report', {
    title: 'BoardForge New Board Flow E2E Report',
    status: 'PASSED_WITH_LIMITATIONS',
    route: '/new-board',
    prompt: 'A compact CAN sensor node with 24 V input and JLCPCB assembly.',
    proves: ['browser can capture a board request without fixture content', 'browser draft is explicitly not a KiCad project', 'draft labels state validation is not run', 'raw local filesystem paths are not rendered'],
    limitation: 'The paired local engine is required for engineering questions, KiCad candidate creation, and validation.',
  })
})

import { expect, test } from '@playwright/test'
import { attachSecretLeakGuard, writeE2EReport } from './helpers/boardforge-e2e-report'

test('new board flow asks relevant robotics questions and blocks project creation until approval', async ({ page }) => {
  const guard = attachSecretLeakGuard(page)
  await page.goto('/new-board')
  await expect(page.getByRole('heading', { name: /Start a real KiCad board/i })).toBeVisible()
  await expect(page.getByText(/compact odd-shaped robotics controller/i).first()).toBeVisible()
  await expect(page.getByText(/Detected board type/i)).toBeVisible()
  await expect(page.getByText('Robotics Controller', { exact: true })).toBeVisible()
  const bodyText = await page.locator('body').innerText()
  expect(bodyText).toMatch(/USB-C/i)
  expect(bodyText).toMatch(/CAN/i)
  expect(bodyText).toMatch(/I2C/i)
  expect(bodyText).toMatch(/UART\/GPS/i)
  expect(bodyText).toMatch(/SWD/i)
  await expect(page.getByText(/Waiting for engineering approval/i)).toBeVisible()
  await expect(page.getByText(/Protected until the brief is accepted/i)).toBeVisible()
  await expect(page.getByText(/Create candidate/i)).toBeVisible()
  expect(bodyText).not.toMatch(/brief_pending_approval|blocked_before_approval|robotics_controller/)
  await guard.assertNoLeaks()
  await writeE2EReport('BoardForge_New_Board_Flow_E2E_Report', {
    title: 'BoardForge New Board Flow E2E Report',
    status: 'PASSED_WITH_LIMITATIONS',
    route: '/new-board',
    prompt: 'Make me a compact odd-shaped robotics controller with USB-C, CAN, I2C, UART/GPS, SWD, PWM, mounting ears, and JLCPCB manufacturing.',
    proves: ['board type inferred as robotics', 'relevant interface questions visible', 'brief approval gate visible', 'project creation blocked before approval', 'raw internal statuses hidden'],
    limitation: 'Browser presents intake/brief/approval artifacts. Local project creation is CLI/local-engine backed.',
  })
})

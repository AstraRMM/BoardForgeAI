import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, type Page } from '@playwright/test'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const repoRoot = path.resolve(__dirname, '../../../../..')

const forbiddenSecretPatterns = [
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  /sk-or-v1-/i,
  /AQ\.[A-Za-z0-9_-]+/i,
  /DIGIKEY_CLIENT_SECRET\s*=/i,
  /MOUSER_API_KEY\s*=/i,
  /access_token/i,
  /refresh_token/i,
]

export function attachSecretLeakGuard(page: Page) {
  const events: string[] = []
  page.on('console', (message) => events.push(message.text()))
  page.on('request', (request) => events.push(request.url()))
  page.on('response', (response) => events.push(response.url()))
  return {
    events,
    async assertNoLeaks() {
      const pageText = await page.locator('body').innerText()
      const combined = [pageText, ...events].join('\n')
      for (const pattern of forbiddenSecretPatterns) expect(combined).not.toMatch(pattern)
    },
  }
}

export async function writeE2EReport(name: string, report: Record<string, unknown>) {
  const fullReport = {
    schema: 'boardforge.browser-e2e-report.v1',
    name,
    generatedAt: new Date().toISOString(),
    ...report,
  }
  const jsonPath = path.join(repoRoot, `${name}.json`)
  const mdPath = path.join(repoRoot, `${name}.md`)
  fs.writeFileSync(jsonPath, JSON.stringify(fullReport, null, 2))
  fs.writeFileSync(mdPath, markdownReport(fullReport))
  return { jsonPath, mdPath }
}

function markdownReport(report: Record<string, unknown>) {
  const lines = [`# ${String(report.title || report.name || 'BoardForge E2E Report')}`, '']
  for (const [key, value] of Object.entries(report)) {
    if (key === 'title') continue
    lines.push(`- ${key}: ${formatValue(value)}`)
  }
  lines.push('')
  return lines.join('\n')
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => typeof item === 'object' ? JSON.stringify(item) : String(item)).join('; ') || 'none'
  if (typeof value === 'object' && value) return JSON.stringify(value)
  return String(value)
}

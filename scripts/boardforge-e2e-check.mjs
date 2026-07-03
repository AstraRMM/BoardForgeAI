#!/usr/bin/env node
import { writeFile } from 'node:fs/promises'

try {
  await import('@playwright/test')
  console.log(JSON.stringify({ status: 'BOARD_FORGE_E2E_INFRA_READY', runner: '@playwright/test' }, null, 2))
} catch {
  const report = [
    '# BoardForge Browser E2E Blocker Report',
    '',
    'Status: browser_or_environment_blocker_with_exact_resume_command',
    '',
    '@playwright/test is not installed in this repo, so real browser E2E tests were not executed.',
    '',
    'Resume command:',
    '',
    '```powershell',
    'cd "C:\\Users\\luifi\\Desktop\\BoardForge_Dev\\boardforge-ai"',
    'npm install --save-dev @playwright/test',
    'npx playwright install chromium',
    'npm run test:e2e',
    '```',
    '',
    'This is an infrastructure blocker only. Component/integration tests still cover the public-alpha flows.',
    '',
  ].join('\n')
  await writeFile('BoardForge_Browser_E2E_Blocker_Report.md', report)
  console.log(JSON.stringify({ status: 'BOARD_FORGE_E2E_BROWSER_INFRA_BLOCKED', blocker: '@playwright/test missing', report: 'BoardForge_Browser_E2E_Blocker_Report.md' }, null, 2))
}

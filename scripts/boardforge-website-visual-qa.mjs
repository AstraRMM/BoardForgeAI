import { chromium } from '@playwright/test'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const port = Number(process.env.BOARDFORGE_VISUAL_QA_PORT || (3400 + Math.floor(Math.random() * 400)))
const baseUrl = process.env.BOARDFORGE_VISUAL_QA_BASE_URL || `http://127.0.0.1:${port}`
const screenshotDir = path.join(root, 'tmp', 'website-visual-qa')
const jsonPath = path.join(root, 'BoardForge_Website_Visual_QA_Report.json')
const mdPath = path.join(root, 'BoardForge_Website_Visual_QA_Report.md')

const pages = [
  ['homepage', '/'],
  ['homepage-sourcing', '/#sourcing'],
  ['custom-board-generator', '/custom-board-generator'],
  ['evidence', '/evidence'],
  ['alpha-readiness', '/alpha-readiness'],
  ['projects-dashboard', '/projects'],
]

const viewports = [
  ['desktop', { width: 1440, height: 1000 }],
  ['mobile', { width: 390, height: 844 }],
]

function waitForUrl(url, timeoutMs = 120_000) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume()
        if (res.statusCode && res.statusCode < 500) {
          resolve()
          return
        }
        retry()
      })
      req.on('error', retry)
      req.setTimeout(2500, () => {
        req.destroy()
        retry()
      })
    }
    const retry = () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`))
      } else {
        setTimeout(tick, 1000)
      }
    }
    tick()
  })
}

function startServerIfNeeded() {
  if (process.env.BOARDFORGE_VISUAL_QA_BASE_URL) return null
  const child = spawn(`npm run start -- --hostname 127.0.0.1 --port ${port}`, {
    cwd: root,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  })
  child.stdout.on('data', (chunk) => process.stdout.write(`[visual-qa-server] ${chunk}`))
  child.stderr.on('data', (chunk) => process.stderr.write(`[visual-qa-server] ${chunk}`))
  return child
}

function writeReports(results) {
  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    status: results.every((item) => item.passed) ? 'PASSED' : 'FAILED',
    pages: results,
  }
  fs.writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`)
  const lines = [
    '# BoardForge Website Visual QA Report',
    '',
    `Status: ${summary.status}`,
    `Base URL: ${baseUrl}`,
    `Generated: ${summary.generatedAt}`,
    '',
    '| Page | Viewport | Passed | Horizontal overflow | Console errors | Screenshot |',
    '| --- | --- | --- | --- | --- | --- |',
    ...results.map((item) => `| ${item.page} | ${item.viewport} | ${item.passed ? 'yes' : 'no'} | ${item.horizontalOverflow ? 'yes' : 'no'} | ${item.consoleErrors.length} | ${item.screenshot} |`),
    '',
    'Checks:',
    '- homepage no longer contains Codex-first hero language',
    '- no horizontal overflow on desktop or mobile viewports',
    '- no browser console errors during page load',
    '- screenshots captured for visual review under tmp/website-visual-qa',
    '',
  ]
  fs.writeFileSync(mdPath, `${lines.join('\n')}\n`)
}

async function run() {
  fs.mkdirSync(screenshotDir, { recursive: true })
  const server = startServerIfNeeded()
  try {
    const exited = new Promise((_, reject) => {
      server?.once('exit', (code) => reject(new Error(`Visual QA server exited before readiness check: ${code}`)))
    })
    await Promise.race([waitForUrl(baseUrl), exited])
    const browser = await chromium.launch()
    const results = []

    for (const [pageName, pagePath] of pages) {
      for (const [viewportName, viewport] of viewports) {
        const context = await browser.newContext({ viewport })
        const page = await context.newPage()
        page.setDefaultTimeout(15_000)
        const consoleErrors = []
        page.on('console', (message) => {
          if (message.type() === 'error') consoleErrors.push(message.text())
        })
        page.on('pageerror', (error) => consoleErrors.push(error.message))
        const url = `${baseUrl}${pagePath}`
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
        await page.waitForTimeout(650)

        const checks = await page.evaluate(() => {
          const oldHeroPhrases = ['CODEX PLUGIN FIRST', 'Turn Codex into a KiCad PCB engineer', 'Plugin Beta']
          const text = document.body.innerText
          return {
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            oldHeroPresent: oldHeroPhrases.some((phrase) => text.includes(phrase)),
            ctaVisible: [...document.querySelectorAll('a, button')].some((node) => /Start Building|Try Demo|View Evidence|Launch/i.test(node.textContent || '')),
          }
        })
        const horizontalOverflow = checks.scrollWidth > checks.innerWidth + 2
        const requiresCta = pageName === 'homepage'
        const screenshot = path.join(screenshotDir, `${pageName}-${viewportName}.png`)
        await page.screenshot({ path: screenshot, fullPage: true })
        results.push({
          page: pageName,
          path: pagePath,
          viewport: viewportName,
          screenshot,
          horizontalOverflow,
          oldHeroPresent: checks.oldHeroPresent,
          ctaVisible: checks.ctaVisible,
          consoleErrors,
          passed: !horizontalOverflow && !checks.oldHeroPresent && (!requiresCta || checks.ctaVisible) && consoleErrors.length === 0,
        })
        await context.close()
      }
    }

    await browser.close()
    writeReports(results)
    const failed = results.filter((item) => !item.passed)
    if (failed.length) {
      console.error(JSON.stringify({ status: 'FAILED', failed }, null, 2))
      process.exit(1)
    }
    console.log(JSON.stringify({ status: 'PASSED', report: jsonPath, markdown: mdPath }, null, 2))
  } finally {
    if (server) {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' })
      } else {
        server.kill('SIGTERM')
      }
    }
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})

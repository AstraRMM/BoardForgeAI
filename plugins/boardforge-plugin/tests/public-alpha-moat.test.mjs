import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import os from 'node:os'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

import { createLocalEngineAuth } from '../lib/platform/security/local-engine-auth.mjs'
import { isOriginAllowed } from '../lib/platform/security/origin-allowlist.mjs'
import { checkFirstRunSetup } from '../lib/platform/setup/setup-status.mjs'
import { generateOneClickDemo } from '../lib/demo/demo-project-generator.mjs'
import { writeVariantComparisonReport } from '../lib/variants/variant-report.mjs'
import { runMakeManufacturableWorkflow } from '../lib/workflows/make-manufacturable-workflow.mjs'
import { writeProjectTimeline } from '../lib/timeline/project-timeline.mjs'
import { runImportWizard } from '../lib/import/import-wizard.mjs'
import { writeEvidenceIndex } from '../lib/evidence/evidence-index.mjs'
import { writeAlphaLaunchReport } from '../lib/launch/alpha-launch-report.mjs'
import { startBoardForgeLocalServer } from '../lib/platform/local-server/http-server.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

test('pairing security creates one-time code and blocks random origins', () => {
  const auth = createLocalEngineAuth({ allowedOrigins: ['https://boardforge.ai'] })
  const code = auth.createCode()
  assert.match(code.code, /^[A-F0-9]{6}$/)
  assert.equal(isOriginAllowed('https://evil.example', ['https://boardforge.ai']), false)
  const bad = auth.verify({ code: code.code, origin: 'https://evil.example' })
  assert.equal(bad.ok, false)
  const good = auth.verify({ code: code.code, origin: 'https://boardforge.ai' })
  assert.equal(good.ok, true)
  assert.equal(auth.requireToken({ method: 'POST', origin: 'https://boardforge.ai', token: good.token }).allowed, true)
})

test('local server pairing requires token for browser-origin POST actions', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'bf-pairing-server-'))
  const server = startBoardForgeLocalServer({ rootDir, port: 0 })
  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`
  try {
    const blocked = await fetch(`${baseUrl}/jobs/start`, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'review', projectId: 'BF', projectDir: rootDir }),
    }).then((response) => response.json())
    assert.equal(blocked.ok, false)
    assert.equal(blocked.status, 'BOARD_FORGE_LOCAL_ENGINE_AUTH_REQUIRED')
    const pairing = await fetch(`${baseUrl}/pairing/code`).then((response) => response.json())
    const verified = await fetch(`${baseUrl}/pairing/verify`, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
      body: JSON.stringify({ code: pairing.data.code, origin: 'http://localhost:3000' }),
    }).then((response) => response.json())
    assert.equal(verified.ok, true)
    const allowed = await fetch(`${baseUrl}/jobs/start`, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', 'content-type': 'application/json', 'x-boardforge-token': verified.data.token },
      body: JSON.stringify({ type: 'review', projectId: 'BF', projectDir: rootDir }),
    }).then((response) => response.json())
    assert.equal(allowed.ok, true)
  } finally {
    server.close()
  }
})

test('first run setup reports required and optional dependencies honestly', () => {
  const status = checkFirstRunSetup({ env: {} })
  assert.equal(status.missingSupplierKeys.includes('DIGIKEY_CLIENT_ID'), true)
  assert.match(JSON.stringify(status), /Supplier API keys/)
})

test('one-click demo writes gallery reports without fake sourcing', async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'bf-one-click-demo-'))
  const result = await generateOneClickDemo({ outputDir })
  assert.equal(result.status, 'BOARD_FORGE_ONE_CLICK_DEMO_READY')
  assert.equal(result.report.noFakeStock, true)
  assert.equal(result.report.projects.length, 5)
})

test('variant generation ranks candidates and selects a winner', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'bf-variants-'))
  const result = await writeVariantComparisonReport({ projectDir })
  assert.equal(result.status, 'BOARD_FORGE_VARIANT_COMPARISON_WRITTEN')
  assert.equal(result.report.variants.length, 4)
  assert.equal(result.report.winner.score >= result.report.variants[1].score, true)
})

test('make manufacturable workflow writes ready or blocked summary', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'bf-make-manufacturable-'))
  const result = await runMakeManufacturableWorkflow({ projectDir, status: { drc: 0, erc: 0, shorts: 0, unconnected: 0 } })
  assert.equal(result.status, 'BOARD_FORGE_MANUFACTURABLE_READY')
  assert.match(result.artifactPaths.join('\n'), /BoardForge_Make_Manufacturable_Report/)
})

test('project timeline writes engineering audit trail', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'bf-timeline-'))
  const result = await writeProjectTimeline({ projectDir, events: [{ type: 'intake_started', summary: 'prompt received' }, { type: 'export_created', summary: 'zip ready' }] })
  assert.equal(result.status, 'BOARD_FORGE_PROJECT_TIMELINE_WRITTEN')
  assert.match(await readFile(result.artifactPaths[1], 'utf8'), /export_created/)
})

test('import sandbox wizard proves source hash unchanged', async () => {
  const sourceDir = await mkdtemp(path.join(os.tmpdir(), 'bf-import-source-'))
  const sandboxDir = await mkdtemp(path.join(os.tmpdir(), 'bf-import-sandbox-'))
  await writeFile(path.join(sourceDir, 'source.kicad_pro'), '{}')
  const result = await runImportWizard({ sourceDir, sandboxDir })
  assert.equal(result.status, 'BOARD_FORGE_IMPORT_WIZARD_COMPLETED')
  assert.equal(result.report.sourceUntouched, true)
})

test('evidence dashboard and public alpha launch gate write reports', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'bf-evidence-'))
  const evidence = await writeEvidenceIndex({ rootDir })
  const launch = await writeAlphaLaunchReport({ rootDir })
  assert.equal(evidence.report.cards.some((card) => card.name === 'make manufacturable'), true)
  assert.equal(launch.report.status, 'READY_FOR_PUBLIC_ALPHA_WITH_LIMITATIONS')
})

test('web public-alpha pages and panels expose launch features', async () => {
  const files = [
    'apps/web/src/app/setup/page.tsx',
    'apps/web/src/app/demo/page.tsx',
    'apps/web/src/app/import/page.tsx',
    'apps/web/src/app/evidence/page.tsx',
    'apps/web/src/app/alpha-readiness/page.tsx',
    'apps/web/src/components/project/VariantComparisonPanel.tsx',
    'apps/web/src/components/project/MakeManufacturableReportPanel.tsx',
    'apps/web/src/components/project/ProjectTimelinePanel.tsx',
  ]
  for (const file of files) {
    const body = await readFile(path.join(repoRoot, file), 'utf8')
    assert.match(body, /BoardForge|Variant|Manufacturable|Timeline|Evidence|Import|Pair/)
  }
})

test('launcher scripts and Playwright E2E specs exist', async () => {
  const launcher = await readFile(path.join(repoRoot, 'scripts', 'boardforge-start-local-engine.mjs'), 'utf8')
  assert.match(launcher, /boardforge:local-server/)
  const playwrightConfig = await readFile(path.join(repoRoot, 'apps', 'web', 'playwright.config.ts'), 'utf8')
  assert.match(playwrightConfig, /@playwright\/test/)
  const liveSourcingSpec = await readFile(path.join(repoRoot, 'apps', 'web', 'tests', 'e2e', 'boardforge-live-sourcing.spec.ts'), 'utf8')
  assert.match(liveSourcingSpec, /Mouser/)
  assert.match(liveSourcingSpec, /DigiKey/)
})

test('package scripts expose public-alpha workflows', () => {
  const scripts = JSON.parse(execFileSync(process.execPath, ['-e', "process.stdout.write(require('fs').readFileSync('package.json','utf8'))"], { cwd: repoRoot }))
  assert.equal(Boolean(scripts.scripts['boardforge:demo']), true)
  assert.equal(Boolean(scripts.scripts['test:pairing-security']), true)
  assert.equal(Boolean(scripts.scripts['test:e2e']), true)
  assert.equal(Boolean(scripts.scripts['boardforge:public-alpha-proof']), true)
})

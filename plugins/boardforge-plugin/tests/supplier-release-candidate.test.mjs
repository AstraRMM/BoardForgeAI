import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { buildPoeRevDSourcingVerificationReport, writePoeRevDSourcingVerificationReport } from '../lib/poe/poe-rev-d-sourcing-verification.mjs'

test('PoE REV_D sourcing verification returns NOT_CHECKED when supplier keys are missing', async () => {
  const report = await buildPoeRevDSourcingVerificationReport({ env: {} })
  assert.equal(report.summary.partsChecked, 11)
  assert.equal(report.summary.providersAttempted, 4)
  assert.equal(report.summary.apiVerified, 0)
  assert.equal(report.summary.notChecked, 44)
  assert.equal(report.summary.stockUnknown, 44)
  assert.equal(report.summary.assemblyUnknown, 44)
  assert.equal(report.manufacturingReadiness.pcbFab, 'PCB_FAB_READY')
  assert.equal(report.manufacturingReadiness.assembly, 'ASSEMBLY_READY_NOT_VERIFIED')
  assert.equal(report.manufacturingReadiness.sourcing, 'BLOCKED_SOURCING')
  assert.match(report.exactBlocker, /DIGIKEY_CLIENT_ID/)
})

test('PoE REV_D sourcing verification writes exact blocker reports without fake stock', async () => {
  const outputDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tmp', 'poe-rev-d-sourcing-test')
  const report = await writePoeRevDSourcingVerificationReport({ outputDir, env: {} })
  const json = JSON.parse(await readFile(report.files.json, 'utf8'))
  const markdown = await readFile(report.files.markdown, 'utf8')
  assert.equal(json.summary.apiVerified, 0)
  assert.equal(json.summary.notChecked, 44)
  assert.match(markdown, /BoardForge does not fake stock/)
  assert.match(markdown, /BLOCKED_SOURCING/)
})

test('alpha release docs exist and explain sourcing and compliance limits', async () => {
  const docs = [
    'docs/BOARD_FORGE_ALPHA_READINESS.md',
    'docs/BOARD_FORGE_LOCAL_INSTALL.md',
    'docs/BOARD_FORGE_DEMO_FLOW.md',
    'docs/BOARD_FORGE_SUPPLIER_API_SETUP.md',
    'docs/BOARD_FORGE_SECRET_HANDLING.md',
    'docs/BOARD_FORGE_LIMITATIONS.md',
    'docs/BOARD_FORGE_SALES_POSITIONING.md',
    'docs/BOARD_FORGE_NEXT_30_DAYS.md',
    'docs/BOARD_FORGE_ALPHA_DEMO_SCRIPT.md',
  ]
  for (const file of docs) {
    const info = await stat(file)
    assert.ok(info.size > 100, `${file} should not be empty`)
  }
  const setup = await readFile('docs/BOARD_FORGE_SUPPLIER_API_SETUP.md', 'utf8')
  const limitations = await readFile('docs/BOARD_FORGE_LIMITATIONS.md', 'utf8')
  assert.match(setup, /DIGIKEY_CLIENT_ID/)
  assert.match(setup, /NOT_CHECKED/)
  assert.match(limitations, /PoE compliance/)
})

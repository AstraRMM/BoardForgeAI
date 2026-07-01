import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import test from 'node:test'
import { importProjectToSandbox } from '../lib/platform/copy-sandbox-importer.mjs'
import { assertPathIsAllowed, hasWrittenProtectedPathApproval, isProtectedBoardPath } from '../lib/platform/protected-path-guard.mjs'

test('protected path guard refuses ESC and FC project names', () => {
  assert.equal(isProtectedBoardPath('C:/Users/luifi/Desktop/FN-ESC1/board.kicad_pcb'), true)
  assert.equal(isProtectedBoardPath('C:/tmp/my-flight-controller/project.kicad_pcb'), true)
  assert.equal(isProtectedBoardPath('C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/BF-ODD-SHAPE-ROBOT-01_REV_A'), false)
  assert.equal(assertPathIsAllowed('C:/Users/luifi/Desktop/FN-FC/project').allowed, false)
  assert.equal(assertPathIsAllowed('C:/Users/luifi/Desktop/FN-FC/project', { allowProtected: true }).allowed, false)
  assert.equal(hasWrittenProtectedPathApproval('C:/missing/approval.txt'), false)
})

test('copy sandbox importer copies synthetic project without mutating original', () => {
  const source = 'C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/BF-ODD-SHAPE-ROBOT-01_REV_A'
  const output = 'C:/Users/luifi/Desktop/BoardForge_Sandboxes/BF-ODD-SHAPE-ROBOT-01_REV_A_import_sandbox'
  const result = importProjectToSandbox({ source, output })
  assert.equal(result.status, 'COPY_SANDBOX_IMPORT_COMPLETED')
  assert.equal(result.originalUntouched, true)
  assert.equal(result.protectedPathGuard, 'passed')
  assert.equal(result.manifestGenerated, true)
  assert.equal(result.drcErcScannedFromCopy, true)
  assert.equal(fs.existsSync(result.reports.json), true)
  assert.equal(fs.existsSync(result.reports.markdown), true)
  assert.equal(fs.existsSync(result.reports.manifest), true)
  assert.match(result.replayCommand, /boardforge:import-sandbox/)
})

test('PoE fixture honesty reports compliance limits without blocking clean electrical proof', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
  execFileSync(process.execPath, [
    path.join(repoRoot, 'plugins', 'boardforge-plugin', 'bin', 'boardforge-fixture-runner.mjs'),
    '--run',
    '--fixture',
    'poe-sensor-electrical',
  ], { cwd: repoRoot, stdio: 'pipe', timeout: 180000 })
  const projectRoot = 'C:/Users/luifi/Desktop/BoardForge_New_Board_Fixtures/BF-POE-SENSOR-01_REV_A'
  const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'BoardForge_Project_Manifest.json'), 'utf8'))
  const honesty = fs.readFileSync(path.join(projectRoot, 'BoardForge_POE_Fixture_Honesty_Report.md'), 'utf8')
  assert.equal(manifest.validation.drcViolations, 0)
  assert.equal(manifest.validation.ercViolations, 0)
  assert.equal(manifest.validation.unconnected, 0)
  assert.equal(manifest.manufacturing.ready, true)
  assert.equal(fs.existsSync(manifest.manufacturing.zip), true)
  assert.match(honesty, /POE_COMPLIANCE_NOT_VERIFIED/)
  assert.match(honesty, /MAGNETICS_NOT_VERIFIED/)
  assert.match(honesty, /ISOLATION_NOT_VERIFIED/)
  assert.match(honesty, /SOURCING_NOT_API_VERIFIED/)
})

test('category-depth evidence covers product categories and honest limitations', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
  const output = JSON.parse(execFileSync(process.execPath, [
    path.join(repoRoot, 'plugins', 'boardforge-plugin', 'bin', 'boardforge-category-depth-evidence.mjs'),
  ], { cwd: repoRoot, stdio: 'pipe' }).toString())
  assert.equal(output.status, 'BOARD_FORGE_CATEGORY_DEPTH_EVIDENCE_WRITTEN')
  assert.equal(output.summary.categoriesCovered >= 6, true)
  assert.equal(output.summary.manufacturingReadyCount >= 5, true)
  const evidence = JSON.parse(fs.readFileSync(output.jsonFile, 'utf8'))
  assert.equal(evidence.categories.some((item) => item.category === 'PoE sensor fixture' && /COMPLIANCE_NOT_VERIFIED/.test(item.limitations)), true)
  assert.equal(evidence.categories.some((item) => item.category === 'existing-project import sandbox'), true)
})

test('category-specific fixture definitions cover next alpha board families', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
  const required = [
    ['usb-c-mcu', 'USB-C MCU'],
    ['can-node', 'CAN node'],
    ['tiny-2layer', 'tiny 2-layer'],
    ['compact-4layer', 'compact 4-layer'],
  ]
  for (const [folder, label] of required) {
    const fixturePath = path.join(repoRoot, 'fixtures', 'boards', folder, 'fixture.json')
    assert.equal(fs.existsSync(fixturePath), true, `${label} fixture missing`)
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
    assert.equal(fixture.category, label)
    assert.equal(Array.isArray(fixture.learningGoals), true)
    assert.equal(fixture.learningGoals.length > 0, true)
    assert.match(fixture.protectionPolicy, /synthetic_only/)
  }
})

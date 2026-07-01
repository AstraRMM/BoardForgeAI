import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { arbitraryPromptBreadthPrompts, evaluateArbitraryPromptBreadth, writeArbitraryPromptBreadthReport } from '../lib/arbitrary-prompt-breadth.mjs'
import { runImportedBoardSandboxRepairProof, importedBoardRepair04 } from '../lib/repair/imported-board-repair-proof.mjs'
import { runLocalShoveRouter, runPhysicalLocalShoveRouter } from '../lib/routing/local-shove-router.mjs'
import { detectSourcingProviderEnv } from '../lib/sourcing/source-provider-env.mjs'

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')

test('arbitrary prompt breadth handles ten varied board requests honestly', () => {
  const { report, files } = writeArbitraryPromptBreadthReport({ outputDir: path.join(repoRoot, 'fixtures', 'prompt-breadth') })
  assert.equal(report.promptsTested, 10)
  assert.equal(report.failed, 0)
  assert.equal(report.rows.some((row) => /industrial 24v/i.test(row.prompt) && /SAFETY_CERTIFICATION_NOT_VERIFIED/.test(row.exactBlocker)), true)
  assert.equal(report.rows.some((row) => /PoE Ethernet/i.test(row.prompt) && /POE_COMPLIANCE_NOT_VERIFIED/.test(row.exactBlocker)), true)
  assert.equal(fs.existsSync(files.jsonFile), true)
  assert.equal(fs.existsSync(files.mdFile), true)
})

test('industrial I/O fixture declares simplified compliance boundaries', () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(repoRoot, 'fixtures', 'boards', 'industrial-io', 'fixture.json'), 'utf8'))
  assert.equal(fixture.targetFolder, 'C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\BF-INDUSTRIAL-IO-01_REV_A')
  assert.equal(fixture.honesty.fixtureStatus, 'SIMPLIFIED_INDUSTRIAL_FIXTURE')
  assert.equal(fixture.honesty.safetyCertification, 'NOT_CERTIFIED')
  assert.equal(fixture.constraints.manufacturingRequires.drc, 0)
})

test('PoE depth honesty fixture does not claim compliance or isolation certification', () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(repoRoot, 'fixtures', 'boards', 'poe-sensor-depth', 'fixture.json'), 'utf8'))
  assert.match(fixture.targetFolder, /BF-POE-SENSOR-01_REV_B/)
  assert.equal(fixture.honesty.poeCompliance, 'POE_COMPLIANCE_NOT_VERIFIED')
  assert.equal(fixture.honesty.magnetics, 'MAGNETICS_NOT_VERIFIED')
  assert.match(fixture.honesty.isolation, /NOT_CERTIFIED/)
})

test('sourcing API key path detects configured keys without faking stock', () => {
  const rows = detectSourcingProviderEnv({
    DIGIKEY_CLIENT_ID: 'id',
    DIGIKEY_CLIENT_SECRET: 'secret',
    MOUSER_API_KEY: 'mouser',
  })
  const digikey = rows.find((row) => row.provider === 'digikey')
  const mouser = rows.find((row) => row.provider === 'mouser')
  const lcsc = rows.find((row) => row.provider === 'lcsc')
  assert.equal(digikey.apiCallable, true)
  assert.equal(mouser.apiCallable, true)
  assert.equal(lcsc.apiCallable, false)
  assert.equal(digikey.fallbackBehavior.sourcingStatus, 'NOT_CHECKED')
  assert.equal(digikey.fallbackBehavior.fakeStockAllowed, false)
})

test('PCB fab vs assembly readiness remains separated in sourcing guide', () => {
  const guide = fs.readFileSync(path.join(repoRoot, 'BoardForge_Sourcing_API_Setup_Guide.md'), 'utf8')
  assert.match(guide, /PCB_FAB_READY/)
  assert.match(guide, /ASSEMBLY_READY_VERIFIED/)
  assert.match(guide, /NOT_CHECKED/)
})

test('imported-board repair 04 proves harder sandbox repair without source mutation', async () => {
  const proof = await runImportedBoardSandboxRepairProof(importedBoardRepair04)
  assert.equal(proof.projectId, 'BF-IMPORTED-USER-BOARD-REPAIR-04')
  assert.equal(proof.sourceUntouched, true)
  assert.equal(proof.repair.after.drc, 0)
  assert.equal(proof.repair.after.erc, 0)
  assert.equal(proof.repair.after.shorts, 0)
  assert.equal(proof.repair.after.unconnected, 0)
  assert.ok(proof.repair.transactions.results.some((item) => item.type === 'local_reroute_requirement'))
  assert.ok(proof.repair.transactions.results.some((item) => item.type === 'via_movement_requirement'))
  assert.equal(fs.existsSync(proof.outputs.manufacturingZip), true)
})

test('local shove ripup hardcase plans blockers and commits only safe proof', () => {
  const plan = runLocalShoveRouter(
    { net: 'TARGET', source: { x: 0, y: 0 }, target: { x: 5, y: 0 } },
    [{ id: 'seg1', generated: true, net: 'BLOCKER', x: 2, y: 0 }],
    { simulateResult: { shorts: 0, forbiddenVias: 0, connectivityImproved: true } },
  )
  assert.equal(plan.status, 'COMMITTED_IMPROVED')
  const report = fs.readFileSync(path.join(repoRoot, 'BoardForge_Local_Shove_Ripup_Improvement_Report.md'), 'utf8')
  assert.match(report, /move via away/)
  assert.match(report, /rollback if unconnected increases/)
})

test('approved-only sync architecture doc defines local and published states', () => {
  const doc = fs.readFileSync(path.join(repoRoot, 'docs', 'BOARD_FORGE_APPROVED_ONLY_SYNC_ARCHITECTURE.md'), 'utf8')
  for (const state of ['local_draft', 'local_candidate', 'approved_for_dashboard', 'dashboard_published', 'failed_experiment']) {
    assert.match(doc, new RegExp(state))
  }
})

test('question engine architecture doc describes conditional intake without babysitting', () => {
  const doc = fs.readFileSync(path.join(repoRoot, 'docs', 'BOARD_FORGE_QUESTION_ENGINE_ARCHITECTURE.md'), 'utf8')
  assert.match(doc, /conditional follow-ups/i)
  assert.match(doc, /robotics controller/i)
  assert.match(doc, /avoid babysitting/i)
})

test('readiness 90 evidence gate requires hard proofs, not docs alone', () => {
  const rubric = fs.readFileSync(path.join(repoRoot, 'docs', 'BOARD_FORGE_READINESS_RUBRIC.md'), 'utf8')
  assert.match(rubric, /90/)
  assert.match(rubric, /arbitrary/i)
  assert.match(rubric, /imported/i)
  assert.match(rubric, /sourcing/i)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { PROJECT_STATES, defaultPublishState, transitionPublishState } from '../lib/platform/project-publish-state.mjs'
import { approveProjectForDashboard, canPublishToDashboard, filterDashboardPublished } from '../lib/platform/project-publish-gate.mjs'
import { syncProjectToDashboard } from '../lib/platform/project-sync-client.mjs'
import { checkBoardForgeLicense } from '../lib/auth/license-checker.mjs'
import { canRunPremiumAction } from '../lib/auth/entitlement-gate.mjs'
import { runQuestionEngine } from '../lib/intake/question-engine.mjs'
import { selectedConditionalFollowups } from '../lib/intake/conditional-followups.mjs'
import { getQuestionTree } from '../lib/intake/board-type-question-trees.mjs'
import { generateBoardBrief, writeBoardBrief } from '../lib/intake/board-brief-generator.mjs'
import { canBuildFromBrief } from '../lib/intake/board-brief-approval-gate.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const cliPath = path.join(repoRoot, 'plugins', 'boardforge-plugin', 'bin', 'boardforge-cli.mjs')
const kicadPluginPath = path.join(repoRoot, 'kicad-plugin', 'boardforge_action_plugin.py')
const kicadBridgePath = path.join(repoRoot, 'kicad-plugin', 'boardforge_status_bridge.py')

test('project publish state defaults to local draft and dashboard hidden', () => {
  const state = defaultPublishState()
  assert.equal(state.projectState, PROJECT_STATES.LOCAL_DRAFT)
  assert.equal(state.publishApproved, false)
  assert.equal(state.dashboardVisible, false)
  assert.equal(state.syncStatus, 'not_synced')
})

test('approved-only sync gate blocks publish until approval and explicit confirmation', () => {
  const draft = { projectId: 'BF-LOCAL-DRAFT', publish: defaultPublishState() }
  assert.equal(canPublishToDashboard(draft, { confirm: true }).allowed, false)
  const approved = approveProjectForDashboard(draft)
  assert.equal(canPublishToDashboard(approved, { confirm: false }).allowed, false)
  assert.equal(canPublishToDashboard(approved, { confirm: true }).allowed, true)
  const synced = syncProjectToDashboard(approved, { confirm: true })
  assert.equal(synced.status, 'PROJECT_SYNCED_TO_DASHBOARD')
  assert.equal(synced.manifest.projectState, PROJECT_STATES.DASHBOARD_PUBLISHED)
})

test('dashboard published only filter excludes local drafts and failed experiments', () => {
  const published = transitionPublishState(transitionPublishState(defaultPublishState(), 'approve_publish'), 'publish_dashboard')
  const failed = transitionPublishState(defaultPublishState(), 'fail_experiment')
  const projects = [{ id: 'a', publish: published }, { id: 'b', publish: defaultPublishState() }, { id: 'c', publish: failed }]
  assert.deepEqual(filterDashboardPublished(projects).map((project) => project.id), ['a'])
})

test('license entitlement gate blocks premium actions without license and allows explicit dev mode', () => {
  const blocked = checkBoardForgeLicense({ env: {}, action: 'route_board' })
  assert.equal(blocked.licensed, false)
  assert.ok(blocked.blockers.includes('missing_active_license'))
  const allowed = canRunPremiumAction('route_board', { env: { BOARDFORGE_DEV_LICENSE: 'true' } })
  assert.equal(allowed.allowed, true)
  assert.equal(allowed.license.auth.subscription.devMode, true)
})

test('dev license mode enables premium actions without production billing bypass', () => {
  const check = checkBoardForgeLicense({ env: { BOARDFORGE_DEV_LICENSE: 'true' }, action: 'sync_project_to_dashboard' })
  assert.equal(check.licensed, true)
  assert.equal(check.auth.subscription.source, 'BOARDFORGE_DEV_LICENSE')
})

test('KiCad plugin publish status exposes license, approval, and sandbox-only repair controls', async () => {
  const plugin = await readFile(kicadPluginPath, 'utf8')
  const bridge = await readFile(kicadBridgePath, 'utf8')
  assert.match(plugin, /boardforge:license/)
  assert.match(plugin, /boardforge:publish/)
  assert.match(plugin, /Route\/Repair\/Cleanup\/Export disabled on active project/)
  assert.match(bridge, /licenseStatus/)
  assert.match(bridge, /projectState/)
  assert.match(bridge, /publishApproved/)
})

test('CLI publish requires explicit confirmation', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-publish-'))
  const manifestPath = path.join(dir, 'BoardForge_Project_Manifest.json')
  await writeFile(manifestPath, JSON.stringify({ projectId: 'CLI-PUBLISH', projectName: 'CLI Publish', publish: defaultPublishState() }, null, 2))
  const blocked = JSON.parse(execFileSync(process.execPath, [cliPath, 'publish', '--project', dir, '--manifest', manifestPath], { encoding: 'utf8', env: { ...process.env, BOARDFORGE_DEV_LICENSE: 'true' } }))
  assert.equal(blocked.status, 'BOARD_FORGE_PUBLISH_BLOCKED_CONFIRM_REQUIRED')
})

test('question engine asks essential robotics questions and no irrelevant CAN followup by default', () => {
  const plan = runQuestionEngine({ prompt: 'Make me a compact robotics controller.' })
  assert.equal(plan.boardType, 'robotics_controller')
  assert.ok(plan.questionsToAsk.includes('controller_preference'))
  assert.equal(plan.conditionalFollowups.includes('can_interface'), false)
})

test('conditional followups appear only when answers change the design', () => {
  const tree = getQuestionTree('robotics_controller')
  assert.deepEqual(selectedConditionalFollowups(tree, { interfaces_needed: 'I2C UART', board_shape: 'rectangle' }), [])
  const selected = selectedConditionalFollowups(tree, { interfaces_needed: 'CAN I2C', board_shape: 'custom outline with ears', power_input: 'battery' })
  assert.ok(selected.includes('can_interface'))
  assert.ok(selected.includes('custom_outline'))
  assert.ok(selected.includes('battery_power'))
})

test('board brief generator writes approval-gated board brief artifacts', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-brief-'))
  const brief = generateBoardBrief({ prompt: 'Make a PoE Ethernet environmental sensor.' })
  assert.equal(brief.boardType, 'poe_environment_sensor')
  assert.equal(brief.briefApproved, false)
  const written = await writeBoardBrief({ brief, outputDir: dir })
  assert.equal(path.basename(written.files.json), 'BoardForge_Board_Brief.json')
  assert.equal(path.basename(written.files.markdown), 'BoardForge_Board_Brief.md')
})

test('board brief approval gate blocks build until approval or explicit dev bypass', () => {
  const brief = generateBoardBrief({ prompt: 'Make a tiny 2-layer sensor board.' })
  assert.equal(canBuildFromBrief(brief).allowed, false)
  assert.equal(canBuildFromBrief({ ...brief, briefApproved: true }).allowed, true)
  assert.equal(canBuildFromBrief(brief, { devBypass: true }).allowed, true)
})

test('premium intake flow produces conditional questions, a brief, and an approval gate', () => {
  const plan = runQuestionEngine({
    prompt: 'Make me a compact robotics controller.',
    answers: { interfaces_needed: 'CAN I2C UART', board_shape: 'custom outline', power_input: 'USB-C' },
  })
  assert.ok(plan.conditionalFollowups.includes('can_interface'))
  assert.ok(plan.conditionalFollowups.includes('custom_outline'))
  const brief = generateBoardBrief({ plan })
  const gate = canBuildFromBrief(brief)
  assert.equal(gate.allowed, false)
  assert.ok(gate.blockers.includes('board_brief_requires_user_approval'))
})

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
import { createProjectFromPrompt } from '../lib/engine/create-project-from-prompt.mjs'
import { applyProjectApprovalAction } from '../lib/platform/project-approval-actions.mjs'

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

test('boardforge create question flow writes a brief and local candidate after approval', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-create-flow-'))
  const result = await createProjectFromPrompt({
    prompt: 'Make a compact robotics controller with CAN and USB-C.',
    outputDir: dir,
    answers: JSON.stringify({ interfaces_needed: 'CAN USB I2C', power_input: 'USB-C', board_shape: 'rounded compact' }),
    approveBrief: true,
    devBypass: true,
  })
  assert.equal(result.status, 'BOARD_FORGE_CREATE_LOCAL_CANDIDATE')
  assert.equal(result.questionPlan.boardType, 'robotics_controller')
  assert.ok(result.questionPlan.conditionalFollowups.includes('can_interface'))
  assert.ok(result.questionPlan.conditionalFollowups.includes('usb_c_mode'))
  assert.equal(result.questionPlan.conditionalFollowups.includes('poe_isolation'), false)
  const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'))
  assert.equal(manifest.projectState, 'local_candidate')
  assert.equal(manifest.dashboardVisible, false)
  assert.equal(manifest.publishApproved, false)
})

test('create requires brief approval before project generation', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-create-blocked-'))
  const result = await createProjectFromPrompt({
    prompt: 'Make a compact robotics controller with CAN and USB-C.',
    outputDir: dir,
    answers: JSON.stringify({ interfaces_needed: 'CAN USB', power_input: 'USB-C' }),
  })
  assert.equal(result.status, 'BOARD_FORGE_CREATE_BLOCKED_BRIEF_APPROVAL_REQUIRED')
  assert.equal(result.projectCreated, false)
  assert.ok(result.blockers.includes('board_brief_requires_user_approval'))
  assert.equal(path.basename(result.briefFiles.json), 'BoardForge_Board_Brief.json')
})

test('create conditional followups include selected CAN and USB-C but not PoE', async () => {
  const result = await createProjectFromPrompt({
    prompt: 'Make a compact robotics controller with CAN and USB-C.',
    outputDir: await mkdtemp(path.join(os.tmpdir(), 'boardforge-create-followups-')),
    answers: JSON.stringify({ interfaces_needed: 'CAN USB', power_input: 'USB-C' }),
    approveBrief: true,
    devBypass: true,
  })
  assert.ok(result.questionPlan.conditionalFollowups.includes('can_interface'))
  assert.ok(result.questionPlan.conditionalFollowups.includes('usb_c_mode'))
  assert.equal(result.questionPlan.conditionalFollowups.includes('poe_isolation'), false)
})

test('create local draft not published to dashboard automatically', async () => {
  const result = await createProjectFromPrompt({
    prompt: 'Make a compact robotics controller.',
    outputDir: await mkdtemp(path.join(os.tmpdir(), 'boardforge-create-local-')),
    approveBrief: true,
    devBypass: true,
  })
  assert.equal(result.publish.projectState, 'local_candidate')
  assert.equal(result.publish.dashboardVisible, false)
  assert.equal(result.publish.publishApproved, false)
})

test('create publish requires approval and explicit confirmation', async () => {
  const result = await createProjectFromPrompt({
    prompt: 'Make a compact robotics controller.',
    outputDir: await mkdtemp(path.join(os.tmpdir(), 'boardforge-create-publish-')),
    approveBrief: true,
    devBypass: true,
  })
  const blocked = canPublishToDashboard({ publish: result.publish }, { confirm: true })
  assert.equal(blocked.allowed, false)
  assert.ok(blocked.blockers.includes('project_not_approved_for_dashboard'))
  const approved = approveProjectForDashboard({ publish: result.publish })
  assert.equal(canPublishToDashboard(approved, { confirm: false }).allowed, false)
  assert.equal(canPublishToDashboard(approved, { confirm: true }).allowed, true)
})

test('approval action handlers approve reject and request revision', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-approval-actions-'))
  const blocked = await createProjectFromPrompt({ prompt: 'Make a compact robotics controller with CAN and USB-C.', outputDir: dir })
  assert.equal(blocked.status, 'BOARD_FORGE_CREATE_BLOCKED_BRIEF_APPROVAL_REQUIRED')
  const approved = await applyProjectApprovalAction({ projectDir: dir, action: 'approve-brief', note: 'looks good' })
  assert.equal(approved.manifest.projectState, 'brief_approved')
  assert.equal(approved.manifest.briefApproved, true)
  const revision = await applyProjectApprovalAction({ projectDir: dir, action: 'request-revision', note: 'move CAN connector to edge' })
  assert.equal(revision.manifest.projectState, 'revision_requested')
  assert.ok(revision.manifest.revision.latestBrief.endsWith('BoardForge_Board_Brief_v2.md'))
  const rejected = await applyProjectApprovalAction({ projectDir: dir, action: 'reject-brief', note: 'wrong shape' })
  assert.equal(rejected.manifest.projectState, 'brief_rejected')
})

test('CLI brief approval commands create approval state transitions', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-cli-approval-'))
  execFileSync(process.execPath, [cliPath, 'brief', '--prompt', 'Make a compact robotics controller with CAN and USB-C.', '--output', dir], { encoding: 'utf8' })
  const approved = JSON.parse(execFileSync(process.execPath, [cliPath, 'approve-brief', '--project', dir], { encoding: 'utf8' }))
  assert.equal(approved.manifest.projectState, 'brief_approved')
  const revision = JSON.parse(execFileSync(process.execPath, [cliPath, 'request-revision', '--project', dir, '--note', 'add PWM labels'], { encoding: 'utf8' }))
  assert.equal(revision.manifest.projectState, 'revision_requested')
})

test('brief revision flow creates v2 brief and history file', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-brief-revision-'))
  await createProjectFromPrompt({ prompt: 'Make a compact robotics controller.', outputDir: dir })
  const revision = await applyProjectApprovalAction({ projectDir: dir, action: 'request-revision', note: 'use mounting ears' })
  const history = JSON.parse(await readFile(revision.manifest.revision.historyPath, 'utf8'))
  assert.equal(history.at(-1).version, 2)
  assert.match(history.at(-1).note, /mounting ears/)
})

test('question flow approval e2e blocks build then approves candidate and publish gate', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-e2e-'))
  const pending = await createProjectFromPrompt({ prompt: 'Make a compact robotics controller with CAN and USB-C.', outputDir: dir })
  assert.equal(pending.projectCreated, false)
  assert.equal(pending.publish.projectState, 'brief_pending_approval')
  await applyProjectApprovalAction({ projectDir: dir, action: 'approve-brief' })
  const created = await createProjectFromPrompt({ prompt: 'Make a compact robotics controller with CAN and USB-C.', outputDir: dir, approveBrief: true, devBypass: true })
  assert.equal(created.publish.projectState, 'local_candidate')
  assert.equal(created.publish.dashboardVisible, false)
  assert.equal(canPublishToDashboard({ publish: created.publish }, { confirm: true }).allowed, false)
})

test('web brief approval UI exposes approve reject revise and publish controls', async () => {
  const projectPage = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'app', 'projects', '[id]', 'page.tsx'), 'utf8')
  assert.match(projectPage, /Board Brief and Approval/)
  assert.match(projectPage, /Publish to Dashboard/)
  assert.match(projectPage, /Archive/)
  assert.match(projectPage, /Revise \/ Rerun/)
})

test('KiCad plugin brief approval status exposes approval actions', async () => {
  const plugin = await readFile(kicadPluginPath, 'utf8')
  const bridge = await readFile(kicadBridgePath, 'utf8')
  assert.match(plugin, /approve_brief/)
  assert.match(plugin, /reject_brief|request_revision|request-revision/)
  assert.match(bridge, /briefApprovalRequired/)
  assert.match(bridge, /briefReport/)
})

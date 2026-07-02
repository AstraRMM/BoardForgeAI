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
import { BOARD_TYPE_QUESTION_TREES } from '../lib/intake/board-type-question-trees.mjs'
import { selectedConditionalFollowups } from '../lib/intake/conditional-followups.mjs'
import { getQuestionTree } from '../lib/intake/board-type-question-trees.mjs'
import { generateBoardBrief, writeBoardBrief } from '../lib/intake/board-brief-generator.mjs'
import { canBuildFromBrief } from '../lib/intake/board-brief-approval-gate.mjs'
import { defaultAssumptionsFor } from '../lib/intake/default-assumption-engine.mjs'
import { createIntakeSession, writeIntakeSession } from '../lib/intake/intake-session-state.mjs'
import { createProjectFromPrompt } from '../lib/engine/create-project-from-prompt.mjs'
import { applyProjectApprovalAction } from '../lib/platform/project-approval-actions.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const cliPath = path.join(repoRoot, 'plugins', 'boardforge-plugin', 'bin', 'boardforge-cli.mjs')
const demoPath = path.join(repoRoot, 'plugins', 'boardforge-plugin', 'bin', 'boardforge-alpha-demo.mjs')
const kicadPluginPath = path.join(repoRoot, 'kicad-plugin', 'boardforge_action_plugin.py')
const kicadBridgePath = path.join(repoRoot, 'kicad-plugin', 'boardforge_status_bridge.py')
const launcherDir = path.join(repoRoot, 'tools', 'boardforge-launcher')
const installerDir = path.join(repoRoot, 'tools', 'boardforge-installer')

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

test('board type question trees cover prompt layer board families with risk metadata', () => {
  const expected = [
    'robotics_controller',
    'usb_c_mcu_board',
    'can_sensor_node',
    'poe_environment_sensor',
    'industrial_io_board',
    'custom_outline_board',
    'tiny_2layer_sensor',
    'wearable_sensor_puck',
    'connector_heavy_robot_board',
    'odd_shape_robot_board',
    'imported_project_repair',
  ]
  for (const boardType of expected) {
    const tree = BOARD_TYPE_QUESTION_TREES[boardType]
    assert.ok(tree, `${boardType} tree exists`)
    assert.ok(tree.intentKeywords.length > 0, `${boardType} has keywords`)
    assert.ok(tree.sourcingRisks.length > 0, `${boardType} has sourcing risks`)
    assert.ok(tree.manufacturingRisks.length > 0, `${boardType} has manufacturing risks`)
    assert.ok(tree.routingRisks.length > 0, `${boardType} has routing risks`)
  }
})

test('minimum question mode limits robotics intake to useful questions and skips PoE', () => {
  const plan = runQuestionEngine({ prompt: 'Make a compact robotics controller with CAN, USB-C, I2C, UART/GPS, and PWM.' })
  assert.equal(plan.minimumQuestionMode, true)
  assert.ok(plan.questionsToAsk.length <= 7)
  assert.ok(plan.conditionalFollowups.includes('can_interface'))
  assert.ok(plan.conditionalFollowups.includes('usb_c_mode'))
  assert.ok(plan.conditionalFollowups.includes('pwm_servo_outputs'))
  assert.equal(plan.conditionalFollowups.includes('poe_isolation'), false)
  assert.ok(plan.questionsToAsk.includes('controller_preference'))
})

test('default assumption engine records PoE and imported project safety assumptions', () => {
  assert.ok(defaultAssumptionsFor('poe_environment_sensor', {}).includes('poe_safety_compliance_requires_engineering_review'))
  assert.ok(defaultAssumptionsFor('imported_project_repair', {}).includes('source_project_is_never_mutated_before_sandbox_copy'))
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

test('CLI intake and answer commands write local intake session artifacts', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-cli-intake-'))
  const intake = JSON.parse(execFileSync(process.execPath, [cliPath, 'intake', '--prompt', 'Make a compact robotics controller with CAN, USB-C, I2C, UART/GPS, and PWM.', '--output', dir], { encoding: 'utf8' }))
  assert.equal(intake.status, 'BOARD_FORGE_INTAKE_SESSION_WRITTEN')
  assert.equal(intake.session.boardType, 'robotics_controller')
  assert.ok(intake.session.questionsToAsk.length <= 7)
  const answered = JSON.parse(execFileSync(process.execPath, [cliPath, 'answer', '--session', intake.file, '--output', dir, '--answers', '{"manufacturing_target":"JLCPCB"}'], { encoding: 'utf8' }))
  assert.equal(answered.session.answers.manufacturing_target, 'JLCPCB')
})

test('prompt layer test matrix infers board types and keeps builds approval-gated', () => {
  const matrix = [
    ['Make a compact robotics controller with CAN, USB-C, I2C, UART/GPS, and PWM.', 'robotics_controller'],
    ['Make a tiny 2-layer temperature sensor board.', 'tiny_2layer_sensor'],
    ['Make a PoE environmental sensor.', 'poe_environment_sensor'],
    ['Make an industrial 24V input/output board.', 'industrial_io_board'],
    ['Make a wearable circular sensor puck.', 'wearable_sensor_puck'],
    ['Make an odd-shaped board with mounting ears.', 'custom_outline_board'],
    ['Make a connector-heavy robot board.', 'connector_heavy_robot_board'],
    ['Import and repair an existing KiCad project.', 'imported_project_repair'],
    ['Make a USB-C STM32 development board.', 'usb_c_mcu_board'],
    ['Make a CAN sensor node with screw terminal power.', 'can_sensor_node'],
  ]
  for (const [prompt, expectedType] of matrix) {
    const plan = runQuestionEngine({ prompt })
    const brief = generateBoardBrief({ prompt, plan })
    const gate = canBuildFromBrief(brief)
    assert.equal(plan.boardType, expectedType, prompt)
    assert.ok(plan.questionsToAsk.length <= 7, prompt)
    assert.equal(gate.allowed, false, prompt)
  }
})

test('prompt layer approved sync integration keeps local candidates dashboard hidden', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-prompt-sync-'))
  const session = createIntakeSession({ prompt: 'Make an odd-shaped board with mounting ears.', outputDir: dir })
  const written = await writeIntakeSession({ session, outputDir: dir })
  assert.equal(written.session.status, 'brief_pending_approval')
  const created = await createProjectFromPrompt({ prompt: session.prompt, outputDir: dir, approveBrief: true, devBypass: true })
  assert.equal(created.publish.projectState, 'local_candidate')
  assert.equal(created.publish.dashboardVisible, false)
  assert.equal(canPublishToDashboard({ publish: created.publish }, { confirm: true }).allowed, false)
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

test('web intake UI exposes questions brief preview and local artifact truth', async () => {
  const newBoardPage = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'app', 'new-board', 'page.tsx'), 'utf8')
  const intakeLib = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'lib', 'boardforge-intake.ts'), 'utf8')
  const questionList = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'components', 'intake', 'IntakeQuestionList.tsx'), 'utf8')
  const briefPanel = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'components', 'project', 'BoardBriefPanel.tsx'), 'utf8')
  assert.match(newBoardPage, /BoardBriefApprovalActions/)
  assert.match(intakeLib, /robotics_controller/)
  assert.match(questionList, /Minimum useful questions/)
  assert.match(briefPanel, /blocked_before_approval/)
})

test('KiCad plugin brief approval status exposes approval actions', async () => {
  const plugin = await readFile(kicadPluginPath, 'utf8')
  const bridge = await readFile(kicadBridgePath, 'utf8')
  assert.match(plugin, /approve_brief/)
  assert.match(plugin, /reject_brief|request_revision|request-revision/)
  assert.match(bridge, /briefApprovalRequired/)
  assert.match(bridge, /briefReport/)
})

test('KiCad plugin intake status exposes build and publish gates', async () => {
  const plugin = await readFile(kicadPluginPath, 'utf8')
  const bridge = await readFile(kicadBridgePath, 'utf8')
  assert.match(plugin, /Prompt intake session/)
  assert.match(plugin, /Build gate: blocked until board brief approval/)
  assert.match(bridge, /intakeStatus/)
  assert.match(bridge, /publishAllowed/)
})

test('alpha launcher scripts expose environment dashboard and demo flow', async () => {
  const start = await readFile(path.join(launcherDir, 'BoardForge_Start_Local_Alpha.ps1'), 'utf8')
  const check = await readFile(path.join(launcherDir, 'BoardForge_Check_Environment.ps1'), 'utf8')
  const demo = await readFile(path.join(launcherDir, 'BoardForge_Run_Demo.cmd'), 'utf8')
  assert.match(start, /BoardForge_Check_Environment/)
  assert.match(start, /npm run dev:web/)
  assert.match(check, /Git/)
  assert.match(check, /KiCad CLI/)
  assert.match(check, /DIGIKEY_CLIENT_ID/)
  assert.match(check, /FreeRouting jar/)
  assert.match(demo, /npm run boardforge:demo/)
})

test('alpha installer scripts package unsigned local alpha honestly', async () => {
  const build = await readFile(path.join(installerDir, 'Build_BoardForge_Local_Alpha_Package.ps1'), 'utf8')
  const install = await readFile(path.join(installerDir, 'BoardForge_Local_Alpha_Install.ps1'), 'utf8')
  const uninstall = await readFile(path.join(installerDir, 'BoardForge_Local_Alpha_Uninstall.ps1'), 'utf8')
  assert.match(build, /UNSIGNED_LOCAL_ALPHA_PACKAGE/)
  assert.match(build, /CodeSigningCert/)
  assert.match(install, /local development workspace/)
  assert.match(uninstall, /does not delete project fixtures/)
})

test('alpha demo runner completes and writes product-facing reports', async () => {
  const output = JSON.parse(execFileSync(process.execPath, [demoPath], { encoding: 'utf8', env: { ...process.env, BOARDFORGE_DEV_LICENSE: 'true' } }))
  assert.equal(output.status, 'BOARD_FORGE_ALPHA_DEMO_COMPLETED')
  const status = JSON.parse(await readFile(output.reports.status, 'utf8'))
  assert.equal(status.localArtifactBased, true)
  assert.equal(status.noFakeCloudExecution, true)
  assert.ok(status.steps.some((step) => step.step === 'publish_without_confirm'))
  assert.ok(status.steps.some((step) => step.step === 'publish_with_confirm_temp_copy'))
})

test('web dashboard demo data labels local artifact status and demo command', async () => {
  const dashboardPage = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'app', 'dashboard', 'page.tsx'), 'utf8')
  const newBoardPage = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'app', 'new-board', 'page.tsx'), 'utf8')
  const uploadPage = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'app', 'upload-kicad', 'page.tsx'), 'utf8')
  const demoPage = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'app', 'demo', 'page.tsx'), 'utf8')
  const customPage = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'app', 'custom-board-generator', 'page.tsx'), 'utf8')
  assert.match(dashboardPage, /Local engine artifact/)
  assert.match(dashboardPage, /npm run boardforge:demo/)
  assert.match(newBoardPage, /Premium intake flow/)
  assert.match(uploadPage, /Local-only import/)
  assert.match(demoPage, /BoardForge local alpha demo/)
  assert.match(customPage, /Custom Board Generator/)
})

test('downloads page shows PCB fab assembly and blocked manufacturing states', async () => {
  const downloadsPage = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'app', 'downloads', 'page.tsx'), 'utf8')
  assert.match(downloadsPage, /PCB_FAB_READY/)
  assert.match(downloadsPage, /ASSEMBLY_READY_NOT_VERIFIED/)
  assert.match(downloadsPage, /BLOCKED_COMPLIANCE_REVIEW/)
})

test('KiCad plugin install docs mention helper and no forced install', async () => {
  const installDoc = await readFile(path.join(repoRoot, 'docs', 'KICAD_PLUGIN_INSTALL.md'), 'utf8')
  const helper = await readFile(path.join(launcherDir, 'BoardForge_Install_KiCad_Plugin.ps1'), 'utf8')
  assert.match(installDoc, /BoardForge_Install_KiCad_Plugin/)
  assert.match(installDoc, /copies the plugin only/)
  assert.match(helper, /--demo/)
  assert.match(helper, /BoardForge_KiCad_Plugin_Install_Report/)
})

test('CLI help lists alpha demo and approval examples', () => {
  const help = JSON.parse(execFileSync(process.execPath, [cliPath, 'help'], { encoding: 'utf8' }))
  assert.match(help.usage, /demo/)
  assert.equal(help.commands.demo.includes('guided local alpha demo'), true)
  assert.ok(help.examples.some((example) => example.includes('boardforge:demo')))
  assert.ok(help.examples.some((example) => example.includes('boardforge:brief')))
})

test('local alpha docs describe launcher demo and external blockers', async () => {
  const quickstart = await readFile(path.join(repoRoot, 'docs', 'BOARD_FORGE_LOCAL_ALPHA_QUICKSTART.md'), 'utf8')
  const current = await readFile(path.join(repoRoot, 'docs', 'BOARD_FORGE_CURRENT_STATE.md'), 'utf8')
  const dependencies = await readFile(path.join(repoRoot, 'docs', 'BOARD_FORGE_DEPENDENCY_SETUP.md'), 'utf8')
  assert.match(quickstart, /BoardForge_Start_Local_Alpha/)
  assert.match(quickstart, /npm run boardforge:demo/)
  assert.match(current, /supplier API keys/i)
  assert.match(current, /PoE compliance/i)
  assert.match(dependencies, /kicad-cli/)
  assert.match(dependencies, /FreeRouting/)
})

test('alpha release candidate report is honest about local alpha status', async () => {
  const report = await readFile(path.join(repoRoot, 'BoardForge_Alpha_Release_Candidate_Report.md'), 'utf8')
  const checklist = await readFile(path.join(repoRoot, 'BoardForge_Alpha_Demo_Checklist.md'), 'utf8')
  const surface = await readFile(path.join(repoRoot, 'BoardForge_Product_Surface_Status.md'), 'utf8')
  assert.match(report, /local alpha release candidate/)
  assert.match(report, /Supplier API credentials/)
  assert.match(checklist, /publish succeeds with `--confirm`/)
  assert.match(surface, /Launcher/)
})

test('crazy outline test plan prepares future shape fixtures without claiming completion', async () => {
  const plan = await readFile(path.join(repoRoot, 'docs', 'BOARD_FORGE_CRAZY_OUTLINE_TEST_PLAN.md'), 'utf8')
  const generator = await readFile(path.join(repoRoot, 'docs', 'BOARD_FORGE_CUSTOM_OUTLINE_GENERATOR_PLAN.md'), 'utf8')
  assert.match(plan, /internal cutout/)
  assert.match(plan, /BF-CRAZY-OUTLINE-DRONE-STACK-01/)
  assert.match(generator, /Reject shapes with likely routing collapse/)
})

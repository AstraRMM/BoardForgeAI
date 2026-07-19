import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
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
import { startConversationSession, writeConversationSession, writeConversationBrief } from '../lib/intake/conversation-session.mjs'
import { applyConversationAnswers } from '../lib/intake/conversation-answer-applier.mjs'
import { canBuildFromConversation, transitionConversation } from '../lib/intake/conversation-state-machine.mjs'
import { summarizeConversation } from '../lib/intake/conversation-summary.mjs'
import { createProjectFromPrompt } from '../lib/engine/create-project-from-prompt.mjs'
import { applyProjectApprovalAction } from '../lib/platform/project-approval-actions.mjs'
import { runApprovedSyncValidation } from '../lib/platform/approved-sync-validation.mjs'
import { CRAZY_OUTLINE_SHAPES, runCrazyOutlineStressSuite, scoreCrazyOutlineShape } from '../lib/outline/crazy-outline-stress-suite.mjs'
import { createLocalArtifactApi } from '../lib/platform/local-artifact-api.mjs'
import { startBoardForgeLocalServer } from '../lib/platform/local-server/http-server.mjs'
import { exportCustomOutlineSeed } from '../lib/outline/custom-outline-seed-export.mjs'
import { writeBoardPreview } from '../lib/preview/board-preview-generator.mjs'
import { createJobQueue } from '../lib/platform/jobs/job-queue.mjs'
import { writeBoardReviewReports } from '../lib/review/board-review-engine.mjs'
import { writeProjectHealthScore } from '../lib/platform/project-health-score.mjs'
import { writeManufacturingRiskReport } from '../lib/manufacturing/manufacturability-risk-score.mjs'
import { writeRouteabilityExplanation } from '../lib/routeability/routeability-explainer.mjs'
import { writeProjectDiffReport } from '../lib/diff/project-version-diff.mjs'
import { writeBlockerReport } from '../lib/blockers/blocker-report.mjs'
import { writeAppliedLessonsReport } from '../lib/solution-library/applied-lessons-report.mjs'
import { runOddShapeWebFlowProof } from '../lib/engine/odd-shape-web-flow-proof.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const cliPath = path.join(repoRoot, 'plugins', 'boardforge-plugin', 'bin', 'boardforge-cli.mjs')
const demoPath = path.join(repoRoot, 'plugins', 'boardforge-plugin', 'bin', 'boardforge-alpha-demo.mjs')
const localhostDemoPath = path.join(repoRoot, 'plugins', 'boardforge-plugin', 'bin', 'boardforge-localhost-service-demo.mjs')
const productDemoReviewPath = path.join(repoRoot, 'plugins', 'boardforge-plugin', 'bin', 'boardforge-product-demo-review.mjs')
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

test('conversation session starts from prompt and writes local state plus brief', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-conversation-'))
  const session = startConversationSession({ prompt: 'Make a compact robotics controller with CAN and USB-C.', outputDir: dir })
  assert.equal(session.boardType, 'robotics_controller')
  assert.equal(session.currentStage, 'intake')
  assert.ok(session.questionsAsked.length <= 7)
  const written = await writeConversationSession({ session, outputDir: dir })
  const brief = await writeConversationBrief({ session: written.session, outputDir: dir })
  assert.equal(path.basename(written.file), 'BoardForge_Conversation_Session.json')
  assert.equal(path.basename(brief.files.markdown), 'BoardForge_Board_Brief.md')
})

test('conversation answer applier triggers followups and updates assumptions', () => {
  const session = startConversationSession({ prompt: 'Make a compact robotics controller.' })
  const next = applyConversationAnswers(session, { interfaces_needed: 'CAN USB PWM', power_input: 'USB-C' })
  assert.ok(next.conditionalFollowupsTriggered.includes('can_interface'))
  assert.ok(next.conditionalFollowupsTriggered.includes('usb_c_mode'))
  assert.ok(next.conditionalFollowupsTriggered.includes('pwm_servo_outputs'))
})

test('conversation state machine blocks build before approval then allows it', () => {
  const session = startConversationSession({ prompt: 'Make a compact robotics controller.' })
  assert.equal(canBuildFromConversation(session).allowed, false)
  const approved = transitionConversation(session, 'approve')
  assert.equal(canBuildFromConversation(approved).allowed, true)
  const summary = summarizeConversation(approved)
  assert.equal(summary.buildBlocked, false)
})

test('CLI live intake flow writes conversation session and supports answer update', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-cli-live-'))
  const intake = JSON.parse(execFileSync(process.execPath, [cliPath, 'intake', '--prompt', 'Make a compact robotics controller with CAN and USB-C.', '--output', dir], { encoding: 'utf8' }))
  assert.equal(path.basename(intake.file), 'BoardForge_Conversation_Session.json')
  const answered = JSON.parse(execFileSync(process.execPath, [cliPath, 'answer', '--session', intake.file, '--output', dir, '--answers', '{"interfaces_needed":"CAN USB PWM"}'], { encoding: 'utf8' }))
  assert.ok(answered.session.conditionalFollowupsTriggered.includes('pwm_servo_outputs'))
})

test('approved sync validation proves hidden drafts candidates and confirm-only publish', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-sync-validation-'))
  const validation = await runApprovedSyncValidation({ outputDir: dir })
  assert.equal(validation.result.localDraftHidden, true)
  assert.equal(validation.result.localCandidateHidden, true)
  assert.equal(validation.result.publishBlockedWithoutConfirm, true)
  assert.equal(validation.result.publishWithConfirm, true)
  assert.equal(validation.result.rejectedFailedHidden, true)
})

test('local artifact API runs intake answer approve create and project status', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'boardforge-local-api-'))
  const api = createLocalArtifactApi({ rootDir: root })
  assert.equal((await api.status()).mode, 'artifact-backed')
  const intake = await api.startIntake({ prompt: 'Make a compact robotics controller with USB-C and CAN.', projectId: 'api-project' })
  const answered = await api.answerIntake({ sessionFile: intake.sessionFile, answers: { interfaces_needed: 'USB CAN PWM', manufacturing_target: 'JLCPCB' } })
  const approved = await api.approveBrief({ sessionFile: answered.sessionFile })
  const created = await api.createProject({ sessionFile: approved.sessionFile, devBypass: true })
  assert.equal(created.status, 'BOARD_FORGE_CREATE_LOCAL_CANDIDATE')
  const status = await api.projectStatus({ projectDir: path.dirname(approved.sessionFile) })
  assert.equal(status.projectState, 'local_candidate')
})

test('custom outline seed export writes outline seed and outline-only KiCad project', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-outline-seed-'))
  const seed = await exportCustomOutlineSeed({ projectDir: dir, preset: 'mounting ears' })
  assert.equal(seed.seed.edgeCutsValid, true)
  assert.match(await readFile(seed.files.outlinePcb, 'utf8'), /Edge.Cuts/)
})

test('custom outline to kicad project creates odd-shape generated board artifacts', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-odd-shape-'))
  const result = await runOddShapeWebFlowProof({ projectDir: dir })
  assert.equal(result.validation.drc, 0)
  assert.equal(result.validation.erc, 0)
  assert.equal(result.validation.unconnected, 0)
  assert.ok(result.manufacturing.zip.endsWith('_JLCPCB.zip'))
})

test('web odd shape generated board is local candidate and not autopublished', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-odd-shape-state-'))
  await runOddShapeWebFlowProof({ projectDir: dir })
  const manifest = JSON.parse(await readFile(path.join(dir, 'BoardForge_Project_Manifest.json'), 'utf8'))
  assert.equal(manifest.projectState, 'local_candidate')
  assert.equal(manifest.dashboardVisible, false)
  assert.equal(manifest.publishApproved, false)
})

test('publish confirm required before generated project can publish', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-publish-confirm-'))
  await runOddShapeWebFlowProof({ projectDir: dir })
  const api = createLocalArtifactApi({ rootDir: path.dirname(dir) })
  const blocked = await api.publishProject({ projectDir: dir, confirm: false })
  assert.equal(blocked.status, 'BOARD_FORGE_PUBLISH_BLOCKED_CONFIRM_REQUIRED')
  const published = await api.publishProject({ projectDir: dir, confirm: true })
  assert.equal(published.manifest.dashboardVisible, true)
})

test('board preview generator writes SVG and JSON card inputs', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-preview-'))
  const preview = await writeBoardPreview({ projectDir: dir, projectName: 'preview', outline: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }], components: [{ ref: 'U1', x: 10, y: 10 }], connectors: [{ ref: 'J1', x: 2, y: 10 }], status: { drc: 0, erc: 0 } })
  assert.match(await readFile(preview.svg, 'utf8'), /<svg/)
  assert.equal(JSON.parse(await readFile(preview.json, 'utf8')).projectName, 'preview')
})

test('downloads center and web local artifact client expose manufacturing and offline behavior', async () => {
  const downloadsPage = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'app', 'downloads', 'page.tsx'), 'utf8')
  const artifactClient = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'lib', 'boardforge-local-artifact-client.ts'), 'utf8')
  const engineClient = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'lib', 'boardforge-local-engine-client.ts'), 'utf8')
  assert.match(downloadsPage, /Gerbers, drill files, BOM, CPL/)
  assert.ok(artifactClient.includes('POST /intake/start'))
  assert.match(engineClient, /Local Engine is offline/)
})

test('kicad plugin generated project status exposes preview and dashboard page', async () => {
  const plugin = await readFile(kicadPluginPath, 'utf8')
  const bridge = await readFile(kicadBridgePath, 'utf8')
  assert.match(plugin, /Generated odd-shape project status/)
  assert.match(bridge, /previewSvg/)
  assert.match(bridge, /dashboardProjectPage/)
})

test('cli end to end replay command is written by odd-shape proof', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-cli-replay-'))
  await runOddShapeWebFlowProof({ projectDir: dir })
  const replay = await readFile(path.join(dir, 'BoardForge_CLI_Replay_Command.txt'), 'utf8')
  assert.match(replay, /boardforge:odd-shape-web-proof/)
})

test('crazy outline stress suite scores shapes and exports only good candidates', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-crazy-outline-'))
  const summary = await runCrazyOutlineStressSuite({ rootDir: dir })
  assert.equal(summary.shapesTested, CRAZY_OUTLINE_SHAPES.length)
  assert.ok(summary.passed > 0)
  assert.ok(summary.failed > 0)
  assert.ok(summary.manufacturingExports > 0)
})

test('routeability scoring crazy shapes filters weak candidates', () => {
  const strong = scoreCrazyOutlineShape('BF-CRAZY-OUTLINE-ROUND-01')
  const weak = scoreCrazyOutlineShape('BF-CRAZY-OUTLINE-CUSTOM-POLYGON-01')
  assert.equal(strong.recommended, true)
  assert.equal(weak.recommended, false)
  assert.equal(weak.risk, 'high')
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
  const intakeWorkspace = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'components', 'intake', 'NewBoardIntakeWorkspace.tsx'), 'utf8')
  assert.match(newBoardPage, /NewBoardIntakeWorkspace/)
  assert.match(intakeWorkspace, /\/intake\/start/)
  assert.match(intakeWorkspace, /\/intake\/answer/)
  assert.match(intakeWorkspace, /\/brief\/approve/)
  assert.match(intakeWorkspace, /Nothing creates or changes KiCad files from this page/)
})

test('web live intake UI exposes conversation panels and artifact-backed outline generator', async () => {
  const newBoardPage = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'app', 'new-board', 'page.tsx'), 'utf8')
  const intakeWorkspace = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'components', 'intake', 'NewBoardIntakeWorkspace.tsx'), 'utf8')
  const outlinePage = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'app', 'custom-board-generator', 'page.tsx'), 'utf8')
  const outlineWorkspace = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'components', 'generator', 'GeneratorWorkspace.tsx'), 'utf8')
  const outlineExport = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'lib', 'outline-export.ts'), 'utf8')
  assert.match(newBoardPage, /NewBoardIntakeWorkspace/)
  assert.match(intakeWorkspace, /projectId/)
  assert.match(outlinePage, /GeneratorWorkspace/)
  assert.match(outlineWorkspace, /OutlineValidationPanel/)
  assert.match(outlineExport, /BoardForge_Custom_Outline_Project_Seed|DRC_ERC_CONNECTIVITY/)
})

test('custom outline generator has presets validation and seed export components', async () => {
  const picker = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'components', 'outline', 'OutlinePresetPicker.tsx'), 'utf8')
  const editor = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'components', 'outline', 'OutlineEditor.tsx'), 'utf8')
  const validation = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'components', 'outline', 'OutlineValidationPanel.tsx'), 'utf8')
  assert.match(picker, /mounting ears/)
  assert.match(editor, /boardforge\.custom-outline-project-seed\.web\.v2/)
  assert.match(editor, /Generate KiCad outline/)
  assert.match(editor, /validation\.valid/)
  assert.match(editor, /mountingHolesMm/)
  assert.match(validation, /Edge.Cuts closed/)
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
  assert.match(uploadPage, /redirect\('\/import'\)/)
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

test('local server health and status return structured JSON', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-local-server-health-'))
  const { server, baseUrl } = await startTestLocalServer(rootDir)
  try {
    const health = await localFetch(baseUrl, '/health')
    const status = await localFetch(baseUrl, '/status')
    assert.equal(health.ok, true)
    assert.equal(health.status, 'BOARD_FORGE_LOCAL_SERVER_HEALTHY')
    assert.equal(status.ok, true)
    assert.equal(status.data.noFakeCloudExecution, true)
  } finally {
    server.close()
  }
})

test('local server intake flow and brief approval work through HTTP', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-local-server-intake-'))
  const { server, baseUrl } = await startTestLocalServer(rootDir)
  try {
    const intake = await localFetch(baseUrl, '/intake/start', 'POST', { projectId: 'demo', prompt: 'Make a compact robotics controller with CAN and USB-C.' })
    const answered = await localFetch(baseUrl, '/intake/answer', 'POST', { projectId: 'demo', answers: { usb_c: 'power + data', can: 'default termination' } })
    const approved = await localFetch(baseUrl, '/brief/approve', 'POST', { projectId: 'demo' })
    const created = await localFetch(baseUrl, '/project/create', 'POST', { projectId: 'demo' })
    assert.equal(intake.ok, true)
    assert.equal(answered.ok, true)
    assert.equal(approved.status, 'BOARD_FORGE_BRIEF_APPROVED')
    assert.equal(created.status, 'BOARD_FORGE_CREATE_LOCAL_CANDIDATE')
    assert.equal(created.data.projectCreated, true)
    assert.equal(created.data.projectState, 'local_candidate')
    assert.equal('manifestPath' in created.data, false)
  } finally {
    server.close()
  }
})

test('local server create project generates odd-shape candidate and project status', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-local-server-create-'))
  const projectDir = path.join(rootDir, 'odd')
  const { server, baseUrl } = await startTestLocalServer(rootDir)
  try {
    const created = await localFetch(baseUrl, '/project/create', 'POST', { projectId: 'odd', projectDir, oddShapeProof: true })
    const status = await localFetch(baseUrl, `/project/odd/status?projectDir=${encodeURIComponent(projectDir)}`)
    const reports = await localFetch(baseUrl, `/project/odd/reports?projectDir=${encodeURIComponent(projectDir)}`)
    const downloads = await localFetch(baseUrl, `/project/odd/downloads?projectDir=${encodeURIComponent(projectDir)}`)
    assert.equal(created.ok, true)
    assert.equal(created.data.validation.drc, 0)
    assert.equal(status.data.projectState, 'local_candidate')
    assert.equal(reports.data.validation.drcViolations, 0)
    assert.equal('boardPath' in reports.data, false)
    assert.equal(downloads.data.artifacts.package, true)
    assert.equal(downloads.data.browserTransferAvailable, false)
    assert.equal('zip' in downloads.data, false)
    assert.equal(status.data.dashboardVisible, false)
  } finally {
    server.close()
  }
})

test('local server publish confirm and protected path guard are enforced', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-local-server-publish-'))
  const projectDir = path.join(rootDir, 'odd')
  const { server, baseUrl } = await startTestLocalServer(rootDir)
  try {
    await localFetch(baseUrl, '/project/create', 'POST', { projectId: 'odd', projectDir, oddShapeProof: true })
    const blocked = await localFetch(baseUrl, '/project/odd/publish', 'POST', { projectDir }, false)
    const published = await localFetch(baseUrl, '/project/odd/publish', 'POST', { projectDir, confirm: true })
    const protectedRefused = await localFetch(baseUrl, `/project/protected/status?projectDir=${encodeURIComponent('C:\\Users\\luifi\\Desktop\\FN-ESC1\\SomeBoard')}`, 'GET', null, false)
    assert.equal(blocked.ok, false)
    assert.equal(blocked.status, 'BOARD_FORGE_PUBLISH_BLOCKED_CONFIRM_REQUIRED')
    assert.equal(published.ok, true)
    assert.equal(protectedRefused.ok, false)
    assert.equal(protectedRefused.status, 'BOARD_FORGE_PROJECT_PATH_REFUSED')
  } finally {
    server.close()
  }
})

test('web localhost engine client exposes service URL offline copy and fetch client', async () => {
  const artifactClient = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'lib', 'boardforge-local-artifact-client.ts'), 'utf8')
  const sessionClient = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'lib', 'boardforge-local-engine-session.ts'), 'utf8')
  const pairingClient = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'lib', 'boardforge-local-engine-pairing-client.ts'), 'utf8')
  const pairingPanel = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'components', 'engine', 'BrowserLocalEnginePairing.tsx'), 'utf8')
  const newBoardPage = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'app', 'new-board', 'page.tsx'), 'utf8')
  assert.match(artifactClient, /127\.0\.0\.1:38991/)
  assert.match(artifactClient, /callBoardForgeLocalEngine/)
  assert.match(artifactClient, /method === 'POST'/)
  assert.match(artifactClient, /x-boardforge-token/)
  assert.match(sessionClient, /sessionStorage/)
  assert.doesNotMatch(sessionClient, /localStorage/)
  assert.match(pairingClient, /pairing\/code/)
  assert.match(pairingClient, /pairing\/verify/)
  assert.match(pairingPanel, /Pair browser/)
  assert.doesNotMatch(pairingPanel, /console\./)
  assert.match(artifactClient, /protected desktop helper service/)
  assert.match(newBoardPage, /NewBoardIntakeWorkspace/)
})

test('KiCad plugin localhost status advertises health and guarded service actions', async () => {
  const plugin = await readFile(kicadPluginPath, 'utf8')
  const bridge = await readFile(kicadBridgePath, 'utf8')
  assert.match(plugin, /boardforge:local-health/)
  assert.match(plugin, /boardforge:local-server/)
  assert.match(bridge, /127\.0\.0\.1:38991/)
  assert.match(bridge, /GET \/health/)
})

test('CLI local client includes health status intake publish and downloads commands', async () => {
  const client = await readFile(path.join(repoRoot, 'plugins', 'boardforge-plugin', 'bin', 'boardforge-local-client.mjs'), 'utf8')
  const pkg = await readFile(path.join(repoRoot, 'package.json'), 'utf8')
  assert.match(client, /start-intake/)
  assert.match(client, /approve-brief/)
  assert.match(client, /downloads/)
  assert.match(pkg, /boardforge:local-server/)
  assert.match(pkg, /boardforge:local-health/)
})

test('localhost service demo creates board through local service and writes trace', () => {
  const rootDir = path.join(os.tmpdir(), `boardforge-localhost-demo-${Date.now()}`)
  const output = JSON.parse(execFileSync(process.execPath, [localhostDemoPath, '--root', rootDir, '--port', '38993'], { encoding: 'utf8' }))
  assert.equal(output.status, 'BOARD_FORGE_LOCALHOST_SERVICE_DEMO_COMPLETED')
  assert.equal(output.validation.drc, 0)
  assert.equal(output.validation.erc, 0)
  assert.match(output.manufacturingZip, /JLCPCB\.zip/)
})

test('web UI local engine actions expose status bar badges and action routes', async () => {
  const statusBar = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'components', 'project', 'LocalEngineStatusBar.tsx'), 'utf8')
  const badges = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'components', 'project', 'StatusBadges.tsx'), 'utf8')
  const actions = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'components', 'project', 'ProjectActionPanel.tsx'), 'utf8')
  assert.match(statusBar, /boardforge:local-server/)
  assert.match(badges, /ManufacturingReadinessBadge/)
  assert.match(actions, /POST \/project\/:id\/publish confirm=true/)
  assert.match(actions, /job-backed local route wired/)
})

test('web new board interactive flow shows local service intake and brief approval', async () => {
  const newBoardPage = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'app', 'new-board', 'page.tsx'), 'utf8')
  const intakeWorkspace = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'components', 'intake', 'NewBoardIntakeWorkspace.tsx'), 'utf8')
  assert.match(newBoardPage, /NewBoardIntakeWorkspace/)
  assert.match(intakeWorkspace, /checkBoardForgeLocalEngine/)
  assert.match(intakeWorkspace, /Approve engineering brief/)
  assert.match(intakeWorkspace, /projectId/)
})

test('web custom outline interactive flow connects outline presets to local service actions', async () => {
  const customPage = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'app', 'custom-board-generator', 'page.tsx'), 'utf8')
  const generatorWorkspace = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'components', 'generator', 'GeneratorWorkspace.tsx'), 'utf8')
  const outlineEditor = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'components', 'outline', 'OutlineEditor.tsx'), 'utf8')
  assert.match(customPage, /GeneratorWorkspace/)
  assert.match(generatorWorkspace, /OutlinePresetPicker/)
  assert.match(generatorWorkspace, /OutlineEditor/)
  assert.match(generatorWorkspace, /OutlineValidationPanel/)
  assert.match(outlineEditor, /const \[mode, setMode\]/)
  assert.match(outlineEditor, /setMode\('draw'\)/)
  assert.match(outlineEditor, /deleteSelected/)
  assert.match(outlineEditor, /setSnap/)
  assert.match(outlineEditor, /validateOutline/)
  assert.match(outlineEditor, /bf-outline-validation-chips/)
  assert.match(outlineEditor, /action === 'generate' && !validation\.valid/)
  assert.match(outlineEditor, /callBoardForgeLocalEngine/)
  assert.doesNotMatch(outlineEditor, /fetch\(`http:\/\/127\.0\.0\.1:38991/)
})

test('web project action buttons and downloads local service parity are visible', async () => {
  const projectPage = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'app', 'projects', '[id]', 'page.tsx'), 'utf8')
  const downloadsPage = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'app', 'downloads', 'page.tsx'), 'utf8')
  assert.match(projectPage, /ProjectActionPanel/)
  assert.match(projectPage, /ProjectStateBadge/)
  assert.match(downloadsPage, /ManufacturingReadinessBadge/)
  assert.match(downloadsPage, /SourcingStatusBadge/)
})

test('legacy readiness page redirects to the evidence registry', async () => {
  const readinessPage = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'app', 'readiness', 'page.tsx'), 'utf8')
  assert.match(readinessPage, /redirect\('\/evidence'\)/)
})

test('KiCad plugin action parity advertises local service and sandbox gates', async () => {
  const plugin = await readFile(kicadPluginPath, 'utf8')
  assert.match(plugin, /Local Engine Service/)
  assert.match(plugin, /Route\/Repair\/Cleanup\/Export disabled on active project/)
  assert.match(plugin, /Publish approved project/)
})

test('CLI web action parity includes local server readiness fixtures sourcing and action routes', async () => {
  const localClient = await readFile(path.join(repoRoot, 'plugins', 'boardforge-plugin', 'bin', 'boardforge-local-client.mjs'), 'utf8')
  const pkg = await readFile(path.join(repoRoot, 'package.json'), 'utf8')
  assert.match(localClient, /readiness/)
  assert.match(localClient, /fixtures/)
  assert.match(localClient, /sourcing/)
  assert.match(localClient, /validate/)
  assert.match(pkg, /boardforge:local-readiness/)
  assert.match(pkg, /test:web-project-action-buttons/)
})

test('job queue runs board review jobs and writes pollable status', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-jobs-'))
  const projectDir = path.join(rootDir, 'BF-JOB-PROOF')
  await writeCleanManifest(projectDir)
  const api = createLocalArtifactApi({ rootDir })
  const queue = createJobQueue({ rootDir, api })
  const job = await queue.start({ type: 'run_board_review', projectId: 'BF-JOB-PROOF', payload: { projectDir } })
  assert.equal(job.status, 'succeeded')
  assert.equal(job.progress, 100)
  assert.ok(job.artifactPaths.some((file) => file.endsWith('BoardForge_Board_Review_Report.md')))
  const fetched = await queue.get(job.jobId)
  assert.equal(fetched.stage, 'complete')
})

test('board review engine writes engineering review report without claiming certification', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-review-'))
  await writeCleanManifest(projectDir)
  const result = await writeBoardReviewReports({ projectDir })
  assert.equal(result.review.title, 'BoardForge Engineering Review')
  assert.match(result.review.caveat, /not a certification/)
  assert.ok(result.artifactPaths.some((file) => file.endsWith('.json')))
})

test('project health score labels clean fab-ready board as assembly not verified', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-health-'))
  await writeCleanManifest(projectDir)
  const result = await writeProjectHealthScore({ projectDir })
  assert.equal(result.report.score, 92)
  assert.equal(result.report.label, 'Assembly Not Verified')
})

test('manufacturability risk score keeps sourcing risk separate from DRC', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-risk-'))
  await writeCleanManifest(projectDir)
  const result = await writeManufacturingRiskReport({ projectDir })
  assert.equal(result.report.riskLevel, 'low')
  assert.ok(result.report.risks.some((risk) => risk.issue === 'Assembly not supplier verified'))
})

test('routeability explainer creates factor-level explanation', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-routeability-'))
  await writeCleanManifest(projectDir)
  const result = await writeRouteabilityExplanation({ projectDir })
  assert.ok(result.report.estimatedRouteability >= 80)
  assert.ok(result.report.explanations.some((factor) => factor.name === 'ratsnest_crossing_density'))
})

test('board diff engine reports DRC and readiness changes', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'boardforge-diff-'))
  const before = path.join(root, 'before')
  const after = path.join(root, 'after')
  await writeCleanManifest(before, { validation: { drc: 4, erc: 0, shorts: 0, unconnected: 2, forbiddenVias: 0 }, manufacturing: { ready: false, state: 'BLOCKED_DRC' } })
  await writeCleanManifest(after)
  const result = await writeProjectDiffReport({ projectDir: after, compareToDir: before })
  assert.equal(result.report.drcChange.before, 4)
  assert.equal(result.report.drcChange.after, 0)
  assert.equal(result.report.manufacturingReadinessChange.after, 'PCB_FAB_READY')
})

test('board preview generator writes SVG metadata badges', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-preview-'))
  const result = await writeBoardPreview({ projectDir, projectName: 'BF-PREVIEW', status: { drc: 0, erc: 0, manufacturing: 'PCB_FAB_READY' } })
  assert.equal(result.preview.metadata.previewType, 'svg_approximation_from_local_artifacts')
  const svg = await readFile(result.svg, 'utf8')
  assert.match(svg, /PCB_FAB_READY/)
})

test('blocker report gives exact next action instead of vague failure', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-blockers-'))
  await writeCleanManifest(projectDir, { validation: { drc: 2, erc: 0, shorts: 1, unconnected: 0, forbiddenVias: 0 }, manufacturing: { ready: false, state: 'BLOCKED_DRC' } })
  const result = await writeBlockerReport({ projectDir })
  assert.ok(result.report.blockers.some((blocker) => blocker.blockerId === 'shorts_present'))
  assert.match(result.report.nextAction, /repair/)
})

test('applied lessons report makes solution library visible', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-lessons-'))
  const result = await writeAppliedLessonsReport({ projectDir })
  assert.ok(result.report.lessonsFound >= 0)
  assert.ok(result.artifactPaths.some((file) => file.endsWith('BoardForge_Applied_Lessons_Report.md')))
})

test('product demo review fixture generates clean board and differentiator reports', () => {
  const projectDir = path.join(os.tmpdir(), `BF-PRODUCT-DEMO-REVIEW-${Date.now()}`)
  const output = JSON.parse(execFileSync(process.execPath, [productDemoReviewPath, '--project-dir', projectDir], { encoding: 'utf8' }))
  assert.equal(output.status, 'BOARD_FORGE_PRODUCT_DEMO_REVIEW_COMPLETED')
  assert.equal(output.validation.drc, 0)
  assert.equal(output.validation.erc, 0)
  assert.match(output.manufacturingZip, /JLCPCB\.zip/)
  assert.ok(output.reportsGenerated.some((file) => file.endsWith('BoardForge_Project_Health_Score.json')))
})

test('web project review panels expose command center surface', async () => {
  const projectPage = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'app', 'projects', '[id]', 'page.tsx'), 'utf8')
  const actions = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'components', 'project', 'ProjectActionPanel.tsx'), 'utf8')
  assert.match(projectPage, /JobStatusPanel/)
  assert.match(projectPage, /ProjectHealthScoreCard/)
  assert.match(projectPage, /BoardReviewPanel/)
  assert.match(projectPage, /ManufacturingRiskPanel/)
  assert.match(projectPage, /RouteabilityPanel/)
  assert.match(projectPage, /ProjectDiffPanel/)
  assert.match(projectPage, /AppliedLessonsPanel/)
  assert.match(projectPage, /BlockerReportPanel/)
  assert.match(actions, /Run Health Score/)
  assert.match(actions, /Run Manufacturability Risk/)
  assert.match(actions, /Generate Board Diff/)
  assert.match(actions, /Archive/)
  assert.match(actions, /Keep Local/)
})

test('web job polling panel exposes localhost job routes and honest local status', async () => {
  const panel = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'components', 'jobs', 'JobStatusPanel.tsx'), 'utf8')
  const client = await readFile(path.join(repoRoot, 'apps', 'web', 'src', 'lib', 'boardforge-job-client.ts'), 'utf8')
  assert.match(panel, /poll status/)
  assert.match(panel, /not cloud execution/)
  assert.match(client, /POST \/jobs\/start/)
  assert.match(client, /GET \/jobs\/:id\/log/)
  assert.match(client, /POST \/jobs\/:id\/retry/)
})

test('local server job routes start and return pollable jobs', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'boardforge-job-server-'))
  const projectDir = path.join(rootDir, 'BF-JOB-SERVER')
  await writeCleanManifest(projectDir)
  const { server, baseUrl } = await startTestLocalServer(rootDir)
  try {
    const started = await localFetch(baseUrl, '/jobs/start', 'POST', { type: 'run_board_review', projectId: 'BF-JOB-SERVER', projectDir })
    assert.equal(started.status, 'BOARD_FORGE_JOB_STARTED')
    assert.equal(started.data.status, 'succeeded')
    const polled = await localFetch(baseUrl, `/jobs/${started.data.jobId}`)
    assert.equal(polled.data.stage, 'complete')
    const retried = await localFetch(baseUrl, `/jobs/${started.data.jobId}/retry`, 'POST')
    assert.equal(retried.status, 'BOARD_FORGE_JOB_RETRIED')
  } finally {
    server.close()
  }
})

test('CLI review parity lists differentiator commands', async () => {
  const cli = await readFile(cliPath, 'utf8')
  const localClient = await readFile(path.join(repoRoot, 'plugins', 'boardforge-plugin', 'bin', 'boardforge-local-client.mjs'), 'utf8')
  assert.match(cli, /review\|health\|risk\|routeability\|diff\|lessons\|preview\|blockers/)
  assert.match(localClient, /review/)
  assert.match(localClient, /blockers/)
})

test('KiCad plugin review parity exposes report paths', async () => {
  const plugin = await readFile(kicadPluginPath, 'utf8')
  const bridge = await readFile(kicadBridgePath, 'utf8')
  assert.match(plugin, /Board review report/)
  assert.match(plugin, /Manufacturability risk/)
  assert.match(bridge, /boardReviewReport/)
  assert.match(bridge, /blockerReport/)
})

test('dev launcher environment checker documents live website to local engine bridge', async () => {
  const checker = await readFile(path.join(repoRoot, 'scripts', 'boardforge-check-environment.mjs'), 'utf8')
  const launcher = await readFile(path.join(repoRoot, 'scripts', 'boardforge-dev-launcher.mjs'), 'utf8')
  assert.match(checker, /protectedPathGuard/)
  assert.match(checker, /supplierApiKeys/)
  assert.match(launcher, /live BoardForge website/)
  assert.match(launcher, /installed local engine bridge/)
})

test('public demo product flow script targets public launch fixture and writes reports', () => {
  const projectDir = path.join(os.tmpdir(), `BF-PUBLIC-DEMO-PRODUCT-FLOW-${Date.now()}`)
  const output = JSON.parse(execFileSync(process.execPath, [productDemoReviewPath, '--project-dir', projectDir], { encoding: 'utf8' }))
  assert.equal(output.status, 'BOARD_FORGE_PRODUCT_DEMO_REVIEW_COMPLETED')
  assert.equal(output.validation.drc, 0)
  assert.equal(output.validation.erc, 0)
  assert.ok(output.reportsGenerated.some((file) => file.endsWith('BoardForge_Board_Review_Report.md')))
})

test('fixture runner lifecycle reports clean exit and serial mode', async () => {
  const runner = await readFile(path.join(repoRoot, 'plugins', 'boardforge-plugin', 'bin', 'boardforge-fixture-runner.mjs'), 'utf8')
  assert.match(runner, /clean_exit_after_report/)
  assert.match(runner, /serialMode/)
  assert.match(runner, /--serial/)
})

async function startTestLocalServer(rootDir) {
  const server = startBoardForgeLocalServer({ rootDir, port: 0 })
  await new Promise((resolve) => server.once('listening', resolve))
  const address = server.address()
  return { server, baseUrl: `http://127.0.0.1:${address.port}` }
}

async function writeCleanManifest(projectDir, overrides = {}) {
  await mkdir(projectDir, { recursive: true })
  const manifest = {
    projectId: path.basename(projectDir),
    projectState: 'local_candidate',
    dashboardVisible: false,
    validation: { drc: 0, erc: 0, shorts: 0, unconnected: 0, forbiddenVias: 0, ...(overrides.validation || {}) },
    manufacturing: { ready: true, state: 'PCB_FAB_READY', zip: path.join(projectDir, 'manufacturing', `${path.basename(projectDir)}_JLCPCB.zip`), ...(overrides.manufacturing || {}) },
    sourcing: { state: 'ASSEMBLY_READY_NOT_VERIFIED', reason: 'supplier_api_keys_missing', ...(overrides.sourcing || {}) },
    publish: { projectState: 'local_candidate', publishApproved: false, dashboardVisible: false, syncStatus: 'not_synced' },
    reports: {},
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => !['validation', 'manufacturing', 'sourcing'].includes(key))),
  }
  await writeFile(path.join(projectDir, 'BoardForge_Project_Manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
  return manifest
}

async function localFetch(baseUrl, route, method = 'GET', body = null, throwOnError = true) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await response.json()
  if (throwOnError && !json.ok) throw new Error(JSON.stringify(json))
  return json
}

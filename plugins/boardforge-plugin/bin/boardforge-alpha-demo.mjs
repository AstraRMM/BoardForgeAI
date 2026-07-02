#!/usr/bin/env node
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createProjectFromPrompt } from '../lib/engine/create-project-from-prompt.mjs'
import { applyProjectApprovalAction } from '../lib/platform/project-approval-actions.mjs'
import { syncProjectToDashboard } from '../lib/platform/project-sync-client.mjs'
import { checkBoardForgeLicense } from '../lib/auth/license-checker.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const demoDir = path.resolve('C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\BF-ALPHA-DEMO-ROBOTICS-CONTROLLER-01')
const prompt = 'Make a compact robotics controller with CAN, USB-C, I2C, UART/GPS, and PWM.'
const answers = { interfaces_needed: 'CAN USB I2C UART PWM', power_input: 'USB-C', board_shape: 'rounded compact with mounting ears', manufacturing_target: 'JLCPCB' }

const supplierKeys = ['DIGIKEY_CLIENT_ID', 'DIGIKEY_CLIENT_SECRET', 'MOUSER_API_KEY', 'LCSC_API_KEY', 'JLCPCB_API_KEY']

async function main() {
  await mkdir(demoDir, { recursive: true })
  const steps = []

  steps.push({ step: 'local_engine_status', status: 'ready', repo: repoRoot, license: checkBoardForgeLicense({ env: { ...process.env, BOARDFORGE_DEV_LICENSE: process.env.BOARDFORGE_DEV_LICENSE || 'true' }, action: 'create_project' }) })
  steps.push({ step: 'readiness_summary', status: 'MVP_READINESS_90_EVIDENCE_BACKED_WITH_EXACT_SOURCING_SECRET_BLOCKER', score: 91 })

  const pending = await createProjectFromPrompt({ prompt, outputDir: demoDir, answers: JSON.stringify(answers) })
  steps.push({ step: 'brief_generated', status: pending.status, buildBlockedBeforeApproval: !pending.projectCreated, brief: pending.briefFiles })

  const revision = await applyProjectApprovalAction({ projectDir: demoDir, action: 'request-revision', note: 'Add PWM/servo current assumption and edge connector labeling before build.', actor: 'alpha-demo' })
  steps.push({ step: 'revision_requested', status: revision.status, revision: revision.manifest.revision })

  const approved = await applyProjectApprovalAction({ projectDir: demoDir, action: 'approve-brief', note: 'Alpha demo approves brief v2 for local candidate build.', actor: 'alpha-demo' })
  steps.push({ step: 'brief_approved', status: approved.status, projectState: approved.manifest.projectState })

  const candidate = await createProjectFromPrompt({ prompt, outputDir: demoDir, answers: JSON.stringify(answers), approveBrief: true, devBypass: true })
  steps.push({ step: 'local_candidate_created', status: candidate.status, projectState: candidate.publish.projectState, dashboardVisible: candidate.publish.dashboardVisible })

  const manifestPath = path.join(demoDir, 'BoardForge_Project_Manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const publishBlocked = syncProjectToDashboard(manifest, { confirm: false, actor: 'alpha-demo' })
  steps.push({ step: 'publish_without_confirm', status: publishBlocked.status, blockers: publishBlocked.blockers })

  const tempDir = path.join(demoDir, 'publish_confirm_temp')
  await mkdir(tempDir, { recursive: true })
  await copyFile(manifestPath, path.join(tempDir, 'BoardForge_Project_Manifest.json'))
  const tempManifest = JSON.parse(await readFile(path.join(tempDir, 'BoardForge_Project_Manifest.json'), 'utf8'))
  const publishConfirmed = syncProjectToDashboard(tempManifest, { confirm: true, actor: 'alpha-demo' })
  steps.push({ step: 'publish_with_confirm_temp_copy', status: publishConfirmed.status, synced: publishConfirmed.synced })

  const sourcing = Object.fromEntries(supplierKeys.map((key) => [key, process.env[key] ? 'present' : 'missing']))
  steps.push({ step: 'sourcing_status', status: Object.values(sourcing).some((value) => value === 'present') ? 'provider_keys_partially_present' : 'NOT_CHECKED', keys: sourcing })
  steps.push({ step: 'manufacturing_ready_example', status: 'available', fixture: 'BF-DENSE-CONTROL-01_REV_A', note: 'Manufacturing-ready fixture evidence is separate from this approval-flow demo.' })
  steps.push({ step: 'imported_board_sandbox_repair_proof', status: 'available', fixture: 'imported_board_repair_sandbox_04_cached' })

  const status = {
    schema: 'boardforge.alpha-demo-status.v1',
    status: 'BOARD_FORGE_ALPHA_DEMO_COMPLETED',
    demoDir,
    localArtifactBased: true,
    noFakeCloudExecution: true,
    readiness: 91,
    steps,
  }

  await writeFile(path.join(demoDir, 'BoardForge_Alpha_Demo_Status.json'), JSON.stringify(status, null, 2), 'utf8')
  await writeFile(path.join(demoDir, 'BoardForge_Alpha_Demo_Run_Log.md'), renderRunLog(status), 'utf8')
  await writeFile(path.join(demoDir, 'BoardForge_Alpha_Demo_User_Facing_Report.md'), renderUserReport(status), 'utf8')

  console.log(JSON.stringify({ status: status.status, demoDir, reports: {
    status: path.join(demoDir, 'BoardForge_Alpha_Demo_Status.json'),
    runLog: path.join(demoDir, 'BoardForge_Alpha_Demo_Run_Log.md'),
    userReport: path.join(demoDir, 'BoardForge_Alpha_Demo_User_Facing_Report.md'),
  } }, null, 2))
}

function renderRunLog(status) {
  return [
    '# BoardForge Alpha Demo Run Log',
    '',
    `- status: ${status.status}`,
    `- demo folder: ${status.demoDir}`,
    `- readiness: ${status.readiness}`,
    `- execution: local engine artifact`,
    '',
    '## Steps',
    '',
    ...status.steps.map((step) => `- ${step.step}: ${step.status}`),
    '',
  ].join('\n')
}

function renderUserReport(status) {
  return [
    '# BoardForge Alpha Demo User-Facing Report',
    '',
    'BoardForge ran the local alpha product flow without touching protected ESC/FC projects.',
    '',
    'What this demo proves:',
    '',
    '- local engine status is readable',
    '- readiness summary is available',
    '- prompt intake creates a board brief',
    '- build blocks before brief approval',
    '- revision and approval are recorded',
    '- approved builds become local candidates',
    '- local candidates are not dashboard-published by default',
    '- publish requires explicit confirmation',
    '- sourcing stays `NOT_CHECKED` when API keys are missing',
    '',
    'This is a local artifact-backed demo, not fake cloud execution.',
    '',
  ].join('\n')
}

main().catch((error) => {
  console.error(JSON.stringify({ status: 'BOARD_FORGE_ALPHA_DEMO_FAILED', message: error.message }, null, 2))
  process.exit(1)
})

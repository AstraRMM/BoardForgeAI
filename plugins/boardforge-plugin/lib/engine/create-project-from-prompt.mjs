import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { assertPathIsAllowed } from '../platform/protected-path-guard.mjs'
import { defaultPublishState, transitionPublishState } from '../platform/project-publish-state.mjs'
import { writeProjectApprovalReport } from '../platform/project-approval-report.mjs'
import { runQuestionEngine } from '../intake/question-engine.mjs'
import { generateBoardBrief, writeBoardBrief } from '../intake/board-brief-generator.mjs'
import { canBuildFromBrief } from '../intake/board-brief-approval-gate.mjs'

export async function createProjectFromPrompt(options = {}) {
  const prompt = options.prompt || ''
  if (!prompt.trim()) throw new Error('prompt is required')
  const outputDir = path.resolve(options.outputDir || options.projectPath || path.join(process.cwd(), 'BoardForge_Prompt_Project'))
  const guard = assertPathIsAllowed(outputDir)
  if (!guard.allowed) throw new Error(`Refused create output: ${guard.reason} (${outputDir})`)

  const answers = parseAnswers(options.answers)
  const questionPlan = runQuestionEngine({ prompt, boardType: options.boardType || null, answers })
  const brief = generateBoardBrief({ prompt, plan: questionPlan })
  const briefGate = canBuildFromBrief(brief, { briefApproved: Boolean(options.approveBrief), devBypass: Boolean(options.devBypass) })

  await mkdir(outputDir, { recursive: true })
  const briefFiles = await writeBoardBrief({ brief: { ...brief, briefApproved: Boolean(options.approveBrief) }, outputDir })

  if (!briefGate.allowed) {
    return {
      status: 'BOARD_FORGE_CREATE_BLOCKED_BRIEF_APPROVAL_REQUIRED',
      projectCreated: false,
      outputDir,
      questionPlan,
      brief: { ...brief, briefApproved: false },
      briefFiles: briefFiles.files,
      blockers: briefGate.blockers,
    }
  }

  const projectName = options.projectName || path.basename(outputDir)
  const projectFiles = await writeMinimalKiCadProject({ outputDir, projectName, prompt })
  const publish = transitionPublishState(defaultPublishState(), 'mark_candidate', {
    actor: options.actor || 'boardforge-create',
    note: 'prompt brief approved; project created as local candidate',
  })
  const manifest = {
    schema: 'boardforge.project-manifest.v1',
    projectId: projectName,
    projectName,
    status: 'LOCAL_CANDIDATE_CREATED_FROM_APPROVED_BRIEF',
    prompt,
    questionPlan,
    boardBrief: {
      json: briefFiles.files.json,
      markdown: briefFiles.files.markdown,
      approved: true,
    },
    boardPath: projectFiles.pcb,
    schematicPath: projectFiles.sch,
    projectPath: projectFiles.pro,
    validation: {
      status: 'not_run',
      shorts: null,
      unconnected: null,
      forbiddenVias: null,
      drcViolations: null,
      ercViolations: null,
    },
    manufacturing: {
      ready: false,
      zip: null,
      blockedReason: 'validation_not_run',
    },
    reports: {
      boardBrief: briefFiles.files.markdown,
    },
    replay: {
      command: `npm run boardforge:create -- --prompt "${escapeCli(prompt)}" --output "${outputDir}" --approve-brief --dev`,
    },
    publish,
    projectState: publish.projectState,
    publishApproved: publish.publishApproved,
    dashboardVisible: publish.dashboardVisible,
    syncStatus: publish.syncStatus,
  }
  const manifestPath = path.join(outputDir, 'BoardForge_Project_Manifest.json')
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
  const approval = await writeProjectApprovalReport({ project: manifest, outputDir })

  return {
    status: 'BOARD_FORGE_CREATE_LOCAL_CANDIDATE',
    projectCreated: true,
    outputDir,
    questionPlan,
    brief: { ...brief, briefApproved: true },
    briefFiles: briefFiles.files,
    projectFiles,
    manifestPath,
    approvalReport: approval.files.markdown,
    publish,
  }
}

function parseAnswers(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

async function writeMinimalKiCadProject({ outputDir, projectName, prompt }) {
  const pro = path.join(outputDir, `${projectName}.kicad_pro`)
  const sch = path.join(outputDir, `${projectName}.kicad_sch`)
  const pcb = path.join(outputDir, `${projectName}.kicad_pcb`)
  await writeFile(pro, JSON.stringify({ meta: { version: 1 }, boardforge: { prompt } }, null, 2), 'utf8')
  await writeFile(sch, `(kicad_sch (version 20230121) (generator "BoardForge")\n  (paper "A4")\n  (title_block (title "${projectName}"))\n)\n`, 'utf8')
  await writeFile(pcb, `(kicad_pcb (version 20240108) (generator "BoardForge")\n  (general)\n  (paper "A4")\n  (layers\n    (0 "F.Cu" signal)\n    (31 "B.Cu" signal)\n    (32 "B.Adhes" user)\n    (33 "F.Adhes" user)\n    (34 "B.Paste" user)\n    (35 "F.Paste" user)\n    (36 "B.SilkS" user)\n    (37 "F.SilkS" user)\n    (38 "B.Mask" user)\n    (39 "F.Mask" user)\n    (44 "Edge.Cuts" user)\n  )\n)\n`, 'utf8')
  return { pro, sch, pcb }
}

function escapeCli(value) {
  return String(value).replace(/"/g, '\\"')
}

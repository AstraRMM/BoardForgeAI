import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { runQuestionEngine } from './question-engine.mjs'

export function generateBoardBrief(input = {}) {
  const plan = input.plan || runQuestionEngine(input)
  return {
    schema: 'boardforge.board-brief.v1',
    briefApproved: false,
    boardPurpose: input.prompt || plan.prompt,
    boardType: plan.boardType,
    selectedArchitecture: architectureFor(plan),
    assumptions: plan.assumptions,
    questionsAnswered: Object.keys(plan.answers || {}),
    questionsSkipped: plan.skippedQuestions,
    partsAndBlocksProposed: proposedBlocks(plan),
    boardOutlinePlan: outlinePlanFor(plan),
    connectorPlan: connectorPlanFor(plan),
    powerPlan: powerPlanFor(plan),
    routingRisk: plan.riskQuestions,
    sourcingRisk: ['supplier_api_keys_required_for_stock_verification', 'assembly_availability_not_verified_without_provider_keys'],
    manufacturingTarget: plan.answers?.manufacturing_target || 'generic_gerber_jlcpcb_candidate',
    questionPlan: plan,
  }
}

export async function writeBoardBrief({ brief, outputDir }) {
  if (!outputDir) throw new Error('outputDir is required')
  await mkdir(outputDir, { recursive: true })
  const resolvedBrief = brief || generateBoardBrief()
  const json = path.join(outputDir, 'BoardForge_Board_Brief.json')
  const markdown = path.join(outputDir, 'BoardForge_Board_Brief.md')
  await writeFile(json, JSON.stringify(resolvedBrief, null, 2), 'utf8')
  await writeFile(markdown, boardBriefMarkdown(resolvedBrief), 'utf8')
  return { brief: resolvedBrief, files: { json, markdown } }
}

function architectureFor(plan) {
  if (plan.boardType === 'poe_environment_sensor') return ['RJ45/MagJack candidate', 'PoE PD candidate', 'MCU', 'environment sensor', '3V3 rail']
  if (plan.boardType === 'industrial_io_board') return ['MCU', '24V input placeholder', 'buck regulator', 'isolated input placeholders', 'fieldbus transceiver']
  if (plan.boardType === 'robotics_controller') return ['MCU', 'USB-C', '3V3 regulator', 'CAN/UART/I2C/PWM connectors', 'SWD']
  return ['MCU', 'power input', 'sensor/interface block', 'debug connector']
}

function proposedBlocks(plan) {
  return architectureFor(plan).map((name) => ({ name, status: 'candidate', verification: 'requires symbol/footprint/pin-map check' }))
}

function outlinePlanFor(plan) {
  if (plan.boardType === 'wearable_sensor_puck') return 'circular puck outline with battery and antenna clearance checks'
  if (plan.boardType === 'custom_outline_board') return 'custom outline scored for connector access and routing corridors before commit'
  return 'compact rounded rectangle unless user approves a custom outline'
}

function connectorPlanFor(plan) {
  return plan.answers?.interfaces_needed || 'edge-placed connectors selected from answered interfaces'
}

function powerPlanFor(plan) {
  return plan.answers?.power_input || 'safe low-voltage input with 3V3 regulation'
}

function boardBriefMarkdown(brief) {
  return `# BoardForge Board Brief

- Board type: ${brief.boardType}
- Purpose: ${brief.boardPurpose || 'not specified'}
- Manufacturing target: ${brief.manufacturingTarget}
- Brief approved: ${brief.briefApproved}

## Architecture
${brief.selectedArchitecture.map((item) => `- ${item}`).join('\n')}

## Assumptions
${brief.assumptions.map((item) => `- ${item}`).join('\n')}

## Risks
${brief.routingRisk.map((item) => `- ${item}`).join('\n')}

BoardForge must not create KiCad files until this brief is approved or an explicit dev/test bypass is used.
`
}

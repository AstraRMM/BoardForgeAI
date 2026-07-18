import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const REQUIREMENT_BUCKETS = Object.freeze({
  SAFE_INFER: 'safe_to_infer',
  VETTED_DEFAULT: 'vetted_default_with_explanation',
  MUST_ASK: 'must_ask_user',
})

const PROFILES = Object.freeze({
  '005_USB_C_PD_SOURCE': [
    ask('pd_role', 'What USB-PD role should this controller perform?', 'source, sink, or dual-role changes the controller configuration and safety behavior.'),
    ask('pdo_profile', 'Which PDO profile should the port advertise or request?', 'PDO voltages and currents cannot be invented safely.'),
    ask('vbus_current_limit_a', 'What is the permitted VBUS current limit?', 'This sets power-path protection and TPS25750 configuration.'),
    ask('dead_battery_behavior', 'Is dead-battery sink behavior required?', 'This changes the USB-C state machine and hardware policy.'),
  ],
  '011_USB_HUB': [
    ask('five_v_input_source', 'What powers the protected 5 V downstream rail?', 'USB, barrel/DC input, battery, PoE, and regulated 5 V each require a different architecture.'),
    ask('simultaneous_downstream_current_a', 'What simultaneous downstream current must the four ports support?', 'Four USB 2.0 unit loads are only the lower bound; this sizes the source and protection.'),
    ask('fault_retry_policy', 'On a port short, should each port latch off, auto-retry, or require a host reset?', 'Fault behavior changes the power-switch and firmware policy.'),
    ask('ambient_and_enclosure', 'What maximum ambient temperature and enclosure condition apply?', 'The 5 V source and four port switches need a thermal design limit.'),
  ],
  '019_BATTERY_BMS': [
    ask('battery_chemistry', 'What battery chemistry is being protected?', 'Protection thresholds and balancing policy are chemistry-specific.'),
    ask('series_parallel_cells', 'What series/parallel cell count and cell model apply?', 'This selects the monitor, tap order, and voltage limits.'),
    ask('continuous_peak_fault_current_a', 'What continuous, peak, and fault current must the pack survive?', 'This determines FET SOA, shunt, fuse, and copper.'),
    ask('pack_environment_and_charger', 'What pack temperature limits and charger/port behavior apply?', 'These define temperature cutoffs and charge-path architecture.'),
  ],
})

const SAFE_DEFAULTS = Object.freeze([
  decision('lifecycle_preference', REQUIREMENT_BUCKETS.SAFE_INFER, 'Prefer active-production lifecycle parts over NRND or obsolete components.', 'Does not change the requested product function.'),
  decision('decoupling_strategy', REQUIREMENT_BUCKETS.SAFE_INFER, 'Use manufacturer-recommended local decoupling once the exact IC is selected.', 'Values and locations still remain subject to the selected datasheet.'),
])

const VETTED_DEFAULTS = Object.freeze([
  decision('manufacturer_profile', REQUIREMENT_BUCKETS.VETTED_DEFAULT, 'Use the selected manufacturer standard design rules as hard minimums.', 'BoardForge records the manufacturer and explains the chosen clearance/width rules.'),
  decision('sourcing_policy', REQUIREMENT_BUCKETS.VETTED_DEFAULT, 'Require active lifecycle plus live DigiKey and Mouser availability before acceptance.', 'The user may override only with an explicit, recorded policy.'),
])

/** Turn a fail-closed production proposal into the minimum user conversation.
 * It never converts a missing decision into a buildable assumption. */
export function analyzeRequirements({ boardId, validation = {}, answers = {} } = {}) {
  const normalizedId = String(boardId || '').toUpperCase()
  const profile = PROFILES[normalizedId] || []
  const generic = genericQuestions(validation.errors || [])
  const all = dedupe([...profile, ...generic])
  const unanswered = all.filter((question) => !hasAnswer(answers, question.id))
  return {
    schema: 'boardforge.phase2c.requirements-intelligence-plan.v1',
    boardId: normalizedId || null,
    status: unanswered.length ? 'REQUIREMENTS_INPUT_REQUIRED' : 'REQUIREMENTS_READY_FOR_REVALIDATION',
    questions: unanswered,
    answered: all.filter((question) => hasAnswer(answers, question.id)).map((question) => ({ ...question, answer: answers[question.id] })),
    safeInferences: SAFE_DEFAULTS,
    vettedDefaults: VETTED_DEFAULTS,
    blockerCodes: [...new Set(validation.errors || [])],
    answers: { ...answers },
    nextAction: unanswered.length ? 'ask_minimum_engineering_questions' : 'revalidate_proposal_with_recorded_constraints',
  }
}

export function recordRequirementAnswers({ plan, answers = {}, actor = 'user' } = {}) {
  if (!plan?.schema) throw new TypeError('A requirements intelligence plan is required')
  const combined = { ...(plan.answers || {}), ...answers }
  const refreshed = analyzeRequirements({ boardId: plan.boardId, validation: { errors: plan.blockerCodes || [] }, answers: combined })
  return {
    schema: 'boardforge.phase2c.requirements-constraints.v1',
    boardId: plan.boardId,
    recordedAt: new Date().toISOString(),
    actor,
    constraints: combined,
    plan: refreshed,
    status: refreshed.status,
  }
}

export async function writeRequirementAnswers({ projectDir, constraints } = {}) {
  if (!projectDir || !constraints?.schema) throw new TypeError('projectDir and recorded requirements constraints are required')
  await mkdir(projectDir, { recursive: true })
  const outputFile = path.join(projectDir, 'BoardForge_Requirements_Constraints.json')
  await writeFile(outputFile, JSON.stringify(constraints, null, 2), 'utf8')
  return outputFile
}

function genericQuestions(errors) {
  return errors.filter((error) => /(?:envelope-undeclared|configuration-proof-missing|exact-assets-unapproved)/.test(error)).map((error) => {
    if (/exact-assets-unapproved/.test(error)) return ask(`resolve_${error}`, 'Select an exact, sourceable production part for this unresolved function.', 'Part identity, package, ratings, and live availability must be verified before routing.')
    if (/configuration-proof-missing/.test(error)) return ask(`resolve_${error}`, 'Provide the controller-tool configuration export and independently captured readback.', 'Configuration binaries and readback evidence must remain traceable and immutable.')
    const topic = error.replace(/-envelope-undeclared$/, '').replaceAll('-', ' ')
    return ask(`resolve_${error}`, `What is the required ${topic} operating envelope?`, 'This decision changes electrical, safety, thermal, or compliance behavior.')
  })
}

function ask(id, prompt, rationale) { return { id, bucket: REQUIREMENT_BUCKETS.MUST_ASK, prompt, rationale } }
function decision(id, bucket, value, rationale) { return { id, bucket, value, rationale } }
function hasAnswer(answers, id) { const value = answers?.[id]; return value !== undefined && value !== null && String(value).trim() !== '' }
function dedupe(questions) { return [...new Map(questions.map((question) => [question.id, question])).values()] }

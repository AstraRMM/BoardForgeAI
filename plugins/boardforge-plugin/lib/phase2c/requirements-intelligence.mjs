import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const REQUIREMENT_BUCKETS = Object.freeze({
  SAFE_INFER: 'safe_to_infer',
  VETTED_DEFAULT: 'vetted_default_with_explanation',
  MUST_ASK: 'must_ask_user',
})
export const AUTO_PROCEED_CONFIDENCE = 0.95

const PROFILES = Object.freeze({
  '005_USB_C_PD_SOURCE': [
    ask('pd_role', 'What USB-PD role should this controller perform?', 'source, sink, or dual-role changes the controller configuration and safety behavior.', { domain: 'USB-PD policy', confidence: 0.18 }),
    ask('pdo_profile', 'Which PDO profile should the port advertise or request?', 'PDO voltages and currents cannot be invented safely.', { domain: 'USB-PD policy', confidence: 0.18, dependsOn: ['pd_role'] }),
    ask('vbus_current_limit_a', 'What is the permitted VBUS current limit?', 'This sets power-path protection and TPS25750 configuration.', { domain: 'Power', confidence: 0.35, dependsOn: ['pdo_profile'] }),
    ask('dead_battery_behavior', 'Is dead-battery sink behavior required?', 'This changes the USB-C state machine and hardware policy.', { domain: 'USB-PD policy', confidence: 0.35, dependsOn: ['pd_role'] }),
  ],
  '011_USB_HUB': [
    ask('five_v_input_source', 'What powers the protected 5 V downstream rail?', 'USB, barrel/DC input, battery, PoE, and regulated 5 V each require a different architecture.', { domain: 'Power', confidence: 0.42 }),
    ask('simultaneous_downstream_current_a', 'What simultaneous downstream current must the four ports support?', 'Four USB 2.0 unit loads are only the lower bound; this sizes the source and protection.', { domain: 'Power', confidence: 0.38, dependsOn: ['five_v_input_source'] }),
    ask('fault_retry_policy', 'On a port short, should each port latch off, auto-retry, or require a host reset?', 'Fault behavior changes the power-switch and firmware policy.', { domain: 'Protection', confidence: 0.45, dependsOn: ['five_v_input_source'] }),
    ask('ambient_and_enclosure', 'What maximum ambient temperature and enclosure condition apply?', 'The 5 V source and four port switches need a thermal design limit.', { domain: 'Thermal', confidence: 0.55, dependsOn: ['five_v_input_source', 'simultaneous_downstream_current_a'] }),
  ],
  '019_BATTERY_BMS': [
    ask('battery_chemistry', 'What battery chemistry is being protected?', 'Protection thresholds and balancing policy are chemistry-specific.', { domain: 'Battery', confidence: 0.2 }),
    ask('series_parallel_cells', 'What series/parallel cell count and cell model apply?', 'This selects the monitor, tap order, and voltage limits.', { domain: 'Battery', confidence: 0.2, dependsOn: ['battery_chemistry'] }),
    ask('continuous_peak_fault_current_a', 'What continuous, peak, and fault current must the pack survive?', 'This determines FET SOA, shunt, fuse, and copper.', { domain: 'Power protection', confidence: 0.25, dependsOn: ['battery_chemistry', 'series_parallel_cells'] }),
    ask('pack_environment_and_charger', 'What pack temperature limits and charger/port behavior apply?', 'These define temperature cutoffs and charge-path architecture.', { domain: 'Safety and thermal', confidence: 0.35, dependsOn: ['battery_chemistry'] }),
  ],
})

const SAFE_DEFAULTS = Object.freeze([
  decision('lifecycle_preference', REQUIREMENT_BUCKETS.SAFE_INFER, 'Prefer active-production lifecycle parts over NRND or obsolete components.', 'Does not change the requested product function.', { domain: 'Component policy', confidence: 0.99 }),
  decision('decoupling_strategy', REQUIREMENT_BUCKETS.SAFE_INFER, 'Use manufacturer-recommended local decoupling once the exact IC is selected.', 'Values and locations still remain subject to the selected datasheet.', { domain: 'Power integrity', confidence: 0.97 }),
])

const VETTED_DEFAULTS = Object.freeze([
  decision('manufacturer_profile', REQUIREMENT_BUCKETS.VETTED_DEFAULT, 'Use the selected manufacturer standard design rules as hard minimums.', 'BoardForge records the manufacturer and explains the chosen clearance/width rules.', { domain: 'Manufacturing', confidence: 0.96 }),
  decision('sourcing_policy', REQUIREMENT_BUCKETS.VETTED_DEFAULT, 'Require active lifecycle plus live DigiKey and Mouser availability before acceptance.', 'The user may override only with an explicit, recorded policy.', { domain: 'Manufacturing', confidence: 0.95 }),
])

/** Turn a fail-closed production proposal into the minimum user conversation.
 * It never converts a missing decision into a buildable assumption. */
export function analyzeRequirements({ boardId, validation = {}, answers = {} } = {}) {
  const normalizedId = String(boardId || '').toUpperCase()
  const matchedProfileId = PROFILES[normalizedId] ? normalizedId : Object.keys(PROFILES).find((profileId) => profileId.endsWith(normalizedId))
  const profile = PROFILES[matchedProfileId] || []
  const generic = genericQuestions(validation.errors || [])
  const all = dedupe([...profile, ...generic])
  const unanswered = all.filter((question) => !hasAnswer(answers, question.id))
  const graph = buildRequirementsGraph({ boardId: matchedProfileId || normalizedId || null, questions: all, answers })
  return {
    schema: 'boardforge.phase2c.requirements-intelligence-plan.v1',
    boardId: matchedProfileId || normalizedId || null,
    status: unanswered.length ? 'REQUIREMENTS_INPUT_REQUIRED' : 'REQUIREMENTS_READY_FOR_REVALIDATION',
    questions: unanswered,
    answered: all.filter((question) => hasAnswer(answers, question.id)).map((question) => ({ ...question, answer: answers[question.id] })),
    safeInferences: SAFE_DEFAULTS,
    vettedDefaults: VETTED_DEFAULTS,
    requirementsGraph: graph,
    questionBatches: questionBatches(unanswered),
    confidence: graph.confidence,
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
  return errors.filter((error) => /(?:envelope-undeclared|configuration-proof-missing|exact-assets-unapproved)/i.test(error)).map((error) => {
    if (/exact-assets-unapproved/i.test(error)) return ask(`resolve_${error}`, 'Select an exact, sourceable production part for this unresolved function.', 'Part identity, package, ratings, and live availability must be verified before routing.', { domain: 'Component selection', confidence: 0.3 })
    if (/configuration-proof-missing/i.test(error)) return ask(`resolve_${error}`, 'Provide the controller-tool configuration export and independently captured readback.', 'Configuration binaries and readback evidence must remain traceable and immutable.', { domain: 'Configuration evidence', confidence: 0.1 })
    const topic = error.replace(/-envelope-undeclared$/, '').replaceAll('-', ' ')
    return ask(`resolve_${error}`, `What is the required ${topic} operating envelope?`, 'This decision changes electrical, safety, thermal, or compliance behavior.', { domain: 'Operating envelope', confidence: 0.25 })
  })
}

function ask(id, prompt, rationale, metadata = {}) { return { id, bucket: REQUIREMENT_BUCKETS.MUST_ASK, prompt, rationale, domain: 'Functional design', confidence: 0.5, dependsOn: [], ...metadata } }
function decision(id, bucket, value, rationale, metadata = {}) { return { id, bucket, value, rationale, domain: 'General', confidence: 0.95, ...metadata } }
function hasAnswer(answers, id) { const value = answers?.[id]; return value !== undefined && value !== null && String(value).trim() !== '' }
function dedupe(questions) { return [...new Map(questions.map((question) => [question.id, question])).values()] }

function buildRequirementsGraph({ boardId, questions, answers }) {
  const decisions = [...SAFE_DEFAULTS, ...VETTED_DEFAULTS]
  const domains = [...new Set([...decisions, ...questions].map((node) => node.domain))]
  const rootId = 'project'
  const nodes = [
    { id: rootId, type: 'project', label: boardId || 'Production project', confidence: 1, state: 'known' },
    ...domains.map((domain) => ({ id: `domain:${domain}`, type: 'domain', label: domain, parentId: rootId, confidence: 1, state: 'known' })),
    ...decisions.map((item) => ({ ...item, type: 'decision', parentId: `domain:${item.domain}`, state: item.bucket === REQUIREMENT_BUCKETS.SAFE_INFER ? 'inferred' : 'vetted_default', autoProceed: item.confidence >= AUTO_PROCEED_CONFIDENCE })),
    ...questions.map((item) => ({ ...item, type: 'requirement', parentId: `domain:${item.domain}`, state: hasAnswer(answers, item.id) ? 'answered' : 'requires_input', answer: hasAnswer(answers, item.id) ? answers[item.id] : undefined, confidence: hasAnswer(answers, item.id) ? 1 : item.confidence, autoProceed: false })),
  ]
  const requiresInput = nodes.filter((node) => node.state === 'requires_input')
  const automatic = nodes.filter((node) => node.autoProceed)
  return {
    schema: 'boardforge.phase2c.requirements-graph.v1',
    autoProceedConfidence: AUTO_PROCEED_CONFIDENCE,
    rootId,
    nodes,
    confidence: { automaticDecisionCount: automatic.length, mustAskCount: requiresInput.length, answeredCount: nodes.filter((node) => node.state === 'answered').length },
  }
}

function questionBatches(questions) {
  return Object.values(questions.reduce((batches, question) => {
    const batch = batches[question.domain] || { domain: question.domain, questions: [] }
    batch.questions.push(question)
    batches[question.domain] = batch
    return batches
  }, {}))
}

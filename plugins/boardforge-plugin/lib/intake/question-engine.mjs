import { getQuestionTree } from './board-type-question-trees.mjs'
import { selectedConditionalFollowups } from './conditional-followups.mjs'
import { defaultAssumptionsFor } from './default-assumption-engine.mjs'
import { rankQuestions, questionPriorityReason } from './question-priority-ranker.mjs'
import { validateIntakeAnswers } from './intake-answer-validator.mjs'

export function inferBoardType(prompt = '') {
  const text = prompt.toLowerCase()
  if (/import|repair existing|existing kicad|fix my board|cleanup board/.test(text)) return 'imported_project_repair'
  if (/poe|ethernet/.test(text)) return 'poe_environment_sensor'
  if (/industrial|24v|i\/o|input output|rs485/.test(text)) return 'industrial_io_board'
  if (/wearable|puck|circular|round/.test(text)) return 'wearable_sensor_puck'
  if (/(odd|custom outline|mounting ears|notch).*(robot|controller)|robot.*(odd|custom outline|mounting ears|notch)/.test(text)) return 'odd_shape_robot_board'
  if (/odd|custom outline|custom shape|mounting ears|notch/.test(text)) return 'custom_outline_board'
  if (/can.*sensor|sensor node/.test(text)) return 'can_sensor_node'
  if (/usb.*mcu|development board|dev board/.test(text)) return 'usb_c_mcu_board'
  if (/tiny|2-layer|2 layer|low-cost/.test(text)) return 'tiny_2layer_sensor'
  if (/connector-heavy|connector heavy/.test(text)) return 'connector_heavy_robot_board'
  return 'robotics_controller'
}

export function runQuestionEngine({ prompt = '', boardType = null, answers = {} } = {}) {
  const resolvedBoardType = boardType || inferBoardType(prompt)
  const tree = getQuestionTree(resolvedBoardType)
  const resolvedAnswers = { ...inferAnswersFromPrompt(prompt), ...answers }
  const conditionalFollowups = selectedConditionalFollowups(tree, resolvedAnswers)
  const answered = Object.keys(resolvedAnswers)
  const requiredUnanswered = tree.requiredQuestions.filter((question) => !answered.includes(question))
  const candidateQuestions = [...requiredUnanswered, ...conditionalFollowups.filter((question) => !answered.includes(question))]
  const questions = rankQuestions(candidateQuestions, { minimumQuestionMode: true, maxQuestions: 7 })
  const deferredQuestions = candidateQuestions.filter((question) => !questions.includes(question))
  const validation = validateIntakeAnswers(resolvedAnswers)
  return {
    schema: 'boardforge.question-engine-plan.v1',
    minimumQuestionMode: true,
    prompt,
    boardType: resolvedBoardType,
    requiredQuestions: tree.requiredQuestions,
    conditionalFollowups,
    questionsToAsk: questions,
    deferredQuestions,
    skippedQuestions: tree.conditionalQuestions.filter((question) => !conditionalFollowups.includes(question)),
    questionPriority: Object.fromEntries(questions.map((question) => [question, questionPriorityReason(question)])),
    assumptions: defaultAssumptionsFor(resolvedBoardType, answers),
    riskQuestions: tree.riskQuestions,
    sourcingRisks: tree.sourcingRisks || [],
    manufacturingRisks: tree.manufacturingRisks || [],
    routingRisks: tree.routingRisks || [],
    briefSections: tree.briefSections,
    validation,
    answers: resolvedAnswers,
  }
}

export function inferAnswersFromPrompt(prompt = '') {
  const text = prompt.toLowerCase()
  const answers = {}
  const interfaces = []
  if (/\bcan\b/.test(text)) interfaces.push('CAN')
  if (/usb-c|usb c|usb/.test(text)) interfaces.push('USB')
  if (/\bi2c\b/.test(text)) interfaces.push('I2C')
  if (/\buart\b|gps/.test(text)) interfaces.push('UART')
  if (/pwm|servo/.test(text)) interfaces.push('PWM')
  if (interfaces.length) answers.interfaces_needed = interfaces.join(' ')
  if (/usb-c|usb c/.test(text)) answers.power_input = answers.power_input || 'USB-C'
  if (/usb-c|usb c/.test(text)) answers.usb_c_power_or_data = answers.usb_c_power_or_data || 'power_plus_data'
  if (/custom|odd|mounting ears|notch|circular|round|rounded/.test(text)) {
    answers.board_shape = answers.board_shape || 'custom_or_rounded'
    answers.shape_family = answers.shape_family || (/(circular|round|puck)/.test(text) ? 'circular' : 'custom_outline')
  }
  if (/battery|lipo|cell/.test(text)) answers.power_input = answers.power_input || 'battery'
  if (/pwm|servo/.test(text)) answers.pwm_servo_outputs = answers.pwm_servo_outputs || 'ask_output_count_and_power_mode'
  if (/poe/.test(text)) answers.poe_isolation = answers.poe_isolation || 'engineering_review_required'
  if (/jlcpcb/i.test(prompt)) answers.manufacturing_target = 'JLCPCB'
  if (/generic gerber/.test(text)) answers.manufacturing_target = 'generic_gerber'
  return answers
}

import { getQuestionTree } from './board-type-question-trees.mjs'
import { selectedConditionalFollowups } from './conditional-followups.mjs'
import { defaultAssumptionsFor } from './default-assumption-engine.mjs'

export function inferBoardType(prompt = '') {
  const text = prompt.toLowerCase()
  if (/poe|ethernet/.test(text)) return 'poe_environment_sensor'
  if (/industrial|24v|i\/o|input output|rs485/.test(text)) return 'industrial_io_board'
  if (/wearable|puck|circular|round/.test(text)) return 'wearable_sensor_puck'
  if (/odd|custom outline|mounting ears|notch/.test(text)) return 'custom_outline_board'
  if (/can.*sensor|sensor node/.test(text)) return 'can_sensor_node'
  if (/usb.*mcu|development board|dev board/.test(text)) return 'usb_c_mcu_board'
  if (/tiny|2-layer|2 layer|low-cost/.test(text)) return 'tiny_2layer_sensor'
  if (/connector-heavy|connector heavy/.test(text)) return 'connector_heavy_robot_board'
  return 'robotics_controller'
}

export function runQuestionEngine({ prompt = '', boardType = null, answers = {} } = {}) {
  const resolvedBoardType = boardType || inferBoardType(prompt)
  const tree = getQuestionTree(resolvedBoardType)
  const conditionalFollowups = selectedConditionalFollowups(tree, answers)
  const answered = Object.keys(answers)
  const requiredUnanswered = tree.requiredQuestions.filter((question) => !answered.includes(question))
  const questions = [...requiredUnanswered, ...conditionalFollowups.filter((question) => !answered.includes(question))]
  return {
    schema: 'boardforge.question-engine-plan.v1',
    prompt,
    boardType: resolvedBoardType,
    requiredQuestions: tree.requiredQuestions,
    conditionalFollowups,
    questionsToAsk: questions,
    skippedQuestions: tree.conditionalQuestions.filter((question) => !conditionalFollowups.includes(question)),
    assumptions: defaultAssumptionsFor(resolvedBoardType, answers),
    riskQuestions: tree.riskQuestions,
    briefSections: tree.briefSections,
    answers,
  }
}

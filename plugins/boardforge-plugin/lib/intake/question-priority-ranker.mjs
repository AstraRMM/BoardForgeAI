const DEFAULT_MAX_QUESTIONS = 7

const PRIORITY = new Map([
  ['controller_preference', 100],
  ['usb_c_power_or_data', 98],
  ['usb_c_mode', 97],
  ['can_interface', 96],
  ['power_input', 95],
  ['interfaces_needed', 94],
  ['pwm_servo_outputs', 93],
  ['board_shape', 92],
  ['shape_family', 91],
  ['max_dimensions', 90],
  ['mounting_scheme', 89],
  ['connector_edges', 88],
  ['manufacturing_target', 87],
  ['poe_isolation', 86],
  ['compliance_review', 85],
  ['field_voltage', 84],
  ['isolation_required', 83],
  ['io_count', 82],
])

export function rankQuestions(questions = [], options = {}) {
  const maxQuestions = Number(options.maxQuestions || DEFAULT_MAX_QUESTIONS)
  const unique = [...new Set(questions.filter(Boolean))]
  const ranked = unique
    .map((question, index) => ({ question, score: PRIORITY.get(question) ?? 50 - index }))
    .sort((a, b) => b.score - a.score || a.question.localeCompare(b.question))
    .map((entry) => entry.question)
  return options.minimumQuestionMode === false ? ranked : ranked.slice(0, maxQuestions)
}

export function questionPriorityReason(question) {
  if (PRIORITY.has(question)) return 'affects schematic, placement, routing, sourcing, compliance, or manufacturing'
  return 'lower-risk question can be deferred or captured as an assumption'
}

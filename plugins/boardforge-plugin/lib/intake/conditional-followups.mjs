export function selectedConditionalFollowups(tree, answers = {}) {
  const selected = []
  const interfaces = normalizeList(answers.interfaces_needed)
  const power = String(answers.power_input || '').toLowerCase()
  const shape = String(answers.board_shape || answers.shape_family || '').toLowerCase()
  if (interfaces.includes('can') && tree.conditionalQuestions.includes('can_interface')) selected.push('can_interface')
  if ((interfaces.includes('usb') || /usb/.test(power)) && tree.conditionalQuestions.includes('usb_c_mode')) selected.push('usb_c_mode')
  if ((interfaces.includes('pwm') || interfaces.includes('servo')) && tree.conditionalQuestions.includes('pwm_servo_outputs')) selected.push('pwm_servo_outputs')
  if (/battery|lipo|cell/.test(power) && tree.conditionalQuestions.includes('battery_power')) selected.push('battery_power')
  if (/custom|odd|ears|notch|round|circular/.test(shape) && tree.conditionalQuestions.includes('custom_outline')) selected.push('custom_outline')
  if (/ears/.test(shape) && tree.conditionalQuestions.includes('mounting_ears')) selected.push('mounting_ears')
  if (/notch/.test(shape) && tree.conditionalQuestions.includes('cable_notch')) selected.push('cable_notch')
  if (tree.boardType === 'poe_environment_sensor') selected.push(...tree.conditionalQuestions)
  if (tree.boardType === 'industrial_io_board' && answers.isolation_required) selected.push('isolation_strategy')
  return [...new Set(selected)]
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).toLowerCase())
  return String(value || '').split(/[,\s/]+/).map((item) => item.toLowerCase()).filter(Boolean)
}

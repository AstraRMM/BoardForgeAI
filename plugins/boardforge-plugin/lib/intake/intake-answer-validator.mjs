const ENUMS = {
  manufacturing_target: ['JLCPCB', 'generic_gerber', 'undecided'],
  usb_c_power_or_data: ['power_only', 'data_only', 'power_plus_data'],
  usb_c_mode: ['power_only', 'data_only', 'power_plus_data'],
  poe_isolation: ['true_isolated_poe', 'simplified_fixture', 'engineering_review_required'],
}

export function validateIntakeAnswers(answers = {}) {
  const issues = []
  for (const [key, allowed] of Object.entries(ENUMS)) {
    if (answers[key] && !allowed.includes(String(answers[key]))) {
      issues.push({
        field: key,
        severity: 'warning',
        message: `Expected one of ${allowed.join(', ')}`,
        value: answers[key],
      })
    }
  }
  return {
    schema: 'boardforge.intake-answer-validation.v1',
    valid: issues.filter((issue) => issue.severity === 'error').length === 0,
    issues,
  }
}

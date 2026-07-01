export function analyzeSchematicRisks({ blocks = {}, sourcingStatus = 'NOT_CHECKED', pinMapStatus = 'PASS', placeholderBlocks = [] } = {}) {
  const present = new Set(blocks.present || [])
  const risks = []
  const requiredHumanReview = []
  if (!present.has('powerTree')) risks.push(risk('POWER_TREE_INCOMPLETE', 'high', 'Power rails/regulators are not sufficiently represented.'))
  if (!present.has('mcuSupport')) risks.push(risk('MCU_SUPPORT_INCOMPLETE', 'high', 'MCU power/ground/support pins are not represented.'))
  if (!present.has('resetBootDebug')) risks.push(risk('DEBUG_RESET_REVIEW', 'medium', 'Reset/boot/debug support should be reviewed.'))
  if (!present.has('protection')) risks.push(risk('PROTECTION_PLACEHOLDER', 'medium', 'ESD/TVS/protection is not fully modeled.'))
  if (pinMapStatus !== 'PASS') risks.push(risk('PIN_MAP_REVIEW', 'high', 'Symbol/footprint/pin-map is not fully verified.'))
  if (sourcingStatus !== 'API_VERIFIED') {
    risks.push(risk('SOURCING_NOT_API_VERIFIED', 'medium', 'Supplier stock/assembly readiness is not API verified.'))
    requiredHumanReview.push('Confirm sourcing and assembly availability before production buy.')
  }
  for (const item of placeholderBlocks) {
    risks.push(risk('SIMPLIFIED_BLOCK', 'medium', `${item} is modeled as a simplified candidate block.`))
    requiredHumanReview.push(`Review ${item} against the selected reference design.`)
  }
  return {
    schema: 'boardforge.schematic-risk-analyzer.v1',
    risks,
    requiredHumanReview,
  }
}

function risk(code, severity, message) {
  return { code, severity, message }
}

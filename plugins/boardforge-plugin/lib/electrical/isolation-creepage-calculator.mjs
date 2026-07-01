import { poeIsolationRules } from './poe-isolation-rules.mjs'

export function calculateIsolationCreepage(input = {}) {
  const rules = poeIsolationRules(input.rules || {})
  const selectedGapMm = Number(input.selectedGapMm ?? 5.2)
  const slotLengthMm = Number(input.slotLengthMm ?? 0)
  const estimatedClearanceMm = selectedGapMm
  const estimatedCreepageMm = selectedGapMm + Math.max(0, slotLengthMm * 0.35)
  const copperCrossings = input.copperCrossings || []
  const boundary = {
    id: input.boundaryId || 'POE_PRIMARY_SECONDARY_BOUNDARY',
    primaryZone: input.primaryZone || 'RJ45_MAGNETICS_PD_PRIMARY',
    secondaryZone: input.secondaryZone || 'MCU_SENSOR_LOW_VOLTAGE',
    selectedGapMm,
    slotLengthMm,
  }
  const violations = []
  if (estimatedClearanceMm < rules.minimumClearanceMm) violations.push('CLEARANCE_BELOW_MINIMUM')
  if (estimatedCreepageMm < rules.minimumCreepageMm) violations.push('CREEPAGE_BELOW_MINIMUM')
  if (copperCrossings.length) violations.push('COPPER_CROSSES_ISOLATION_BOUNDARY')
  const warnings = []
  if (estimatedClearanceMm < rules.recommendedClearanceMm) warnings.push('CLEARANCE_BELOW_RECOMMENDED_REVIEW')
  if (estimatedCreepageMm < rules.recommendedCreepageMm) warnings.push('CREEPAGE_BELOW_RECOMMENDED_REVIEW')
  return {
    schema: 'boardforge.isolation-creepage-calculator.v1',
    complianceCertified: false,
    engineeringReviewRequired: true,
    requestedVoltageDomainAssumptions: {
      inputVoltageV: rules.assumedInputVoltageV,
      transientReviewRequired: rules.transientReviewRequired,
    },
    boundary,
    rules,
    estimatedClearanceMm: round(estimatedClearanceMm),
    estimatedCreepageMm: round(estimatedCreepageMm),
    copperKeepout: {
      required: rules.copperKeepoutAcrossBoundary,
      crossings: copperCrossings,
      status: copperCrossings.length ? 'VIOLATION' : 'PASS',
    },
    slotCutoutNotes: slotLengthMm > 0 ? 'Slot/cutout increases modeled creepage estimate but requires fab/mechanical review.' : 'No slot/cutout modeled.',
    violations,
    warnings,
    status: violations.length ? 'ISOLATION_REVIEW_BLOCKED' : 'ISOLATION_PRECHECK_PASS_REVIEW_REQUIRED',
    humanReviewRequired: [
      'Verify standard-specific PoE isolation, hipot, creepage, and clearance requirements.',
      'Verify selected MagJack/transformer/module datasheets and reference design layout.',
      'Do not claim PoE compliance from this calculator alone.',
    ],
  }
}

function round(value) {
  return Math.round(Number(value) * 1000) / 1000
}

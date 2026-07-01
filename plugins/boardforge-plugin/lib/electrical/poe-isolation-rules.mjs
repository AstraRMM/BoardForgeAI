export const poeIsolationRuleDefaults = {
  schema: 'boardforge.poe-isolation-rules.v1',
  assumedInputVoltageV: 57,
  transientReviewRequired: true,
  minimumClearanceMm: 2.0,
  recommendedClearanceMm: 4.0,
  minimumCreepageMm: 2.5,
  recommendedCreepageMm: 5.0,
  copperKeepoutAcrossBoundary: true,
  slotOrCutoutSupported: true,
  complianceCertified: false,
  engineeringReviewRequired: true,
  notes: [
    'PoE rules are engineering precheck rules, not a safety certification.',
    'Final values depend on standard revision, pollution degree, material group, altitude, enclosure, and selected power architecture.',
  ],
}

export function poeIsolationRules(overrides = {}) {
  return { ...poeIsolationRuleDefaults, ...overrides }
}

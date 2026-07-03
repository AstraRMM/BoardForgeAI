export function reviewSchematicQuality({ health }) {
  const validation = health.inputs.validation || {}
  return {
    score: (validation.erc ?? 0) === 0 ? 90 : 50,
    notes: (validation.erc ?? 0) === 0 ? ['ERC is clean in local artifacts.'] : ['ERC blockers remain.'],
  }
}

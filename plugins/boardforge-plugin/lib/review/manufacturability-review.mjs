export function reviewManufacturability({ health }) {
  const validation = health.inputs.validation || {}
  const manufacturing = health.inputs.manufacturing || {}
  const clean = (validation.drc ?? 0) === 0 && (validation.shorts ?? 0) === 0 && (validation.unconnected ?? 0) === 0
  return {
    score: clean && manufacturing.ready ? 94 : 55,
    notes: clean ? ['Local KiCad validation is clean.'] : ['Board still has validation blockers.'],
  }
}

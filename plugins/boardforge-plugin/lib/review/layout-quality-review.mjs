export function reviewLayoutQuality({ health }) {
  const validation = health.inputs.validation || {}
  const cleanRouting = (validation.unconnected ?? 0) === 0 && (validation.shorts ?? 0) === 0
  return {
    placement: cleanRouting ? 88 : 58,
    routing: cleanRouting ? 92 : 45,
    mechanical: (validation.forbiddenVias ?? 0) === 0 ? 90 : 50,
  }
}

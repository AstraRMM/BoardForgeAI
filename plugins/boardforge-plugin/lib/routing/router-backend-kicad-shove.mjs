export function detectKiCadShoveBackend(options = {}) {
  return {
    id: 'kicad_shove',
    name: 'KiCad interactive shove',
    available: Boolean(options.enableKiCadShoveAutomation),
    missing: options.enableKiCadShoveAutomation ? [] : ['scriptable_kicad_shove_disabled'],
    optional: true,
    scope: 'local_finishing_only',
  }
}

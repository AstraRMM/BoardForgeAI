import fs from 'node:fs'

export function detectElectraBackend(options = {}) {
  const executable = options.electraPath || process.env.BOARDFORGE_ELECTRA || null
  const available = Boolean(executable && fs.existsSync(executable))
  return {
    id: 'electra',
    name: 'Electra',
    available,
    executable,
    missing: available ? [] : ['electra_executable_or_license'],
    optional: true,
    supports: ['dsn_if_installed'],
  }
}

import fs from 'node:fs'

export function detectTopoRBackend(options = {}) {
  const executable = options.toporPath || process.env.BOARDFORGE_TOPOR || null
  const available = Boolean(executable && fs.existsSync(executable))
  return {
    id: 'topor',
    name: 'TopoR',
    available,
    executable,
    missing: available ? [] : ['topor_executable'],
    optional: true,
    supports: ['dsn_if_installed'],
  }
}

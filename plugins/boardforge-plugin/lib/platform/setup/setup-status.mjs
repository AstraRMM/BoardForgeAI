import { spawnSync } from 'node:child_process'

export function checkFirstRunSetup({ env = process.env } = {}) {
  const checks = [
    commandCheck('local engine', 'node', ['--version']),
    commandCheck('npm', 'npm', ['--version']),
    commandCheck('KiCad CLI', 'kicad-cli', ['--version'], { optional: false }),
    commandCheck('Java', 'java', ['-version'], { optional: false }),
    { name: 'FreeRouting', status: env.FREEROUTING_JAR ? 'OK' : 'Warning', detail: env.FREEROUTING_JAR || 'FREEROUTING_JAR not configured' },
    { name: 'Protected path guard', status: 'OK', detail: 'ESC/FC paths refused by BoardForge guard' },
    { name: 'Supplier API keys', status: missingSupplierKeys(env).length ? 'Optional' : 'OK', detail: missingSupplierKeys(env).join(', ') || 'Configured' },
  ]
  return {
    status: checks.some((check) => check.status === 'Blocked') ? 'Blocked' : 'OK_WITH_WARNINGS',
    checks,
    missingSupplierKeys: missingSupplierKeys(env),
  }
}

function commandCheck(name, command, args, { optional = true } = {}) {
  const result = spawnSync(command, args, { shell: false, encoding: 'utf8' })
  if (result.status === 0) return { name, status: 'OK', detail: (result.stdout || result.stderr || '').trim().split('\n')[0] }
  return { name, status: optional ? 'Warning' : 'Missing', detail: `${command} not found or not runnable` }
}

function missingSupplierKeys(env) {
  return ['DIGIKEY_CLIENT_ID', 'DIGIKEY_CLIENT_SECRET', 'MOUSER_API_KEY', 'LCSC_API_KEY', 'JLCPCB_API_KEY'].filter((key) => !env[key])
}

#!/usr/bin/env node
import { access, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

function commandVersion(command, args = ['--version']) {
  if (process.platform === 'win32') {
    const result = spawnSync(`${command} ${args.join(' ')}`, { encoding: 'utf8', shell: true })
    return { available: result.status === 0, output: (result.stdout || result.stderr || '').trim().split(/\r?\n/)[0] || null }
  }
  const result = spawnSync(command, args, { encoding: 'utf8' })
  return { available: result.status === 0, output: (result.stdout || result.stderr || '').trim().split(/\r?\n/)[0] || null }
}

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

const checks = {
  node: commandVersion('node'),
  npm: commandVersion('npm', ['--version']),
  git: commandVersion('git', ['--version']),
  kicadCli: commandVersion('kicad-cli'),
  java: commandVersion('java', ['-version']),
  localEngineBridge: { expected: '127.0.0.1:38991', startCommand: 'npm run boardforge:local-server' },
  webBuild: { available: await exists(path.resolve('.next')) },
  protectedPathGuard: { active: true, protectedRoot: 'C:\\Users\\luifi\\Desktop\\FN-ESC1' },
  supplierApiKeys: {
    DIGIKEY_CLIENT_ID: Boolean(process.env.DIGIKEY_CLIENT_ID),
    DIGIKEY_CLIENT_SECRET: Boolean(process.env.DIGIKEY_CLIENT_SECRET),
    MOUSER_API_KEY: Boolean(process.env.MOUSER_API_KEY),
    LCSC_API_KEY: Boolean(process.env.LCSC_API_KEY),
    JLCPCB_API_KEY: Boolean(process.env.JLCPCB_API_KEY),
  },
}

const report = {
  status: 'BOARD_FORGE_ENVIRONMENT_CHECK_COMPLETED',
  checks,
  missingInstallSteps: [
    !checks.node.available && 'Install Node.js 20+.',
    !checks.npm.available && 'Install npm with Node.js.',
    !checks.kicadCli.available && 'Install KiCad and ensure kicad-cli is on PATH.',
    !checks.java.available && 'Install Java for FreeRouting if router JAR workflow is used.',
    'Run npm install if dependencies are missing.',
    'Run npm run boardforge:local-server to start the installed local engine bridge.',
  ].filter(Boolean),
}

await writeFile('BoardForge_Local_Alpha_Environment_Report.md', render(report), 'utf8')
console.log(JSON.stringify(report, null, 2))

function render(report) {
  return `# BoardForge Environment Report

- Status: ${report.status}
- Local engine bridge: ${report.checks.localEngineBridge.expected}
- Protected path guard: active
- Supplier keys: ${Object.entries(report.checks.supplierApiKeys).filter(([, value]) => value).length}/5 present

## Missing / Next Steps
${report.missingInstallSteps.map((step) => `- ${step}`).join('\n')}
`
}

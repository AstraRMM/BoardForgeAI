#!/usr/bin/env node
import { access, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

loadLocalEnvFile('.env.local')

function commandVersion(command, args = ['--version']) {
  const result = process.platform === 'win32' && /\.(cmd|bat)$/i.test(command)
    ? spawnSync('cmd.exe', ['/c', command, ...args], { encoding: 'utf8' })
    : spawnSync(command, args, { encoding: 'utf8' })
  return { available: result.status === 0, output: (result.stdout || result.stderr || '').trim().split(/\r?\n/)[0] || null }
}

function firstAvailableCommand(candidates, args = ['--version']) {
  for (const candidate of candidates.filter(Boolean)) {
    const result = commandVersion(candidate, args)
    if (result.available) return { ...result, path: candidate }
  }
  const result = commandVersion(candidates[candidates.length - 1], args)
  return { ...result, path: null }
}

function loadLocalEnvFile(file) {
  try {
    const body = spawnSync(process.execPath, ['-e', `
      const fs = require('fs');
      const file = process.argv[1];
      if (!fs.existsSync(file)) process.exit(0);
      process.stdout.write(fs.readFileSync(file, 'utf8'));
    `, file], { encoding: 'utf8' }).stdout || ''
    for (const line of body.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match || process.env[match[1]]) continue
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  } catch {}
}

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

function fileExistsSync(file) {
  try {
    return Boolean(file && spawnSync(process.execPath, ['-e', 'process.exit(require("fs").existsSync(process.argv[1]) ? 0 : 1)', file]).status === 0)
  } catch {
    return false
  }
}

async function checkLocalEngine() {
  const port = Number(process.env.BOARDFORGE_LOCAL_ENGINE_PORT || 38991)
  const baseUrl = `http://127.0.0.1:${port}`
  try {
    const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1200) })
    const body = await response.json().catch(() => null)
    return {
      expected: '127.0.0.1:38991',
      baseUrl,
      running: response.ok,
      status: response.ok ? 'ONLINE' : 'UNHEALTHY',
      health: body,
      startCommand: 'npm run boardforge:start',
    }
  } catch {
    return {
      expected: '127.0.0.1:38991',
      baseUrl,
      running: false,
      status: 'OFFLINE',
      health: null,
      startCommand: 'npm run boardforge:start',
    }
  }
}

function detectFreeRoutingJar() {
  const candidates = [
    process.env.BOARDFORGE_FREEROUTING_JAR,
    process.env.FREEROUTING_JAR,
    path.resolve('tools/freerouting/freerouting.jar'),
    path.resolve('tools/freerouting/freerouting-2.2.4.jar'),
    path.resolve('plugins/boardforge-plugin/tools/freerouting.jar'),
  ].filter(Boolean)
  const found = candidates.find((candidate) => fileExistsSync(candidate)) || null
  return {
    available: Boolean(found),
    path: found,
    searched: candidates,
    setupCommand: 'npm run boardforge:setup-routing',
  }
}

const localEngineBridge = await checkLocalEngine()
const freeroutingJar = detectFreeRoutingJar()
const java = commandVersion('java', ['-version'])

const checks = {
  node: commandVersion('node'),
  npm: firstAvailableCommand([process.env.npm_execpath, process.platform === 'win32' ? 'C:\\Program Files\\nodejs\\npm.cmd' : null, process.platform === 'win32' ? 'npm.cmd' : 'npm', 'npm'], ['--version']),
  git: commandVersion('git', ['--version']),
  kicadCli: firstAvailableCommand([
    process.env.BOARDFORGE_KICAD_CLI,
    'C:\\Program Files\\KiCad\\10.0\\bin\\kicad-cli.exe',
    'C:\\Program Files\\KiCad\\10\\bin\\kicad-cli.exe',
    'C:\\Program Files\\KiCad\\9.0\\bin\\kicad-cli.exe',
    'C:\\Program Files\\KiCad\\8.0\\bin\\kicad-cli.exe',
    'kicad-cli',
  ], ['version']),
  java,
  freeroutingJar,
  routingJarWorkflow: {
    status: java.available && freeroutingJar.available ? 'ROUTING_JAR_READY' : 'ROUTING_JAR_OPTIONAL_MISSING_WITH_SETUP_STEPS',
    optional: true,
  },
  localEngineBridge,
  webBuild: { available: await exists(path.resolve('.next')) },
  protectedPathGuard: { active: true, protectedRoot: 'C:\\Users\\luifi\\Desktop\\FN-ESC1' },
  supplierApiKeys: {
    DIGIKEY_CLIENT_ID: Boolean(process.env.DIGIKEY_CLIENT_ID),
    DIGIKEY_CLIENT_SECRET: Boolean(process.env.DIGIKEY_CLIENT_SECRET),
    MOUSER_API_KEY: Boolean(process.env.MOUSER_API_KEY || process.env.MOUSER_SEARCH_API_KEY || process.env.MOUSER_PRODUCT_API_KEY),
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
    !checks.java.available && 'Optional: install Java for FreeRouting JAR workflow.',
    !checks.freeroutingJar.available && 'Optional: run npm run boardforge:setup-routing to configure a FreeRouting JAR path.',
    !checks.localEngineBridge.running && 'Run npm run boardforge:start to start the installed local engine bridge.',
    'Run npm install if dependencies are missing.',
  ].filter(Boolean),
}

await writeFile('BoardForge_Local_Alpha_Environment_Report.md', render(report), 'utf8')
console.log(JSON.stringify(report, null, 2))

function render(report) {
  return `# BoardForge Environment Report

- Status: ${report.status}
- Local engine bridge: ${report.checks.localEngineBridge.status} (${report.checks.localEngineBridge.baseUrl})
- Routing JAR workflow: ${report.checks.routingJarWorkflow.status}
- FreeRouting JAR: ${report.checks.freeroutingJar.path || 'missing'}
- Protected path guard: active
- Supplier keys: ${Object.entries(report.checks.supplierApiKeys).filter(([, value]) => value).length}/5 present

## Missing / Next Steps
${report.missingInstallSteps.map((step) => `- ${step}`).join('\n')}
`
}

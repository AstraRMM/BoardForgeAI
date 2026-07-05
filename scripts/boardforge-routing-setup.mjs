#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const candidates = [
  process.env.BOARDFORGE_FREEROUTING_JAR,
  process.env.FREEROUTING_JAR,
  path.join(rootDir, 'tools', 'freerouting', 'freerouting.jar'),
  path.join(rootDir, 'tools', 'freerouting', 'freerouting-2.2.4.jar'),
  path.join(rootDir, 'plugins', 'boardforge-plugin', 'tools', 'freerouting.jar'),
].filter(Boolean)

const java = command('java', ['-version'])
const jarPath = await firstExisting(candidates)
let smoke = { attempted: false, passed: false, output: null }
if (java.available && jarPath) {
  const result = spawnSync('java', ['-jar', jarPath, '-help'], { encoding: 'utf8', timeout: 10000 })
  smoke = {
    attempted: true,
    passed: result.status === 0 || /freerouting|usage|help/i.test(`${result.stdout}\n${result.stderr}`),
    output: firstLine(result.stdout || result.stderr),
  }
}

const status = java.available && jarPath
  ? smoke.passed ? 'ROUTING_JAR_READY' : 'ROUTING_JAR_FOUND_SMOKE_REVIEW_REQUIRED'
  : 'ROUTING_JAR_OPTIONAL_MISSING_WITH_SETUP_STEPS'

const report = {
  status,
  java,
  freeroutingJar: { found: Boolean(jarPath), path: jarPath, searched: candidates },
  smoke,
  optionalForPublicAlpha: true,
  setupSteps: [
    'Install Java 21+ or the Java runtime required by the selected FreeRouting JAR.',
    'Place FreeRouting at tools/freerouting/freerouting.jar or set BOARDFORGE_FREEROUTING_JAR.',
    'Run npm run boardforge:setup-routing again.',
  ],
  generatedAt: new Date().toISOString(),
}

await writeFile('BoardForge_Routing_Setup_Report.json', JSON.stringify(report, null, 2), 'utf8')
await writeFile('BoardForge_Routing_Setup_Report.md', render(report), 'utf8')
console.log(JSON.stringify(report, null, 2))
process.exit(status === 'ROUTING_JAR_FOUND_SMOKE_REVIEW_REQUIRED' ? 1 : 0)

function command(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8' })
  return { available: result.status === 0, output: firstLine(result.stdout || result.stderr) }
}

async function firstExisting(files) {
  for (const file of files) {
    try {
      await access(file)
      return file
    } catch {}
  }
  await mkdir(path.join(rootDir, 'tools', 'freerouting'), { recursive: true })
  return null
}

function firstLine(value = '') {
  return String(value).trim().split(/\r?\n/)[0] || null
}

function render(report) {
  return [
    '# BoardForge Routing Setup Report',
    '',
    `- Status: ${report.status}`,
    `- Java: ${report.java.available ? 'found' : 'missing'}${report.java.output ? ` (${report.java.output})` : ''}`,
    `- FreeRouting JAR: ${report.freeroutingJar.path || 'missing'}`,
    `- Smoke test: ${report.smoke.attempted ? (report.smoke.passed ? 'passed' : 'review required') : 'not attempted'}`,
    '',
    '## Setup Steps',
    ...report.setupSteps.map((step) => `- ${step}`),
    '',
    'This workflow is optional for public alpha unless the user chooses the FreeRouting JAR path.',
    '',
  ].join('\n')
}

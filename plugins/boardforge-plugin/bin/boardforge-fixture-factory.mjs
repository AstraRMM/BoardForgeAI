#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
const outputDir = path.join(repoRoot, 'tmp', 'fixture-factory')
fs.mkdirSync(outputDir, { recursive: true })

function runNode(args) {
  const stdout = execFileSync(process.execPath, args, { cwd: repoRoot, encoding: 'utf8', timeout: 180000 })
  return JSON.parse(stdout)
}

const runner = path.join(repoRoot, 'plugins', 'boardforge-plugin', 'bin', 'boardforge-fixture-runner.mjs')
const startedAt = new Date().toISOString()
const fixtureRun = runNode([runner, '--run'])
const fixtureReport = JSON.parse(fs.readFileSync(fixtureRun.report, 'utf8'))

const lessons = [
  'autonomous_fixture_factory_alpha_loop_001',
  'manufacturing_readiness_requires_full_validation_001',
]

const factoryReport = {
  schema: 'boardforge.fixture-factory-report.v1',
  startedAt,
  finishedAt: new Date().toISOString(),
  status: 'BOARD_FORGE_FIXTURE_FACTORY_COMPLETED',
  fixtureReport: fixtureRun.report,
  fixtures: fixtureReport.fixtures.map((fixture) => ({
    id: fixture.id,
    status: fixture.status,
    projectFolder: fixture.projectFolder,
    drc: fixture.drc,
    erc: fixture.erc,
    unconnected: fixture.unconnected,
    manufacturingReadiness: fixture.manufacturingReadiness,
    manufacturingZip: fixture.manufacturingZip,
    routeabilityScore: fixture.routeabilityScore,
    lessonsSaved: fixture.lessonsSaved,
  })),
  summary: {
    fixturesRun: fixtureReport.fixtures.length,
    manufacturingReady: fixtureReport.fixtures.filter((fixture) => fixture.manufacturingReadiness === 'ready').length,
    blocked: fixtureReport.fixtures.filter((fixture) => fixture.manufacturingReadiness !== 'ready').length,
  },
  lessons,
}

const jsonFile = path.join(outputDir, 'boardforge-fixture-factory-report.json')
const mdFile = path.join(outputDir, 'BoardForge Fixture Factory Report.md')
fs.writeFileSync(jsonFile, JSON.stringify(factoryReport, null, 2), 'utf8')
fs.writeFileSync(mdFile, `# BoardForge Fixture Factory Report

- Status: ${factoryReport.status}
- Fixtures run: ${factoryReport.summary.fixturesRun}
- Manufacturing ready: ${factoryReport.summary.manufacturingReady}
- Blocked: ${factoryReport.summary.blocked}
- Source fixture report: ${fixtureRun.report}

## Fixtures

${factoryReport.fixtures.map((fixture) => `### ${fixture.id}

- Status: ${fixture.status}
- DRC: ${fixture.drc?.errors ?? fixture.drc?.total ?? 'n/a'}
- ERC: ${fixture.erc?.errors ?? fixture.erc?.total ?? 'n/a'}
- Unconnected: ${fixture.unconnected ?? 'n/a'}
- Manufacturing: ${fixture.manufacturingReadiness}
- ZIP: ${fixture.manufacturingZip || 'not exported'}
`).join('\n')}
`, 'utf8')

console.log(JSON.stringify({
  status: factoryReport.status,
  report: jsonFile,
  markdown: mdFile,
  summary: factoryReport.summary,
}, null, 2))

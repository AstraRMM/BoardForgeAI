#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
const fixtureRoot = path.join(repoRoot, 'fixtures', 'boards')

function readFixtures() {
  if (!fs.existsSync(fixtureRoot)) return []
  return fs.readdirSync(fixtureRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const file = path.join(fixtureRoot, entry.name, 'fixture.json')
      return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null
    })
    .filter(Boolean)
}

function buildFixtureReport(fixtures) {
  return {
    schema: 'boardforge.fixture-report.v1',
    fixtures: fixtures.map((fixture) => ({
      id: fixture.id,
      name: fixture.name,
      revision: fixture.revision,
      targetFolder: fixture.targetFolder,
      layers: fixture.layers,
      expectedOutputs: fixture.expectedOutputs,
      status: 'defined_not_executed',
      validationCriteria: fixture.constraints?.manufacturingRequires || {},
      knownRisks: fixture.knownRisks || [],
    })),
  }
}

const args = new Set(process.argv.slice(2))
const fixtures = readFixtures()
const report = buildFixtureReport(fixtures)

if (args.has('--list')) {
  console.log(JSON.stringify({ fixtures: fixtures.map((fixture) => fixture.id) }, null, 2))
} else if (args.has('--run') || args.has('--golden') || args.has('--report')) {
  const outDir = path.join(repoRoot, 'tmp', 'fixture-runner')
  fs.mkdirSync(outDir, { recursive: true })
  const out = path.join(outDir, 'boardforge-fixture-report.json')
  fs.writeFileSync(out, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ status: 'FIXTURE_REPORT_WRITTEN', report: out, fixtures: report.fixtures.length }, null, 2))
} else {
  console.log(JSON.stringify({ usage: 'boardforge-fixture-runner --list|--run|--golden|--report' }, null, 2))
}

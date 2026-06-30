#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { assertPathIsAllowed } from '../lib/platform/protected-path-guard.mjs'
import { writeProjectArtifactPack } from '../lib/platform/project-artifacts.mjs'

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1] || fallback
}

function hasArg(name) {
  return process.argv.includes(name)
}

async function main() {
  if (hasArg('--help') || hasArg('-h')) {
    print({
      status: 'BOARD_FORGE_PLATFORM_ARTIFACTS_HELP',
      usage: 'boardforge-platform-artifacts --output <dir> [--project-json <file>|--project-name <name>] [--evidence-json <file>]',
    })
    return
  }

  const outputDir = path.resolve(argValue('--output', './boardforge-artifacts'))
  const guardedOutput = assertPathIsAllowed(outputDir)
  if (!guardedOutput.allowed) throw new Error(`Refused artifact output: ${guardedOutput.reason} (${outputDir})`)

  const project = await loadJsonArg('--project-json', {
    id: argValue('--project-id', argValue('--project-name', 'boardforge-project')),
    name: argValue('--project-name', 'BoardForge Project'),
    boardPath: argValue('--board', null),
    schematicPath: argValue('--schematic', null),
    projectPath: argValue('--project', outputDir),
  })
  const evidence = await loadJsonArg('--evidence-json', {
    status: argValue('--status', 'in_progress'),
    shorts: Number(argValue('--shorts', 0)),
    unconnected: Number(argValue('--unconnected', 0)),
    forbiddenVias: Number(argValue('--forbidden-vias', 0)),
    drcViolations: Number(argValue('--drc', 0)),
    ercViolations: Number(argValue('--erc', 0)),
    manufacturingReady: hasArg('--manufacturing-ready'),
    manufacturingZip: argValue('--manufacturing-zip', null),
  })
  const run = await loadJsonArg('--run-json', {
    controller: argValue('--controller', 'boardforge_cli'),
    workflowSteps: valuesAfter('--step'),
    lessonsSaved: valuesAfter('--lesson'),
  })
  const actions = await loadJsonArg('--actions-json', [])

  for (const candidate of [project.boardPath, project.schematicPath, evidence.manufacturingZip].filter(Boolean)) {
    const guarded = assertPathIsAllowed(candidate)
    if (!guarded.allowed) throw new Error(`Refused protected artifact input: ${guarded.reason} (${candidate})`)
  }

  const result = await writeProjectArtifactPack({ outputDir, project, evidence, run, actions })
  print({
    status: 'BOARD_FORGE_PROJECT_ARTIFACTS_WRITTEN',
    outputDir,
    files: result.files,
    readiness: result.artifactPack.webProjectCard.readiness,
    nextAction: result.artifactPack.webProjectCard.nextAction,
  })
}

async function loadJsonArg(name, fallback) {
  const file = argValue(name, null)
  if (!file) return fallback
  const resolved = path.resolve(file)
  const guarded = assertPathIsAllowed(resolved)
  if (!guarded.allowed) throw new Error(`Refused JSON input: ${guarded.reason} (${resolved})`)
  return JSON.parse(await readFile(resolved, 'utf8'))
}

function valuesAfter(name) {
  const values = []
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) values.push(process.argv[index + 1])
  }
  return values
}

function print(value) {
  console.log(JSON.stringify(value, null, 2))
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: 'BOARD_FORGE_PROJECT_ARTIFACTS_FAILED',
    errors: [{ severity: 'ERROR', code: 'PLATFORM_ARTIFACTS_ERROR', message: error.message }],
  }, null, 2))
  process.exit(1)
})

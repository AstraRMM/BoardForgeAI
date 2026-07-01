#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { executeJob } from '../lib/jobs.mjs'
import { assertPathIsAllowed } from '../lib/platform/protected-path-guard.mjs'

const command = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'help'

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1] || fallback
}

function hasArg(name) {
  return process.argv.includes(name)
}

function jsonOut(value) {
  console.log(JSON.stringify(value, null, 2))
}

function usage() {
  return {
    status: 'BOARD_FORGE_CLI_HELP',
    usage: 'boardforge <init|create|import|validate|route|repair|cleanup|export|status|report|replay> [options]',
    commands: {
      init: 'Create a safe BoardForge workspace marker.',
      create: 'Create a KiCad project from a controlled BoardForge template.',
      import: 'Copy an existing KiCad project into a BoardForge sandbox without mutating the source.',
      validate: 'Run preflight/manufacturing validation planning for a project.',
      route: 'Run the routed-board workflow entrypoint for a project.',
      repair: 'Run or plan repair workflow for a sandbox project.',
      cleanup: 'Plan DRC/post-route repair for a project.',
      export: 'Generate manufacturing manifest/package gates.',
      status: 'Read local BoardForge status artifacts for a sandbox/project.',
      report: 'Generate dashboard data from BoardForge manifests.',
      replay: 'Print or execute a manifest replay command.',
    },
    options: [
      '--workspace <path>',
      '--project <path>',
      '--name <project-name>',
      '--template <template-id>',
      '--manifest <boardforge-project-manifest.json>',
      '--output <path>',
      '--dry-run',
    ],
  }
}

async function main() {
  if (command === 'help' || hasArg('--help') || hasArg('-h')) {
    jsonOut(usage())
    return
  }

  const workspace = path.resolve(argValue('--workspace', './boardforge-workspace'))
  const projectPath = argValue('--project', '')
  const dryRun = hasArg('--dry-run')
  const planned = await planCommand(command, { workspace, projectPath, dryRun })

  if (dryRun) {
    jsonOut({ status: 'BOARD_FORGE_CLI_DRY_RUN', ...planned })
    return
  }

  if (planned.kind === 'init') {
    await mkdir(workspace, { recursive: true })
    const marker = path.join(workspace, 'boardforge-workspace.json')
    await writeFile(marker, JSON.stringify({ schema: 'boardforge.workspace.v1', workspace, createdAt: new Date().toISOString() }, null, 2), 'utf8')
    jsonOut({ status: 'BOARD_FORGE_WORKSPACE_INITIALIZED', workspace, marker })
    return
  }

  if (planned.kind === 'dashboard-data') {
    const { writeProjectDashboardData } = await import('../lib/platform/project-dashboard-data.mjs')
    const { dashboard, outputPath } = await writeProjectDashboardData(planned.dashboard)
    jsonOut({ status: 'BOARD_FORGE_DASHBOARD_DATA_WRITTEN', outputPath, summary: dashboard.summary })
    return
  }

  if (planned.kind === 'import-sandbox') {
    const { importProjectToSandbox } = await import('../lib/platform/copy-sandbox-importer.mjs')
    jsonOut(importProjectToSandbox(planned.importOptions))
    return
  }

  if (planned.kind === 'status') {
    const { readLocalEngineStatus } = await import('../lib/platform/local-engine-status-reader.mjs')
    jsonOut({ status: 'BOARD_FORGE_LOCAL_STATUS', projectPath: planned.projectPath, engine: readLocalEngineStatus(planned.projectPath) })
    return
  }

  if (planned.kind === 'replay') {
    jsonOut({ status: 'BOARD_FORGE_REPLAY_COMMAND_READY', replayCommand: planned.replayCommand, executeManually: true })
    return
  }

  const result = await executeJob(planned.job, workspace)
  jsonOut({ command, workspace, job: planned.job, result })
  if (/BLOCKED|FAILED|NEEDS_FIX|VALIDATION_FAILED/.test(result.status || '')) process.exitCode = 2
}

async function planCommand(name, context) {
  const { workspace, projectPath } = context
  if (name === 'init') return { kind: 'init', command: name, workspace }
  if (name === 'import') return planImportCommand(context)
  if (name === 'report') return planReportCommand(context)
  if (name === 'replay') return planReplayCommand()
  if (name === 'status') return planStatusCommand(context)

  const guarded = guardProjectPath(projectPath, name)
  const projectName = argValue('--name', path.basename(projectPath || 'boardforge-project'))
  const templateId = argValue('--template', 'ESP32_S3_SENSOR')

  const jobByCommand = {
    create: {
      id: 'cli_create_project',
      type: 'create_kicad_project',
      allowOverwrite: hasArg('--overwrite'),
      input: {
        projectName,
        projectPath: projectPath || projectName,
        templateId,
        layerCount: Number(argValue('--layers', 4)),
      },
    },
    validate: {
      id: 'cli_validate_project',
      type: 'run_project_preflight',
      input: { projectPath },
    },
    route: {
      id: 'cli_route_project',
      type: 'autoroute_and_apply',
      input: { projectPath },
    },
    repair: {
      id: 'cli_repair_project',
      type: 'plan_drc_repairs',
      input: { projectPath },
    },
    cleanup: {
      id: 'cli_cleanup_project',
      type: 'plan_drc_repairs',
      input: { projectPath },
    },
    export: {
      id: 'cli_export_project',
      type: 'generate_manufacturing_manifest',
      input: { projectPath },
    },
  }

  const job = jobByCommand[name]
  if (!job) throw new Error(`Unknown BoardForge CLI command: ${name}`)
  return { kind: 'job', command: name, workspace, projectGuard: guarded, job }
}

function guardProjectPath(projectPath, commandName) {
  if (commandName === 'create' && !projectPath) return { allowed: true, path: null, reason: 'new_project_name_only' }
  const guarded = assertPathIsAllowed(projectPath)
  if (!guarded.allowed) throw new Error(`Refused ${commandName}: ${guarded.reason} (${projectPath || 'missing project path'})`)
  return guarded
}

function planImportCommand(context) {
  const source = argValue('--source', context.projectPath || process.argv[3] || '')
  const sourceGuard = assertPathIsAllowed(source)
  if (!sourceGuard.allowed) throw new Error(`Refused import: ${sourceGuard.reason} (${source || 'missing source path'})`)
  const name = path.basename(path.resolve(source || 'boardforge-import'))
  const output = argValue('--output', path.join('C:\\Users\\luifi\\Desktop\\BoardForge_Sandboxes', `${name}_import_sandbox`))
  const outputGuard = assertPathIsAllowed(output)
  if (!outputGuard.allowed) throw new Error(`Refused import output: ${outputGuard.reason} (${output})`)
  return {
    kind: 'import-sandbox',
    command: 'import',
    workspace: context.workspace,
    importOptions: { source, output },
  }
}

function planStatusCommand(context) {
  const target = context.projectPath || process.argv[3] || ''
  const guarded = assertPathIsAllowed(target)
  if (!guarded.allowed) throw new Error(`Refused status: ${guarded.reason} (${target || 'missing project path'})`)
  return { kind: 'status', command: 'status', workspace: context.workspace, projectPath: target }
}

function planReportCommand(context) {
  const manifests = valuesAfter('--manifest').map((file) => path.resolve(file))
  const outputPath = path.resolve(argValue('--output', path.join(context.workspace, 'boardforge-dashboard-data.json')))
  for (const manifest of manifests) {
    const guarded = assertPathIsAllowed(manifest)
    if (!guarded.allowed) throw new Error(`Refused report: ${guarded.reason} (${manifest})`)
  }
  return {
    kind: 'dashboard-data',
    command: 'report',
    workspace: context.workspace,
    dashboard: { manifestPaths: manifests, outputPath },
  }
}

async function planReplayCommand() {
  const manifestPath = argValue('--manifest', '')
  const guarded = assertPathIsAllowed(manifestPath)
  if (!guarded.allowed) throw new Error(`Refused replay: ${guarded.reason} (${manifestPath || 'missing manifest path'})`)
  const manifest = JSON.parse(await readFile(path.resolve(manifestPath), 'utf8'))
  return {
    kind: 'replay',
    command: 'replay',
    manifestPath: path.resolve(manifestPath),
    replayCommand: manifest.replay?.command || manifest.replayCommand || null,
  }
}

function valuesAfter(name) {
  const values = []
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) values.push(process.argv[index + 1])
  }
  return values
}

main().catch((error) => {
  console.error(JSON.stringify({ status: 'BOARD_FORGE_CLI_FAILED', command, errors: [{ severity: 'ERROR', code: 'CLI_ERROR', message: error.message }] }, null, 2))
  process.exit(1)
})

import { assertPathIsAllowed } from './protected-path-guard.mjs'
import { aiCommandToCliVerb, validateAiCommand } from './ai-command-schema.mjs'

export function planAiCommand(command = {}, options = {}) {
  const validation = validateAiCommand(command)
  if (!validation.valid) return { accepted: false, reason: 'invalid_command', errors: validation.errors }

  const guarded = validation.command.projectPath
    ? assertPathIsAllowed(validation.command.projectPath, options)
    : { allowed: true, path: validation.command.projectPath || null, reason: 'no_project_path_required' }
  if (!guarded.allowed && validation.command.type !== 'write_solution_record') {
    return { accepted: false, reason: guarded.reason, command: validation.command }
  }

  const cliVerb = aiCommandToCliVerb(validation.command.type)
  const cli = buildCliPlan(validation.command, cliVerb, options)
  return {
    accepted: true,
    command: validation.command,
    executionMode: validation.command.dryRun ? 'plan_only' : 'execute',
    cli,
    engineJob: cli.engineJob,
  }
}

export function buildAiSessionReport(commands = [], options = {}) {
  const planned = commands.map((command) => planAiCommand(command, options))
  return {
    commands: planned,
    accepted: planned.filter((item) => item.accepted).length,
    rejected: planned.filter((item) => !item.accepted).length,
    protectedRejections: planned.filter((item) => item.reason === 'protected_user_project').length,
  }
}

function buildCliPlan(command, cliVerb, options = {}) {
  const workspace = options.workspace || './boardforge-workspace'
  const args = command.args || {}
  const projectPath = command.projectPath || args.projectPath || ''
  const base = ['npm', 'run', `boardforge:${cliVerb}`, '--']
  const cliArgs = []
  if (projectPath && !['report', 'replay'].includes(cliVerb)) cliArgs.push('--project', projectPath)
  if (args.manifestPath || command.type === 'summarize_status' || command.type === 'continue_from_checkpoint') {
    const manifest = args.manifestPath || projectPath
    if (manifest) cliArgs.push('--manifest', manifest)
  }
  if (args.outputPath) cliArgs.push('--output', args.outputPath)
  if (workspace) cliArgs.push('--workspace', workspace)
  if (command.dryRun) cliArgs.push('--dry-run')
  return {
    verb: cliVerb,
    commandLine: [...base, ...cliArgs].join(' '),
    engineJob: aiCommandToEngineJob(command),
  }
}

function aiCommandToEngineJob(command) {
  const projectPath = command.projectPath || command.args?.projectPath || ''
  const projectName = command.args?.projectName || command.args?.name || 'BoardForge Project'
  const templateId = command.args?.templateId || 'ESP32_S3_SENSOR'
  const jobs = {
    create_project: { type: 'create_kicad_project', input: { projectName, projectPath, templateId } },
    validate_project: { type: 'run_project_preflight', input: { projectPath } },
    generate_outline: { type: 'generate_custom_outline', input: { projectPath, outline: command.args?.outline || {} } },
    run_routing: { type: 'autoroute_and_apply', input: { projectPath } },
    repair_drc: { type: 'plan_drc_repairs', input: { projectPath } },
    export_manufacturing: { type: 'generate_manufacturing_manifest', input: { projectPath } },
    summarize_status: { type: 'summarize_project', input: { projectPath } },
    continue_from_checkpoint: { type: 'resume_boardforge_job', input: { projectPath, checkpoint: command.args?.checkpoint || null } },
    write_solution_record: { type: 'summarize_project', input: { projectPath } },
  }
  const job = jobs[command.type] || { type: 'unknown', input: { projectPath } }
  return {
    id: `${command.id}_${command.type}`,
    ...job,
  }
}

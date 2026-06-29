export const AI_COMMAND_TYPES = Object.freeze([
  'create_project',
  'validate_project',
  'generate_outline',
  'run_routing',
  'repair_drc',
  'export_manufacturing',
  'summarize_status',
  'continue_from_checkpoint',
  'write_solution_record',
])

export const AI_COMMAND_ALIASES = Object.freeze({
  route_project: 'run_routing',
  finish_route: 'run_routing',
  run_drc_erc: 'validate_project',
  repair_postroute: 'repair_drc',
  export: 'export_manufacturing',
  report_status: 'summarize_status',
  resume: 'continue_from_checkpoint',
})

export function normalizeAiCommand(command = {}) {
  const type = AI_COMMAND_ALIASES[command.type] || command.type
  return {
    id: command.id || `cmd_${Date.now()}`,
    type,
    originalType: command.type,
    projectPath: command.projectPath || command.path || command.manifestPath || '',
    args: command.args || {},
    dryRun: command.dryRun !== false,
  }
}

export function validateAiCommand(command = {}) {
  const normalized = normalizeAiCommand(command)
  const errors = []
  if (!AI_COMMAND_TYPES.includes(normalized.type)) errors.push(`unknown_command_type:${normalized.type}`)
  if (!normalized.projectPath && !['write_solution_record', 'summarize_status'].includes(normalized.type)) errors.push('missing_project_path')
  return { command: normalized, valid: errors.length === 0, errors }
}

export function aiCommandToCliVerb(type = '') {
  return {
    create_project: 'create',
    validate_project: 'validate',
    generate_outline: 'create',
    run_routing: 'route',
    repair_drc: 'cleanup',
    export_manufacturing: 'export',
    summarize_status: 'report',
    continue_from_checkpoint: 'replay',
    write_solution_record: 'report',
  }[type] || null
}

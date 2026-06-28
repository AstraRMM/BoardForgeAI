export const AI_COMMAND_TYPES = Object.freeze([
  'create_project',
  'route_project',
  'finish_route',
  'run_drc_erc',
  'export_manufacturing',
  'write_solution_record',
])

export function normalizeAiCommand(command = {}) {
  return {
    id: command.id || `cmd_${Date.now()}`,
    type: command.type,
    projectPath: command.projectPath || command.path || '',
    args: command.args || {},
    dryRun: command.dryRun !== false,
  }
}

export function validateAiCommand(command = {}) {
  const normalized = normalizeAiCommand(command)
  const errors = []
  if (!AI_COMMAND_TYPES.includes(normalized.type)) errors.push(`unknown_command_type:${normalized.type}`)
  if (!normalized.projectPath && normalized.type !== 'write_solution_record') errors.push('missing_project_path')
  return { command: normalized, valid: errors.length === 0, errors }
}

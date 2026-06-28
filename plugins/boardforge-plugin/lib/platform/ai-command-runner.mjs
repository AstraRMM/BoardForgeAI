import { assertPathIsAllowed } from './protected-path-guard.mjs'
import { validateAiCommand } from './ai-command-schema.mjs'

export function planAiCommand(command = {}, options = {}) {
  const validation = validateAiCommand(command)
  if (!validation.valid) return { accepted: false, reason: 'invalid_command', errors: validation.errors }

  const guarded = assertPathIsAllowed(validation.command.projectPath, options)
  if (!guarded.allowed && validation.command.type !== 'write_solution_record') {
    return { accepted: false, reason: guarded.reason, command: validation.command }
  }

  return {
    accepted: true,
    command: validation.command,
    executionMode: validation.command.dryRun ? 'plan_only' : 'execute',
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

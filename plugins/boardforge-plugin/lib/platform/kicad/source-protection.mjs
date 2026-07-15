import fs from 'node:fs'
import path from 'node:path'

const PROTECTED_NAME = /(^|[^a-z])(esc|fc|flight(?:[-_ ]?controller)?|fn[-_ ]?(?:esc|fc))([^a-z]|$)/i

function canonical(input) {
  const absolute = path.resolve(String(input || ''))
  const existing = fs.existsSync(absolute) ? fs.realpathSync.native(absolute) : fs.realpathSync.native(path.dirname(absolute)) + path.sep + path.basename(absolute)
  return path.normalize(existing)
}

function inside(child, parent) {
  const relative = path.relative(parent.toLowerCase(), child.toLowerCase())
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
}

export function enforceCandidatePaths({ sourcePath, sandboxPath, candidatePath }) {
  let source, sandbox, candidate
  try {
    source = canonical(sourcePath); sandbox = canonical(sandboxPath); candidate = canonical(candidatePath)
  } catch (error) {
    return { allowed: false, status: 'BLOCKED_INVALID_SANDBOX', blocker: `Path resolution failed: ${error.code || error.message}` }
  }
  const protectedRoot = canonical('C:\Users\luifi\Desktop\FN-ESC1')
  if (inside(source, protectedRoot) || source.split(path.sep).some(part => PROTECTED_NAME.test(part))) {
    return { allowed: false, status: 'BLOCKED_PROTECTED_PROJECT', blocker: 'The source resolves inside a protected hardware project.' }
  }
  if (candidate.toLowerCase() === source.toLowerCase()) return { allowed: false, status: 'BLOCKED_SOURCE_MUTATION', blocker: 'Candidate path resolves to the source file.' }
  if (!inside(source, sandbox) || !inside(candidate, sandbox)) return { allowed: false, status: 'BLOCKED_INVALID_SANDBOX', blocker: 'Source and candidate must resolve inside the declared sandbox.' }
  const expectedCandidateRoot = path.join(sandbox, '.boardforge', 'candidates')
  if (!inside(candidate, expectedCandidateRoot)) return { allowed: false, status: 'BLOCKED_INVALID_SANDBOX', blocker: 'Candidate must be below .boardforge/candidates.' }
  return { allowed: true, status: 'SOURCE_PROTECTION_CLEAR', sourcePath: source, sandboxPath: sandbox, candidatePath: candidate }
}

export function isProtectedProjectName(value) { return PROTECTED_NAME.test(String(value || '')) }

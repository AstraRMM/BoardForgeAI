import fs from 'node:fs'

const DEFAULT_PROTECTED_PATTERNS = [
  /FN-ESC1/i,
  /FN-ESC/i,
  /FN-FC/i,
  /(^|[\\/])ESC([\\/]|$)/i,
  /(^|[\\/])FC([\\/]|$)/i,
  /flight[-_ ]?controller/i,
  /(^|[\\/])flight([\\/]|$)/i,
]

export const PROTECTED_PATH_APPROVAL_FILENAME = 'BOARD_FORGE_PROTECTED_PATH_APPROVAL.txt'

export function isProtectedBoardPath(filePath = '', options = {}) {
  const normalized = String(filePath).replaceAll('\\', '/')
  const patterns = options.patterns || DEFAULT_PROTECTED_PATTERNS
  return patterns.some((pattern) => pattern.test(normalized))
}

export function assertPathIsAllowed(filePath = '', options = {}) {
  if (!filePath) return { allowed: false, reason: 'missing_path' }
  if (isProtectedBoardPath(filePath, options)) {
    if (options.allowProtected === true && options.approvalFile && hasWrittenProtectedPathApproval(options.approvalFile)) {
      return {
        allowed: true,
        reason: 'protected_user_project_explicitly_approved',
        path: filePath,
        approvalFile: options.approvalFile,
      }
    }
    return {
      allowed: false,
      reason: 'protected_user_project',
      path: filePath,
    }
  }
  return { allowed: true, path: filePath }
}

export function hasWrittenProtectedPathApproval(approvalFile = '') {
  if (!approvalFile) return false
  try {
    const text = fs.readFileSync(approvalFile, 'utf8')
    return text.includes('BOARD_FORGE_PROTECTED_PATH_APPROVAL') &&
      text.includes('I understand automated BoardForge mutation may modify this copied project')
  } catch {
    return false
  }
}

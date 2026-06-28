const DEFAULT_PROTECTED_PATTERNS = [
  /FN-ESC1/i,
  /FN-ESC/i,
  /FN-FC/i,
  /(^|[\\/])ESC([\\/]|$)/i,
  /(^|[\\/])FC([\\/]|$)/i,
  /flight[-_ ]?controller/i,
  /(^|[\\/])flight([\\/]|$)/i,
]

export function isProtectedBoardPath(filePath = '', options = {}) {
  const normalized = String(filePath).replaceAll('\\', '/')
  const patterns = options.patterns || DEFAULT_PROTECTED_PATTERNS
  return patterns.some((pattern) => pattern.test(normalized))
}

export function assertPathIsAllowed(filePath = '', options = {}) {
  if (!filePath) return { allowed: false, reason: 'missing_path' }
  if (isProtectedBoardPath(filePath, options)) {
    return {
      allowed: false,
      reason: 'protected_user_project',
      path: filePath,
    }
  }
  return { allowed: true, path: filePath }
}

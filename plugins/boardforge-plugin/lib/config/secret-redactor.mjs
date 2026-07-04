const SECRET_KEY_PATTERN = /(secret|token|password|api[_-]?key|client[_-]?secret|authorization)/i
const LONG_SECRET_PATTERN = /\b[A-Za-z0-9_\-]{24,}\b/g

export function redactSecretValue(value, label = 'secret') {
  if (!value) return value
  return `[REDACTED:${label}]`
}

export function redactSecrets(input, knownSecrets = {}) {
  if (input == null) return input
  if (typeof input === 'string') return redactString(input, knownSecrets)
  if (Array.isArray(input)) return input.map((item) => redactSecrets(item, knownSecrets))
  if (typeof input === 'object') {
    return Object.fromEntries(Object.entries(input).map(([key, value]) => {
      if (SECRET_KEY_PATTERN.test(key)) return [key, value ? `[REDACTED:${key}]` : value]
      return [key, redactSecrets(value, knownSecrets)]
    }))
  }
  return input
}

export function redactString(text = '', knownSecrets = {}) {
  let redacted = String(text)
  for (const [name, value] of Object.entries(knownSecrets)) {
    if (value) redacted = redacted.split(String(value)).join(`[REDACTED:${name}]`)
  }
  return redacted.replace(LONG_SECRET_PATTERN, (match) => {
    if (/^[0-9]+$/.test(match)) return match
    return '[REDACTED:TOKEN_LIKE_VALUE]'
  })
}

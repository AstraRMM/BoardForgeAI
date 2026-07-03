const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://boardforge.ai',
  'https://www.boardforge.ai',
]

export function normalizeOrigin(origin) {
  return String(origin || '').replace(/\/$/, '')
}

export function isOriginAllowed(origin, allowedOrigins = DEFAULT_ALLOWED_ORIGINS) {
  const normalized = normalizeOrigin(origin)
  return allowedOrigins.map(normalizeOrigin).includes(normalized)
}

export function allowedOriginsFromEnv(env = process.env) {
  const configured = env.BOARDFORGE_ALLOWED_ORIGINS
  if (!configured) return DEFAULT_ALLOWED_ORIGINS
  return configured.split(',').map((entry) => normalizeOrigin(entry.trim())).filter(Boolean)
}

export { DEFAULT_ALLOWED_ORIGINS }

const SESSION_KEY = 'boardforge.local-engine.session-token.v1'

/** The local engine token is session-only: never a cookie, URL, artifact, or log. */
export function getLocalEngineSessionToken() {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(SESSION_KEY)
}

export function storeLocalEngineSessionToken(token: string) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(SESSION_KEY, token)
}

export function clearLocalEngineSessionToken() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(SESSION_KEY)
}

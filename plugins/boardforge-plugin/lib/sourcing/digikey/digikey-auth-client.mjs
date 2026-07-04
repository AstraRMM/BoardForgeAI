import { getProviderConfig } from '../../config/provider-config.mjs'
import { redactSecrets } from '../../config/secret-redactor.mjs'
import { createDigiKeyTokenStore } from './digikey-token-store.mjs'
import { DigiKeyError, normalizeDigiKeyError } from './digikey-errors.mjs'

const AUTH_BASE = 'https://api.digikey.com/v1/oauth2/authorize'
const TOKEN_URL = 'https://api.digikey.com/v1/oauth2/token'

export function createDigiKeyAuthClient({ env = process.env, fetchImpl = globalThis.fetch, tokenStore = createDigiKeyTokenStore() } = {}) {
  const providerConfig = getProviderConfig({ env }).providers.digikey
  const clientId = env.DIGIKEY_CLIENT_ID
  const clientSecret = env.DIGIKEY_CLIENT_SECRET
  const callbackUrl = env.DIGIKEY_CALLBACK_URL || providerConfig.callbackUrl

  return {
    providerConfig,
    isConfigured() {
      return Boolean(clientId && clientSecret)
    },
    getAuthorizationUrl({ state = 'boardforge-local-engine' } = {}) {
      if (!clientId) throw new DigiKeyError('DigiKey client id is missing.', { status: 'DIGIKEY_NOT_CONFIGURED' })
      const url = new URL(AUTH_BASE)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('client_id', clientId)
      url.searchParams.set('redirect_uri', callbackUrl)
      url.searchParams.set('state', state)
      return url.toString()
    },
    async exchangeCodeForToken({ code }) {
      if (!this.isConfigured()) throw new DigiKeyError('DigiKey credentials are missing.', { status: 'DIGIKEY_NOT_CONFIGURED' })
      if (!code) throw new DigiKeyError('DigiKey OAuth code is required.', { status: 'DIGIKEY_OAUTH_CODE_REQUIRED' })
      const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: callbackUrl })
      const response = await fetchImpl(TOKEN_URL, {
        method: 'POST',
        headers: { authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded' },
        body,
      })
      if (!response.ok) throw new DigiKeyError('DigiKey token exchange failed.', { status: 'DIGIKEY_TOKEN_EXCHANGE_FAILED', details: { status: response.status, body: await safeText(response) } })
      const payload = await response.json()
      const token = {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        tokenType: payload.token_type || 'Bearer',
        expiresAt: new Date(Date.now() + Number(payload.expires_in || 1800) * 1000).toISOString(),
      }
      tokenStore.write(token)
      return { authenticated: true, expiresAt: token.expiresAt }
    },
    getCachedToken() {
      return tokenStore.read()
    },
    async healthCheck() {
      try {
        const token = tokenStore.read()
        return {
          configured: this.isConfigured(),
          authenticated: Boolean(token?.accessToken),
          enabledApis: providerConfig.enabledApis,
          callbackUrl,
          lastCheckTime: new Date().toISOString(),
          error: null,
        }
      } catch (error) {
        return { configured: this.isConfigured(), authenticated: false, enabledApis: providerConfig.enabledApis, lastCheckTime: new Date().toISOString(), error: redactSecrets(normalizeDigiKeyError(error)) }
      }
    },
  }
}

async function safeText(response) {
  try { return redactSecrets(await response.text()) } catch { return '' }
}

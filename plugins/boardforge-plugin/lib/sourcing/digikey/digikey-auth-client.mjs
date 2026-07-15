import { getProviderConfig } from '../../config/provider-config.mjs'
import { loadBoardForgeEnv } from '../../config/env-loader.mjs'
import { redactSecrets } from '../../config/secret-redactor.mjs'
import { createDigiKeyTokenStore } from './digikey-token-store.mjs'
import { DigiKeyError, normalizeDigiKeyError } from './digikey-errors.mjs'

const AUTH_BASE = 'https://api.digikey.com/v1/oauth2/authorize'
const TOKEN_URL = 'https://api.digikey.com/v1/oauth2/token'

export function createDigiKeyAuthClient({ env = loadBoardForgeEnv().env, fetchImpl = globalThis.fetch, tokenStore = createDigiKeyTokenStore() } = {}) {
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
    async exchangeClientCredentialsForToken() {
      if (!this.isConfigured()) throw new DigiKeyError('DigiKey credentials are missing.', { status: 'DIGIKEY_NOT_CONFIGURED' })
      const body = new URLSearchParams({ grant_type: 'client_credentials' })
      const response = await fetchImpl(TOKEN_URL, {
        method: 'POST',
        headers: { authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded' },
        body,
      })
      if (!response.ok) throw new DigiKeyError('DigiKey client-credentials token request failed.', { status: 'DIGIKEY_CLIENT_CREDENTIALS_FAILED', details: { status: response.status, body: await safeText(response) } })
      const payload = await response.json()
      const token = {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        tokenType: payload.token_type || 'Bearer',
        expiresAt: new Date(Date.now() + Number(payload.expires_in || 1800) * 1000).toISOString(),
      }
      tokenStore.write(token)
      return { authenticated: true, method: 'client_credentials', expiresAt: token.expiresAt }
    },
    getCachedToken() {
      return tokenStore.read()
    },
    async getValidAccessToken() {
      const cached = tokenStore.read()
      if (cached?.accessToken) return cached
      const expired = tokenStore.readRaw?.()
      if (!expired?.refreshToken) return null
      return this.refreshAccessToken({ refreshToken: expired.refreshToken })
    },
    async refreshAccessToken({ refreshToken } = {}) {
      if (!this.isConfigured()) throw new DigiKeyError('DigiKey credentials are missing.', { status: 'DIGIKEY_NOT_CONFIGURED' })
      if (!refreshToken) throw new DigiKeyError('DigiKey refresh token is missing.', { status: 'DIGIKEY_REFRESH_TOKEN_REQUIRED' })
      const response = await fetchImpl(TOKEN_URL, {
        method: 'POST',
        headers: { authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
      })
      if (!response.ok) throw new DigiKeyError('DigiKey token refresh failed.', { status: 'DIGIKEY_TOKEN_REFRESH_FAILED', details: { status: response.status, body: await safeText(response) } })
      const payload = await response.json()
      const token = {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token || refreshToken,
        tokenType: payload.token_type || 'Bearer',
        expiresAt: new Date(Date.now() + Number(payload.expires_in || 1800) * 1000).toISOString(),
      }
      tokenStore.write(token)
      return token
    },
    async healthCheck() {
      try {
        const token = tokenStore.read()
        const rawToken = tokenStore.readRaw?.() ?? token
        const tokenExpired = Boolean(rawToken?.expiresAt && Date.parse(rawToken.expiresAt) <= Date.now())
        return {
          configured: this.isConfigured(),
          authenticated: Boolean(token?.accessToken),
          tokenPresent: Boolean(rawToken?.accessToken),
          refreshAvailable: Boolean(rawToken?.refreshToken),
          tokenExpired,
          enabledApis: providerConfig.enabledApis,
          callbackUrlConfigured: Boolean(callbackUrl),
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

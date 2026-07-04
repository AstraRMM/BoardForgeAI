import { redactSecrets } from '../../config/secret-redactor.mjs'
import { DigiKeyError } from './digikey-errors.mjs'

export function createDigiKeyApiClient({ env = process.env, fetchImpl = globalThis.fetch, authClient, baseUrl = 'https://api.digikey.com' } = {}) {
  return {
    async request(pathname, { method = 'GET', body, timeoutMs = 15000 } = {}) {
      const token = authClient?.getCachedToken?.()
      if (!env.DIGIKEY_CLIENT_ID || !env.DIGIKEY_CLIENT_SECRET) throw new DigiKeyError('DigiKey credentials are not configured.', { status: 'DIGIKEY_NOT_CONFIGURED' })
      if (!token?.accessToken) throw new DigiKeyError('DigiKey OAuth token is not available. Complete local authorization before live lookup.', { status: 'DIGIKEY_AUTH_REQUIRED' })
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const response = await fetchImpl(`${baseUrl}${pathname}`, {
          method,
          signal: controller.signal,
          headers: {
            authorization: `Bearer ${token.accessToken}`,
            'X-DIGIKEY-Client-Id': env.DIGIKEY_CLIENT_ID,
            'content-type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        })
        if (!response.ok) throw new DigiKeyError('DigiKey API request failed.', { status: 'DIGIKEY_REQUEST_FAILED', details: { status: response.status, body: await response.text() } })
        return await response.json()
      } catch (error) {
        if (error instanceof DigiKeyError) throw error
        throw new DigiKeyError('DigiKey API request failed.', { status: 'DIGIKEY_REQUEST_FAILED', details: redactSecrets({ message: error.message }) })
      } finally {
        clearTimeout(timeout)
      }
    },
  }
}

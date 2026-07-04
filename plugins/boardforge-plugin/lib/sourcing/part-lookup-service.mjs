import { getProviderConfig } from '../config/provider-config.mjs'
import { loadBoardForgeEnv } from '../config/env-loader.mjs'
import { createDigiKeyAuthClient } from './digikey/digikey-auth-client.mjs'
import { createDigiKeyApiClient } from './digikey/digikey-api-client.mjs'
import { lookupDigiKeyProductInfoV4 } from './digikey/digikey-product-info-v4.mjs'
import { PART_LOOKUP_STATUSES } from './normalized-part-result.mjs'
import { normalizeDigiKeyError } from './digikey/digikey-errors.mjs'

export function createPartLookupService({ env = loadBoardForgeEnv().env, fetchImpl = globalThis.fetch, mockResponses = {} } = {}) {
  const config = getProviderConfig({ env })
  const authClient = createDigiKeyAuthClient({ env, fetchImpl })
  const apiClient = createDigiKeyApiClient({ env, fetchImpl, authClient })
  return {
    config,
    async status() {
      return { digikey: await authClient.healthCheck(), mouser: config.providers.mouser, lcsc: config.providers.lcsc, jlcpcb: config.providers.jlcpcb }
    },
    async lookup(query = {}) {
      if (!config.providers.digikey.configured) return { status: PART_LOOKUP_STATUSES.NOT_CONFIGURED, provider: 'digikey', query, error: 'missing_digikey_client_id_or_secret' }
      try {
        return await lookupDigiKeyProductInfoV4({ query, apiClient, mockResponse: mockResponses.digikey })
      } catch (error) {
        return { status: PART_LOOKUP_STATUSES.VERIFY_FAILED, provider: 'digikey', query, error: normalizeDigiKeyError(error), lastChecked: new Date().toISOString() }
      }
    },
  }
}

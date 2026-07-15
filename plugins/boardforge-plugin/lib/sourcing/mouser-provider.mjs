import { createUnavailableProvider, detectProviderCredentials, normalizePartVerification, providerReportMarkdown, SOURCING_STATUSES } from './part-source-provider.mjs'
import { randomUUID } from 'node:crypto'

const MOUSER_SEARCH_ENDPOINT = 'https://api.mouser.com/api/v1/search/partnumber'

export function createMouserProvider({ env = process.env, fetchImpl = globalThis.fetch, liveLookup = false, timeoutMs = 15000 } = {}) {
  const requiredEnv = ['MOUSER_API_KEY']
  if (!getMouserApiKey(env)) {
    return createUnavailableProvider({
      id: 'mouser',
      name: 'Mouser',
      requiredEnv,
      supportedCapabilities: ['stock', 'pricing', 'lifecycle'],
    })
  }
  return {
    id: 'mouser',
    name: 'Mouser',
    requiredEnv,
    supportedCapabilities: ['stock', 'pricing', 'lifecycle'],
    available: true,
    detectCredentials(checkEnv = env) {
      return detectMouserCredentials(checkEnv)
    },
    canVerify(checkEnv = env) {
      return this.detectCredentials(checkEnv).configured
    },
    normalizeResult(part = {}, result = {}) {
      return normalizeMouserResult(part, result)
    },
    writeProviderReport(rows = []) {
      return providerReportMarkdown({ id: this.id, name: this.name, requiredEnv, available: true, rows })
    },
    async verifyPart(part = {}) {
      if (!liveLookup) {
        return normalizePartVerification(part, {
          provider: 'mouser',
          providerName: 'Mouser',
          sourcingStatus: SOURCING_STATUSES.NOT_CHECKED,
          stockStatus: 'UNKNOWN',
          assemblyAvailability: 'UNKNOWN',
          risk: 'mouser_api_configured_but_live_query_not_run',
          evidence: { apiConfigured: true, liveLookupEnabled: false },
        })
      }
      const query = getMouserPartQuery(part)
      if (!query) {
        return normalizePartVerification(part, {
          provider: 'mouser',
          providerName: 'Mouser',
          sourcingStatus: SOURCING_STATUSES.NOT_CHECKED,
          stockStatus: 'UNKNOWN',
          assemblyAvailability: 'UNKNOWN',
          risk: 'mouser_live_lookup_missing_part_number',
          evidence: { apiConfigured: true, liveLookupEnabled: true },
        })
      }
      try {
        const result = await searchMouserPartNumber({
          apiKey: getMouserApiKey(env),
          partNumber: query,
          fetchImpl,
          timeoutMs,
        })
        if (!result.parts.length) {
          return normalizePartVerification(part, {
            provider: 'mouser',
            providerName: 'Mouser',
            sourcingStatus: SOURCING_STATUSES.NOT_CHECKED,
            stockStatus: 'UNKNOWN',
            assemblyAvailability: 'UNKNOWN',
            risk: 'mouser_live_lookup_no_matching_parts',
            evidence: { apiConfigured: true, liveLookupEnabled: true, searchedPartNumber: query, totalResults: result.totalResults },
          })
        }
        const selected = selectBestMouserPart(part, query, result.parts)
        return normalizeMouserResult(part, {
          ...selected,
          liveApiEvidence: true,
          searchedPartNumber: query,
          totalResults: result.totalResults,
          requestId: result.requestId,
          queriedAt: result.queriedAt,
          httpStatus: result.httpStatus,
        })
      } catch (error) {
        return normalizePartVerification(part, {
          provider: 'mouser',
          providerName: 'Mouser',
          sourcingStatus: SOURCING_STATUSES.ERROR,
          stockStatus: 'UNKNOWN',
          assemblyAvailability: 'UNKNOWN',
          risk: 'mouser_live_lookup_failed',
          evidence: {
            apiConfigured: true,
            liveLookupEnabled: true,
            error: sanitizeMouserError(error),
          },
        })
      }
    },
  }
}

export async function searchMouserPartNumber({ apiKey, partNumber, fetchImpl = globalThis.fetch, timeoutMs = 15000 } = {}) {
  if (!apiKey) throw new Error('Mouser API key is missing.')
  if (!partNumber) throw new Error('Mouser part number query is missing.')
  if (typeof fetchImpl !== 'function') throw new Error('Fetch implementation is unavailable.')

  const controller = new AbortController()
  const requestId = randomUUID()
  const queriedAt = new Date().toISOString()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(`${MOUSER_SEARCH_ENDPOINT}?apiKey=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        SearchByPartRequest: {
          mouserPartNumber: partNumber,
          partSearchOptions: 'None',
        },
      }),
      signal: controller.signal,
    })
    const text = await response.text()
    let payload = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = { rawText: text }
    }
    if (!response.ok) {
      const error = new Error(`Mouser API request failed with HTTP ${response.status}.`)
      error.status = response.status
      error.payload = payload
      throw error
    }
    return { ...normalizeMouserSearchResponse(payload), requestId, queriedAt, httpStatus: response.status }
  } finally {
    clearTimeout(timer)
  }
}

export function normalizeMouserSearchResponse(payload = {}) {
  const searchResults = payload.SearchResults || payload.searchResults || {}
  const parts = Array.isArray(searchResults.Parts) ? searchResults.Parts : Array.isArray(searchResults.parts) ? searchResults.parts : []
  const totalResults = Number(searchResults.NumberOfResult ?? searchResults.NumberOfResults ?? searchResults.TotalResults ?? parts.length) || parts.length
  return { totalResults, parts }
}

export function getMouserApiKey(env = process.env) {
  return env.MOUSER_API_KEY || env.MOUSER_SEARCH_API_KEY || env.MOUSER_PRODUCT_API_KEY || ''
}

export function detectMouserCredentials(env = process.env) {
  const aliases = ['MOUSER_API_KEY', 'MOUSER_SEARCH_API_KEY', 'MOUSER_PRODUCT_API_KEY']
  const presentEnv = aliases.filter((name) => Boolean(env[name]))
  return {
    provider: 'mouser',
    name: 'Mouser',
    requiredEnv: ['MOUSER_API_KEY'],
    acceptedEnvAliases: aliases,
    presentEnv,
    missingEnv: presentEnv.length ? [] : ['MOUSER_API_KEY'],
    configured: presentEnv.length > 0,
  }
}

function getMouserPartQuery(part = {}) {
  return String(part.mpn || part.MPN || part.manufacturerPartNumber || part.mouserPartNumber || part.supplierSku || part.value || part.keyword || '').trim()
}

function selectBestMouserPart(part = {}, query = '', parts = []) {
  const expectedMpn = String(part.mpn || part.MPN || part.manufacturerPartNumber || query).toLowerCase()
  const expectedSku = String(part.mouserPartNumber || part.supplierSku || '').toLowerCase()
  return parts.find((candidate) => String(candidate.ManufacturerPartNumber || '').toLowerCase() === expectedMpn)
    || parts.find((candidate) => expectedSku && String(candidate.MouserPartNumber || '').toLowerCase() === expectedSku)
    || parts[0]
}

function parseMouserStock(value) {
  if (typeof value === 'number') return value
  const match = String(value || '').replace(/,/g, '').match(/\d+/)
  return match ? Number(match[0]) : 0
}

function sanitizeMouserError(error) {
  return {
    name: error?.name || 'Error',
    message: String(error?.message || 'Mouser lookup failed.').replace(/apiKey=[^&\s]+/gi, 'apiKey=<redacted>'),
    status: error?.status || null,
    providerMessage: error?.payload?.Errors || error?.payload?.Message || error?.payload?.message || null,
  }
}

export function normalizeMouserResult(part = {}, result = {}) {
  const stockQty = parseMouserStock(result.stockQty ?? result.AvailabilityInStock ?? result.Availability ?? 0)
  const obsolete = /obsolete|nrnd|not recommended/i.test(String(result.lifecycleStatus || result.LifecycleStatus || ''))
  const supplierSku = result.supplierSku || result.MouserPartNumber || null
  const manufacturer = part.manufacturer || result.Manufacturer || ''
  const mpn = result.ManufacturerPartNumber || part.mpn || part.MPN || part.manufacturerPartNumber || ''
  return normalizePartVerification({ ...part, manufacturer, mpn }, {
    provider: 'mouser',
    providerName: 'Mouser',
    sourcingStatus: obsolete ? SOURCING_STATUSES.OBSOLETE : stockQty > 0 ? SOURCING_STATUSES.API_VERIFIED : SOURCING_STATUSES.OUT_OF_STOCK,
    stockStatus: stockQty > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
    assemblyAvailability: 'UNKNOWN',
    stockQty,
    supplierSku,
    priceBreaks: result.priceBreaks || result.PriceBreaks || [],
    minimumOrderQuantity: result.minimumOrderQuantity ?? result.Min ?? null,
    packageMatch: result.packageMatch || 'UNKNOWN',
    lifecycleStatus: obsolete ? 'OBSOLETE' : result.lifecycleStatus || result.LifecycleStatus || 'ACTIVE_OR_UNKNOWN',
    risk: obsolete ? 'obsolete' : stockQty > 0 ? 'api_verified_stock_available' : 'api_verified_out_of_stock',
    evidence: {
      providerPayloadNormalized: true,
      liveApiEvidence: Boolean(result.liveApiEvidence),
      productDetailUrl: result.ProductDetailUrl || null,
      datasheetUrl: result.DataSheetUrl || null,
      searchedPartNumber: result.searchedPartNumber || null,
      totalResults: result.totalResults ?? null,
      requestId: result.requestId || null,
      queriedAt: result.queriedAt || null,
      httpStatus: result.httpStatus ?? null,
    },
  })
}

import { normalizePartResult, PART_LOOKUP_STATUSES } from '../normalized-part-result.mjs'
import { DigiKeyError } from './digikey-errors.mjs'

export async function lookupDigiKeyProductInfoV4({ query = {}, apiClient, mockResponse } = {}) {
  if (mockResponse) return normalizeDigiKeySearchResponse(mockResponse, query)
  if (!apiClient) throw new DigiKeyError('DigiKey API client is required.', { status: 'DIGIKEY_CLIENT_REQUIRED' })
  const keyword = query.digiKeyPartNumber || query.mpn || query.keyword
  if (!keyword) throw new DigiKeyError('DigiKey lookup requires an MPN, DigiKey part number, or keyword.', { status: 'DIGIKEY_QUERY_REQUIRED' })
  const response = await apiClient.request('/products/v4/search/keyword', {
    method: 'POST',
    body: { Keywords: keyword, Limit: query.limit || 5, Offset: 0 },
  })
  return normalizeDigiKeySearchResponse(response, query)
}

export function normalizeDigiKeySearchResponse(response = {}, query = {}) {
  const products = response.Products || response.products || response.Product || response.product ? (response.Products || response.products || [response.Product || response.product]) : []
  if (!products.length) return { status: PART_LOOKUP_STATUSES.VERIFY_FAILED, query, matches: [], error: 'no_products_returned', lastChecked: new Date().toISOString(), provider: 'digikey' }
  const exact = products.find((product) => same(product.ManufacturerProductNumber || product.manufacturerPartNumber, query.mpn) || same(product.DigiKeyProductNumber || product.digiKeyPartNumber, query.digiKeyPartNumber))
  const selected = exact || products[0]
  const ambiguous = !exact && products.length > 1
  return {
    status: ambiguous ? PART_LOOKUP_STATUSES.AMBIGUOUS_MATCH : undefined,
    query,
    selected: normalizePartResult({ ...selected, ambiguous }, { provider: 'digikey', query, matchType: exact ? 'exact' : 'fuzzy' }),
    matches: products.map((product) => normalizePartResult(product, { provider: 'digikey', query, matchType: exact ? 'exact' : 'fuzzy' })),
    provider: 'digikey',
    lastChecked: new Date().toISOString(),
  }
}

function same(a, b) {
  return a && b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase()
}

export const PART_LOOKUP_STATUSES = Object.freeze({
  VERIFIED_IN_STOCK: 'VERIFIED_IN_STOCK',
  VERIFIED_OUT_OF_STOCK: 'VERIFIED_OUT_OF_STOCK',
  VERIFIED_LIMITED_STOCK: 'VERIFIED_LIMITED_STOCK',
  VERIFY_FAILED: 'VERIFY_FAILED',
  NOT_CHECKED: 'NOT_CHECKED',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  AMBIGUOUS_MATCH: 'AMBIGUOUS_MATCH',
})

export function normalizePartResult(raw = {}, { provider = 'digikey', query = {}, matchType = 'exact' } = {}) {
  const quantityAvailable = Number(raw.QuantityAvailable ?? raw.quantityAvailable ?? raw.quantity ?? 0)
  const status = raw.status || statusFor(quantityAvailable, raw.ambiguous)
  return {
    manufacturerPartNumber: raw.ManufacturerProductNumber || raw.manufacturerPartNumber || raw.mpn || query.mpn || '',
    digiKeyPartNumber: raw.DigiKeyProductNumber || raw.digiKeyPartNumber || raw.sku || '',
    manufacturer: raw.Manufacturer?.Name || raw.manufacturer || query.manufacturer || '',
    description: raw.Description?.ProductDescription || raw.description || '',
    category: raw.Category?.Name || raw.category || '',
    productUrl: raw.ProductUrl || raw.productUrl || '',
    datasheetUrl: raw.DatasheetUrl || raw.datasheetUrl || '',
    imageUrl: raw.PhotoUrl || raw.imageUrl || '',
    unitPrice: Number(raw.UnitPrice ?? raw.unitPrice ?? raw.StandardPricing?.[0]?.UnitPrice ?? 0),
    priceBreaks: raw.StandardPricing || raw.priceBreaks || [],
    quantityAvailable,
    stockStatus: stockFor(quantityAvailable, status),
    minimumOrderQuantity: Number(raw.MinimumOrderQuantity ?? raw.minimumOrderQuantity ?? 1),
    standardPackage: raw.StandardPackage || raw.standardPackage || '',
    leadTime: raw.ManufacturerLeadWeeks || raw.leadTime || '',
    lifecycleStatus: raw.ProductStatus?.Status || raw.lifecycleStatus || 'UNKNOWN',
    rohsStatus: raw.RohsStatus || raw.rohsStatus || 'UNKNOWN',
    marketplace: Boolean(raw.Marketplace || raw.marketplace),
    lastChecked: new Date().toISOString(),
    provider,
    status,
    matchType,
  }
}

function statusFor(quantityAvailable, ambiguous) {
  if (ambiguous) return PART_LOOKUP_STATUSES.AMBIGUOUS_MATCH
  if (quantityAvailable > 100) return PART_LOOKUP_STATUSES.VERIFIED_IN_STOCK
  if (quantityAvailable > 0) return PART_LOOKUP_STATUSES.VERIFIED_LIMITED_STOCK
  return PART_LOOKUP_STATUSES.VERIFIED_OUT_OF_STOCK
}

function stockFor(quantityAvailable, status) {
  if (status === PART_LOOKUP_STATUSES.AMBIGUOUS_MATCH) return 'UNKNOWN'
  if (quantityAvailable > 100) return 'IN_STOCK'
  if (quantityAvailable > 0) return 'LIMITED_STOCK'
  return 'OUT_OF_STOCK'
}

export function scoreQuoteReadiness(rows = [], { buildQuantity = 10, providerConfigured = false } = {}) {
  if (!providerConfigured) return { status: 'BLOCKED_SUPPLIER_API', score: 0, buildQuantity, blockers: ['DigiKey API is not configured/authenticated.'] }
  const blockers = []
  for (const row of rows) {
    if (!row.MPN && !row.manufacturerPartNumber) blockers.push(`missing_mpn:${row.Ref || row.reference || 'row'}`)
    if (row.sourcingStatus === 'AMBIGUOUS_MATCH') blockers.push(`ambiguous_match:${row.MPN}`)
    if (!String(row.sourcingStatus || '').startsWith('VERIFIED')) blockers.push(`unverified:${row.MPN}`)
    if (Number(row.quantityAvailable || 0) < buildQuantity) blockers.push(`stock_short:${row.MPN}`)
  }
  const status = blockers.some((item) => item.startsWith('missing_mpn')) ? 'BLOCKED_MISSING_PARTS'
    : blockers.some((item) => item.startsWith('ambiguous_match')) ? 'BLOCKED_AMBIGUOUS_MATCHES'
      : blockers.length ? 'QUOTE_READY_WITH_WARNINGS' : 'QUOTE_READY'
  return { status, score: Math.max(0, 100 - blockers.length * 12), buildQuantity, blockers }
}

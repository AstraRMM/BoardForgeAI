export function scoreSourcingReadiness(rows = []) {
  if (!rows.length) return { status: 'BLOCKED_UNVERIFIED_BOM', score: 0, verifiedCount: 0, riskyCount: 0 }
  const verifiedCount = rows.filter((row) => ['VERIFIED_IN_STOCK', 'VERIFIED_LIMITED_STOCK'].includes(row.sourcingStatus)).length
  const riskyCount = rows.filter((row) => row.risk && row.risk !== 'verified_or_low_risk').length
  const score = Math.max(0, Math.round((verifiedCount / rows.length) * 100 - riskyCount * 7))
  return { status: score >= 90 ? 'SOURCING_READY' : score >= 60 ? 'SOURCING_READY_WITH_WARNINGS' : 'BLOCKED_UNVERIFIED_BOM', score, verifiedCount, riskyCount, total: rows.length }
}

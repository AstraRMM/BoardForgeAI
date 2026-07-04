export function classifyDropInRisk(part = {}, candidate = {}) {
  if (part.MPN && candidate.manufacturerPartNumber && part.MPN === candidate.manufacturerPartNumber) return 'LOW_RISK_SAME_MPN'
  const footprintMatch = sameToken(part.Footprint || part.footprint, candidate.standardPackage || candidate.description)
  if (footprintMatch) return 'MEDIUM_RISK_SAME_FOOTPRINT_VERIFY_SPECS'
  if (candidate.status && String(candidate.status).startsWith('VERIFIED')) return 'HIGH_RISK_REQUIRES_ENGINEERING_REVIEW'
  return 'NOT_RECOMMENDED'
}

function sameToken(a = '', b = '') {
  const left = String(a).toLowerCase().replace(/[^a-z0-9]/g, '')
  const right = String(b).toLowerCase().replace(/[^a-z0-9]/g, '')
  return left.length > 2 && right.includes(left)
}

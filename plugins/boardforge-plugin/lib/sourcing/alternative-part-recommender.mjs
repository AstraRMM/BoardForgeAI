import { classifyDropInRisk } from './drop-in-risk-classifier.mjs'

export async function recommendAlternativeParts({ rows = [], lookupService }) {
  const alternatives = []
  for (const row of rows.filter((entry) => entry.risk && entry.risk !== 'verified_or_low_risk')) {
    const keyword = row.category || row.Description || row.description || row.MPN || row.manufacturerPartNumber
    const lookup = lookupService ? await lookupService.lookup({ keyword, manufacturer: row.Manufacturer }) : { matches: [] }
    alternatives.push({
      mpn: row.MPN || row.manufacturerPartNumber,
      reason: row.risk,
      candidates: (lookup.matches || []).slice(0, 3).map((candidate) => ({
        ...candidate,
        riskLabel: classifyDropInRisk(row, candidate),
        note: 'Candidate alternative only; engineering review is required before substitution.',
      })),
    })
  }
  return alternatives
}

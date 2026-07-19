type AlternativePart = { mpn?: string; reason?: string }

export function AlternativePartsPanel({ alternatives = [] }: { alternatives?: AlternativePart[] }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-sm font-semibold text-slate-100">Candidate Alternatives</h3>
      <p className="mt-2 text-xs text-slate-400">Alternatives are candidates only and require engineering review before substitution.</p>
      <ul className="mt-3 space-y-2 text-xs text-slate-300">
        {(alternatives.length ? alternatives : [{ mpn: 'No alternatives generated yet', reason: 'Run Make Sourcable' }]).map((item, index) => (
          <li key={index} className="rounded border border-slate-800 bg-slate-950 p-2">{item.mpn}: {item.reason}</li>
        ))}
      </ul>
    </section>
  )
}

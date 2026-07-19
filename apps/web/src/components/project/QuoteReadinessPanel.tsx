type QuoteReadinessReport = { status?: string }

export function QuoteReadinessPanel({ report }: { report?: QuoteReadinessReport }) {
  const status = humanize(report?.status || 'Not verified yet')
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-sm font-semibold text-slate-100">Quote Readiness</h3>
      <p className="mt-2 text-sm font-semibold text-emerald-200">{status}</p>
      <p className="mt-2 text-xs text-slate-400">Quote readiness checks stock and MOQ only. BoardForge does not place orders automatically.</p>
    </section>
  )
}

function humanize(value: unknown) {
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

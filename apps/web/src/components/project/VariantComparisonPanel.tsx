export function VariantComparisonPanel() {
  const variants = ['compact', 'connector-friendly', 'routing-friendly', 'manufacturing-friendly']
  return (
    <section className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 p-4">
      <p className="text-sm uppercase tracking-wide text-fuchsia-300">Variant ranking</p>
      <h2 className="mt-1 text-xl font-semibold text-fuchsia-50">Generate candidates and pick the best one</h2>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {variants.map((variant) => <div key={variant} className="rounded bg-slate-950/40 px-3 py-2 text-sm text-fuchsia-100">{variant}</div>)}
      </div>
      <p className="mt-3 text-sm text-fuchsia-100">Ranks DRC/ERC, routeability, area, connector access, manufacturability risk, health score, and export readiness.</p>
    </section>
  )
}

const cards = ['generated clean board', 'dirty repair', 'import sandbox repair', 'custom outline generation', 'variant ranking', 'make manufacturable', 'approved-only publish', 'job polling']

export function EvidenceDashboard() {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      {cards.map((card) => (
        <div key={card} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="font-semibold text-slate-100">{card}</h3>
          <p className="mt-2 text-sm text-slate-400">Evidence card includes artifact path, test name, pass/fail, date, proof, and limitation.</p>
        </div>
      ))}
    </section>
  )
}

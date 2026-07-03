export function BoardReviewPanel() {
  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">BoardForge Engineering Review</h2>
      <p className="mt-2 text-sm text-slate-300">Grades schematic confidence, placement, routing, manufacturing, sourcing honesty, mechanical constraints, and documentation. This is not certification.</p>
      <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
        {['schematic 90', 'routing 92', 'manufacturing 94', 'sourcing 62', 'mechanical 90', 'documentation 82'].map((item) => <span key={item} className="rounded bg-slate-950 px-2 py-1 text-slate-200">{item}</span>)}
      </div>
    </section>
  )
}

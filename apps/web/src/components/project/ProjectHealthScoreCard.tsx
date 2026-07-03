export function ProjectHealthScoreCard({ score = 92, label = 'PCB Fab Ready' }: { score?: number; label?: string }) {
  return (
    <section className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
      <h2 className="text-lg font-semibold text-emerald-100">Project Health Score</h2>
      <div className="mt-3 text-4xl font-bold text-emerald-200">{score}</div>
      <p className="mt-1 text-sm text-emerald-100/80">{label}: combines DRC/ERC, shorts, unconnected, manufacturing package, sourcing status, routeability, and review risk.</p>
    </section>
  )
}

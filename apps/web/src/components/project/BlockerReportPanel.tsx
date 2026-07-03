export function BlockerReportPanel() {
  return (
    <section className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
      <h2 className="text-lg font-semibold text-red-100">Smart Blocker Report</h2>
      <p className="mt-2 text-sm text-red-100/80">Failed jobs write exact blocker reports with what failed, what BoardForge tried, and the next safe action. No vague failed states.</p>
      <p className="mt-3 rounded bg-slate-950/40 px-2 py-1 text-xs text-red-100">Not generated yet. Run Generate Blocker Report.</p>
    </section>
  )
}

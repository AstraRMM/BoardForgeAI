export function MakeSourcableReportPanel({ report }: { report?: any }) {
  return (
    <section className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4">
      <h3 className="text-sm font-semibold text-emerald-100">Make Sourcable Report</h3>
      <p className="mt-2 font-mono text-sm">{report?.status || 'Not generated yet'}</p>
      <p className="mt-2 text-xs text-emerald-100/80">BoardForge proposes substitutions, but does not auto-change schematic or PCB without approval.</p>
    </section>
  )
}

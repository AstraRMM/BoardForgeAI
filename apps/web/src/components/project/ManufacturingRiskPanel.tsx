export function ManufacturingRiskPanel() {
  return (
    <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
      <h2 className="text-lg font-semibold text-amber-100">Manufacturability Risk</h2>
      <p className="mt-2 text-sm text-amber-100/80">DRC can be clean while assembly or compliance risk remains. BoardForge separates PCB fab readiness from supplier/API and compliance review.</p>
      <p className="mt-3 rounded bg-slate-950/40 px-2 py-1 text-xs text-amber-100">Assembly: NOT_CHECKED until supplier API keys exist.</p>
    </section>
  )
}

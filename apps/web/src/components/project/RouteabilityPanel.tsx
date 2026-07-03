export function RouteabilityPanel() {
  return (
    <section className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
      <h2 className="text-lg font-semibold text-cyan-100">Routeability Explanation</h2>
      <ul className="mt-2 space-y-1 text-sm text-cyan-100/80">
        <li>Connector congestion: low risk</li>
        <li>Ratsnest crossing density: clean route artifact</li>
        <li>Corridor bottlenecks: no DRC violations in candidate</li>
        <li>Power/ground quality: no shorts detected</li>
      </ul>
    </section>
  )
}

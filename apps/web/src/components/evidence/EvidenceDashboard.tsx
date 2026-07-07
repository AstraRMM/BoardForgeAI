const cards = [
  ['browser E2E passed', 'Setup, pairing, guided workflow, sourcing UI, manufacturable/sourcable actions, import protection, and publish gate.'],
  ['Mouser live sourcing passed', 'Live Mouser lookup is available where configured and never silently becomes fake stock.'],
  ['DigiKey configured', 'OAuth/local token is required for live lookup. ProductInformation proof is tracked separately from quote depth.'],
  ['custom outline generation', 'Outline presets, point/draw flows, routeability warnings, and Edge.Cuts generation remain first-class.'],
  ['import sandbox repair', 'Existing KiCad projects are copied into a sandbox before repair actions. Source projects stay protected.'],
  ['make manufacturable', 'DRC/ERC, placement, routing, package, and blocker evidence are surfaced before export claims.'],
  ['make sourcable', 'BOM verification, supplier matrix, alternatives, and quote readiness show known data and blockers.'],
  ['approved-only publish', 'Public publication requires approval state, evidence, and redacted reports.'],
]

export function EvidenceDashboard() {
  return (
    <section className="bf-proof-grid">
      {cards.map(([card, body]) => (
        <div key={card} className="bf-proof-card">
          <span>proof card</span>
          <h3>{card}</h3>
          <p>{body}</p>
          <small>Includes artifact path, test name, pass/fail, date, proof, and limitation.</small>
        </div>
      ))}
    </section>
  )
}

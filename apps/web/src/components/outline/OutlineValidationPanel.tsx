import { ShieldCheck, TriangleAlert } from 'lucide-react'

export function OutlineValidationPanel() {
  const checks = [
    ['Edge.Cuts closed', 'Closed polygon, valid segment count, no zero-length edges.'],
    ['Self-intersection', 'Blocked before KiCad if any outline segment crosses another.'],
    ['Hole clearance', 'Mounting holes must stay inside outline and away from routed edges.'],
    ['Connector access', 'Edge intent is preserved so USB, RJ45, CAN, and headers remain reachable.'],
    ['Component fit', 'Placement regions must fit inside the mechanical boundary.'],
    ['Routeability', 'Narrow necks, notches, and area are scored before board generation.'],
    ['Manufacturing risk', 'Blocked shapes do not get fake Gerbers or fake DRC success.'],
  ]
  return (
    <section className="bf-premium-panel bf-outline-validation-panel">
      <p className="bf-kicker">Validation gates</p>
      <h2>Blocked means blocked</h2>
      <p>BoardForge should create a real outline-only KiCad project only after geometry passes. Bad sketches get reports, not fake boards.</p>
      <div className="bf-outline-checks">
        {checks.map(([title, body], index) => (
          <div key={title}>
            {index < 4 ? <ShieldCheck size={17} /> : <TriangleAlert size={17} />}
            <strong>{title}</strong>
            <span>{body}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

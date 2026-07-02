export function OutlineValidationPanel() {
  const checks = ['Edge.Cuts closed', 'no self intersections', 'mounting holes valid', 'connector edge access', 'component fit', 'routeability score']
  return (
    <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
      <p className="text-xs uppercase tracking-wide text-amber-300">Validation gates</p>
      <ul className="mt-3 grid gap-1 text-sm text-amber-100">
        {checks.map((check) => <li key={check}>- {check}</li>)}
      </ul>
    </section>
  )
}

export function ProjectTimelinePanel() {
  const events = ['intake started', 'brief approved', 'project created', 'job completed', 'export created', 'publish confirmed']
  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <p className="text-sm uppercase tracking-wide text-slate-400">Engineering audit trail</p>
      <h2 className="mt-1 text-xl font-semibold text-slate-100">Project Timeline</h2>
      <ol className="mt-3 space-y-2 text-sm text-slate-300">
        {events.map((event) => <li key={event}>- {event}</li>)}
      </ol>
    </section>
  )
}

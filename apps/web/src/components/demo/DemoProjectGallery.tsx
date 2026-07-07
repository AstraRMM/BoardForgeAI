const projects = ['Compact robotics controller', 'USB-C MCU sensor board', 'CAN sensor node', 'Tiny wearable puck', 'Industrial IO board']

export function DemoProjectGallery() {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      {projects.map((project) => (
        <div key={project} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="font-semibold text-slate-100">{project}</h3>
          <p className="mt-2 text-sm text-slate-400">Generates local preview, review, risk, routeability, and download evidence. Sourcing stays blocked when supplier credentials are missing.</p>
        </div>
      ))}
    </section>
  )
}

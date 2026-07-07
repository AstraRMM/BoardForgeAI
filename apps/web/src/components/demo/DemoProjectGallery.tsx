const projects = ['Compact robotics controller', 'USB-C MCU sensor board', 'CAN sensor node', 'Tiny wearable puck', 'Industrial IO board']

export function DemoProjectGallery() {
  return (
    <section className="bf-guided-gallery">
      {projects.map((project) => (
        <div key={project} className="bf-premium-panel">
          <h3>{project}</h3>
          <p>Generates local preview, review, risk, routeability, and download evidence. Sourcing stays blocked when supplier credentials are missing.</p>
        </div>
      ))}
    </section>
  )
}

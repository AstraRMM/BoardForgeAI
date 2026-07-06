const docCards = [
  ['Start Building', 'Create a board brief, approve the plan, pair the local engine, and generate a KiCad-ready project.', '/new-board'],
  ['Custom Board Generator', 'Draw or select a board shape, validate holes and routeability, then export Edge.Cuts or continue into board creation.', '/custom-board-generator'],
  ['Sourcing Command Center', 'Verify supplier status, BOM risk, alternatives, and quote readiness using configured DigiKey and Mouser credentials.', '/evidence'],
  ['Downloads and Reports', 'Review Gerbers, drill files, BOM, CPL, manifests, evidence reports, and limitation notes before using any package.', '/downloads'],
  ['Installer Return Codes', 'Understand local alpha installer return codes and setup behavior for the local KiCad engine.', '/docs/installer-return-codes'],
]

export default function DocsPage() {
  return (
    <main className="bf-premium-site bf-app-page">
      <section className="bf-section">
        <div className="bf-section-head">
          <span className="bf-kicker">Docs</span>
          <h1>BoardForge is the command center for KiCad project generation, sourcing, validation, repair, and export evidence.</h1>
          <p>The website handles intake, dashboards, sourcing, reports, and onboarding. The installed local engine performs KiCad file work inside the user-approved workspace.</p>
        </div>
        <div className="bf-feature-grid">
          {docCards.map(([title, copy, href]) => (
            <a className="bf-feature-card" href={href} key={title}>
              <h2>{title}</h2>
              <p>{copy}</p>
            </a>
          ))}
        </div>
      </section>
      <section className="bf-section bf-alpha-limitations">
        <div>
          <span className="bf-kicker">Public copy rule</span>
          <h2>Evidence-backed alpha, not guaranteed autonomous manufacturing.</h2>
          <p>BoardForge can create and inspect KiCad projects, run local checks, source parts where configured, and generate reports. Engineers still review before fabrication or assembly.</p>
        </div>
      </section>
    </main>
  )
}

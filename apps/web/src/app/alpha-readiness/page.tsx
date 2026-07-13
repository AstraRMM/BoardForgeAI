export default function AlphaReadinessPage() {
  const categories = [
    ['engine readiness', 'local engine proof exists; public installer signing still required'],
    ['web UX readiness', 'premium command center routes and E2E smoke coverage'],
    ['account and plugin pairing', 'code is ready; Vercel auth variables and database migration are required before live tester pairing'],
    ['KiCad project import', 'sandbox import must keep original source untouched'],
    ['supplier sourcing', 'Mouser live available; DigiKey requires valid OAuth token'],
    ['Make Manufacturable', 'available as an evidence-backed local workflow'],
    ['Make Sourcable', 'available with no-fake-stock behavior'],
    ['manufacturing export readiness', 'exports are labeled by evidence and limitations'],
    ['documentation readiness', 'release limitations and walkthrough documented'],
    ['launch gate', 'controlled release requires production auth smoke-test evidence, plus external certificate and compliance limits'],
  ]
  return (
    <main className="bf-app-page">
      <section className="bf-app-hero">
        <span className="bf-kicker">Launch readiness gate</span>
        <h1>Controlled release is gated by production evidence.</h1>
        <p>BoardForge has local engineering and pairing foundations, but tester access is not claimed until Vercel authentication variables, database migration, and live sign-in/pairing smoke tests pass. Installer signing, PoE compliance/safety review, and live supplier claims remain separate external gates.</p>
      </section>
      <section className="bf-app-grid two">
        {categories.map(([category, evidence]) => (
          <div key={category} className="bf-premium-panel">
            <h3>{category}</h3>
            <p>{evidence}</p>
            <span className="bf-mini-badge">evidence-backed</span>
          </div>
        ))}
      </section>
    </main>
  )
}

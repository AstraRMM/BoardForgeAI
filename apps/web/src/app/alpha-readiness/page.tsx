export default function AlphaReadinessPage() {
  const categories = [
    ['engine readiness', 'local engine proof exists; public installer signing still required'],
    ['web UX readiness', 'premium command center routes and E2E smoke coverage'],
    ['local engine pairing/security', 'localhost pairing and source protection tested'],
    ['KiCad project import', 'sandbox import must keep original source untouched'],
    ['supplier sourcing', 'Mouser live available; DigiKey requires valid OAuth token'],
    ['Make Manufacturable', 'available as an evidence-backed local workflow'],
    ['Make Sourcable', 'available with no-fake-stock behavior'],
    ['manufacturing export readiness', 'exports are labeled by evidence and limitations'],
    ['documentation readiness', 'public alpha limitations and walkthrough documented'],
    ['launch gate', 'PUBLIC_ALPHA_SOFTWARE_READY_EXTERNAL_CERTS_PENDING'],
  ]
  return (
    <main className="bf-app-page">
      <section className="bf-app-hero">
        <span className="bf-kicker">Public alpha launch gate</span>
        <h1>PUBLIC_ALPHA_SOFTWARE_READY_EXTERNAL_CERTS_PENDING</h1>
        <p>BoardForge public-alpha software is ready with external limitations disclosed: installer signing still needs a certificate, PoE compliance/safety review is external, DigiKey ProductInformation live sourcing works with local credentials, and direct DigiKey Quote API support is only claimed after live endpoint proof.</p>
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

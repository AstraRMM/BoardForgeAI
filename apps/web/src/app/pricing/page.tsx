const tiers = [
  {
    name: 'Builder',
    price: 'Public alpha',
    copy: 'For engineers testing BoardForge on local KiCad projects, custom outlines, sourcing checks, and evidence reports.',
    items: ['AI board intake', 'Custom board generator', 'local engine pairing', 'evidence dashboard'],
  },
  {
    name: 'Pro',
    price: 'For serious PCB work',
    copy: 'Adds Make Manufacturable, Make Sourcable, richer project history, supplier checks, and export package workflows.',
    items: ['DRC/ERC report review', 'DigiKey + Mouser sourcing', 'BOM/CPL readiness', 'manufacturing package evidence'],
  },
  {
    name: 'Team',
    price: 'Shared engineering workflow',
    copy: 'For teams that need shared project libraries, review gates, source protection, and repeatable manufacturing evidence.',
    items: ['shared project library', 'approval gates', 'report archives', 'team-ready onboarding'],
  },
]

export default function PricingPage() {
  return (
    <main className="bf-premium-site bf-app-page">
      <section className="bf-section">
        <div className="bf-section-head">
          <span className="bf-kicker">Pricing</span>
          <h1>Public alpha pricing is built around evidence, sourcing, and local KiCad execution.</h1>
          <p>BoardForge is not sold as guaranteed autonomous PCB design. Human engineering review is required before manufacturing.</p>
        </div>
        <div className="bf-feature-grid">
          {tiers.map((tier) => (
            <article className="bf-feature-card" key={tier.name}>
              <span className="bf-kicker">{tier.price}</span>
              <h2>{tier.name}</h2>
              <p>{tier.copy}</p>
              <ul className="bf-simple-list">
                {tier.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

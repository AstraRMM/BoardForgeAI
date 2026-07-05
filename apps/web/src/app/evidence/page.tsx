import { EvidenceDashboard } from '../../components/evidence/EvidenceDashboard'

export default function EvidencePage() {
  return (
    <main className="bf-app-page">
      <section className="bf-app-hero">
        <span className="bf-kicker">Evidence-backed readiness</span>
        <h1>BoardForge Evidence Dashboard</h1>
        <p>Proof cards for engineers, founders, and alpha users: browser E2E, sourcing, source protection, approved-only publish, fixtures, reports, and known limitations.</p>
        <div className="bf-app-status-note">
          <strong>Public alpha truth</strong>
          <span>Mouser live sourcing is available where configured. DigiKey live lookup requires valid local OAuth. No fake stock claims are allowed.</span>
        </div>
      </section>
      <section className="bf-app-section"><EvidenceDashboard /></section>
    </main>
  )
}

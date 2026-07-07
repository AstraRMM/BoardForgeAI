import { localArtifactApiContract } from '../../lib/boardforge-local-artifact-client'

export function LocalEngineStatusBar() {
  return (
    <section className="bf-engine-status-card">
      <div>
        <span className="bf-engine-dot" />
        <span className="bf-engine-kicker">Local execution engine</span>
      </div>
      <div className="bf-engine-status-grid">
        <div>
          <strong>Desktop helper required for real KiCad actions</strong>
          <p>{localArtifactApiContract.offlineDisplayMessage}</p>
        </div>
        <div className="bf-engine-endpoint">
          <span>Connection mode</span>
          <strong>Private desktop pairing</strong>
        </div>
      </div>
    </section>
  )
}

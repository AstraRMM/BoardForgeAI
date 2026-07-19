import Link from 'next/link'
import { AppShell } from '../../../components/app/AppShell'

export default function DeviceSettingsPage() {
  return <AppShell title="Devices" subtitle="Pairing and device records are kept local to the engineering workspace.">
    <div className="bf-app-page">
      <section className="bf-app-hero">
        <span className="bf-kicker">Local device control</span>
        <h1>Device records appear only after a local helper reports them.</h1>
        <p>
          This workspace has no device registry connected, so BoardForge cannot list, revoke, or label devices here.
          Project artifacts remain local drafts until explicitly approved for publishing.
        </p>
      </section>

      <section className="bf-premium-panel" aria-labelledby="device-registry-state">
        <p className="bf-kicker">Unavailable</p>
        <h2 id="device-registry-state" className="mt-3 text-xl font-semibold text-slate-100">No device records are available</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          A paired desktop helper can report engineering execution status, but device registration and account-level
          management are not exposed by the current local engine. Nothing is inferred from this browser session.
        </p>
      </section>

      <section className="bf-workspace-tool-grid" aria-label="Device setup actions">
        <Link href="/settings/plugin" className="bf-workspace-tool">
          <strong>Review plugin pairing</strong>
          <span>Connect or diagnose the protected desktop helper used for local engineering actions.</span>
          <b>Open pairing</b>
        </Link>
        <Link href="/settings" className="bf-workspace-tool">
          <strong>Return to workspace settings</strong>
          <span>Review the available local integrations and their evidence boundaries.</span>
          <b>Open settings</b>
        </Link>
      </section>
    </div>
  </AppShell>
}

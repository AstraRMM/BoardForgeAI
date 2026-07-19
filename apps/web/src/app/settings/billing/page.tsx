import Link from 'next/link'
import { AppShell } from '../../../components/app/AppShell'

export default function BillingSettingsPage() {
  return <AppShell title="Billing and license" subtitle="License evidence is separate from local engineering execution.">
    <div className="bf-app-page">
      <section className="bf-app-hero">
        <span className="bf-kicker">Account boundary</span>
        <h1>Billing is not simulated inside a local engineering workspace.</h1>
        <p>
          BoardForge separates local license checks from project publishing. No subscription, invoice, payment method,
          or entitlement data has been loaded for this account, so none is shown here.
        </p>
      </section>

      <section className="bf-premium-panel" aria-labelledby="license-state">
        <p className="bf-kicker">No account record</p>
        <h2 id="license-state" className="mt-3 text-xl font-semibold text-slate-100">Billing and license details are unavailable</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Development environments may use a local license flag such as <code className="rounded bg-slate-900 px-1">BOARDFORGE_DEV_LICENSE=true</code>.
          That flag is not a billing record and does not prove a production entitlement.
        </p>
      </section>

      <section className="bf-workspace-tool-grid" aria-label="Account setup actions">
        <Link href="/setup" className="bf-workspace-tool">
          <strong>Open account setup</strong>
          <span>Configure the authenticated services required before account-level records can be shown.</span>
          <b>Open setup</b>
        </Link>
        <Link href="/settings/plugin" className="bf-workspace-tool">
          <strong>Review desktop pairing</strong>
          <span>Inspect the local helper connection that runs approved engineering tasks.</span>
          <b>Open pairing</b>
        </Link>
      </section>
    </div>
  </AppShell>
}

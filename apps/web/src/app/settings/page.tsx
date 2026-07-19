import Link from 'next/link'
import { AppShell } from '../../components/app/AppShell'

export default function SettingsPage() {
  return <AppShell title="Workspace settings" subtitle="Manage the local engineering environment and account configuration."><div className="bf-app-page">
    <section className="bf-app-hero"><span className="bf-kicker">Local workspace</span><h1>Configuration belongs with the engineering workspace.</h1><p>BoardForge keeps KiCad execution, routing helpers, and supplier credentials local. Provider stock or sourcing claims remain unavailable until the corresponding local integration reports real evidence.</p></section>
    <section className="bf-workspace-tool-grid">
      <Link href="/settings/plugin" className="bf-workspace-tool"><strong>Plugin pairing</strong><span>Connect the protected desktop helper and inspect pairing diagnostics.</span><b>Open pairing</b></Link>
      <Link href="/setup" className="bf-workspace-tool"><strong>Account setup</strong><span>Configure account services required for protected workspace access.</span><b>Open setup</b></Link>
      <Link href="/evidence" className="bf-workspace-tool"><strong>Evidence status</strong><span>Review local validation and supplier integration evidence before release.</span><b>Open evidence</b></Link>
    </section>
  </div></AppShell>
}

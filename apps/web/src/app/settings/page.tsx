import Link from 'next/link'
import { ArrowUpRight, CircleAlert, PlugZap, ShieldCheck } from 'lucide-react'
import { AppShell } from '../../components/app/AppShell'
import { getAuthEnvironment } from '../../lib/auth'

export default function SettingsPage() {
  const auth = getAuthEnvironment()
  return <AppShell title="Workspace settings" subtitle="Configure the browser workspace and pair a desktop helper for approved local actions."><div className="bf-app-page">
    <section className="bf-app-hero"><span className="bf-kicker">Workspace configuration</span><h1>Connect only the services this workspace can use.</h1><p>BoardForge runs in the browser and asks the desktop helper to perform approved local KiCad work. Project files and supplier credentials stay outside the browser session.</p></section>
    <section className="bf-workspace-grid" aria-label="Available workspace configuration">
      <article className="bf-workspace-panel"><div className="bf-panel-title"><div><p>Desktop helper</p><h2>Pair this browser session</h2></div><PlugZap size={20} /></div><p className="bf-project-workspace-note">Pairing is the only browser-to-local-engine control currently available. Its opaque token remains in this browser session and can be disconnected at any time.</p><Link className="bf-panel-action" href="/settings/plugin">Open plugin pairing <ArrowUpRight size={15} /></Link></article>
      <article className="bf-workspace-panel"><div className="bf-panel-title"><div><p>Account environment</p><h2>{auth.ready ? 'Authentication environment configured' : 'Authentication setup required'}</h2></div>{auth.ready ? <ShieldCheck size={20} /> : <CircleAlert size={20} />}</div><p className="bf-project-workspace-note">{auth.ready ? 'Account services are configured for this deployment. Device records and billing are not exposed by the current engineering workspace.' : `Missing: ${auth.missing.join(', ')}. Complete environment setup before relying on protected account services.`}</p><Link className="bf-panel-action" href="/setup">Open setup diagnostics <ArrowUpRight size={15} /></Link></article>
    </section>
    <section className="bf-workspace-panel"><div className="bf-panel-title"><div><p>Current boundary</p><h2>Unavailable account surfaces stay out of the workspace.</h2></div></div><ul className="bf-workspace-checklist"><li><span className="is-done" />Browser pairing is session-scoped and revocable.</li><li><span className="is-done" />KiCad execution and supplier credentials remain with the local helper.</li><li><span className="is-waiting" />Device registry and billing controls are hidden until their backing account APIs exist.</li></ul></section>
  </div></AppShell>
}

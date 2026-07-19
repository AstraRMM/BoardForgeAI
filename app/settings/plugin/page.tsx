import Link from 'next/link'
import { ArrowUpRight, CircleAlert, KeyRound, ShieldCheck } from 'lucide-react'
import { AppShell } from '../../../apps/web/src/components/app/AppShell'
import { BrowserLocalEnginePairing } from '../../../apps/web/src/components/engine/BrowserLocalEnginePairing'
import { getAuthEnvironment } from '../../../apps/web/src/lib/auth'

export const dynamic = 'force-dynamic'

export default function PluginSettingsPage() {
  const auth = getAuthEnvironment()
  return <AppShell title="Plugin pairing" subtitle="Pair a helper only when browser work needs an approved local KiCad action."><div className="bf-app-page">
    <section className="bf-app-hero"><span className="bf-kicker">Browser-to-helper pairing</span><h1>Keep browser work independent; pair for local execution.</h1><p>Board briefs, browser-saved projects, and geometry sandbox work do not require a desktop helper. Pairing grants this browser session a short-lived token for supported helper-backed actions without exposing project files or supplier credentials.</p></section>
    {!auth.ready && <section className="bf-workspace-alert"><CircleAlert size={20} /><div><strong>Account services need setup.</strong><span>Missing: {auth.missing.join(', ')}. This does not change the local helper protocol, but protected account services remain unavailable.</span></div><Link href="/setup">Open setup diagnostics <ArrowUpRight size={15} /></Link></section>}
    <section className="bf-workspace-grid"><BrowserLocalEnginePairing /><article className="bf-workspace-panel"><div className="bf-panel-title"><div><p>Pairing boundary</p><h2>Scoped, local, and revocable</h2></div><KeyRound size={20} /></div><ul className="bf-workspace-checklist"><li><span className="is-done" />One-time codes are issued by the local helper.</li><li><span className="is-done" />The resulting token is held only in this browser session.</li><li><span className="is-done" />Supported browser-origin helper POST actions attach that token privately.</li><li><span className="is-waiting" />A browser-only workflow remains available when no helper is paired.</li></ul></article></section>
    <section className="bf-workspace-panel"><div className="bf-panel-title"><div><p>Account environment</p><h2>{auth.ready ? 'Authentication environment configured' : 'Authentication setup required'}</h2></div><ShieldCheck size={20} /></div><p className="bf-project-workspace-note">{auth.ready ? 'Account configuration is separate from browser-to-helper pairing. Device administration and billing are not exposed by the current workspace.' : 'Complete setup diagnostics before relying on protected account services. Pairing remains a local-helper action.'}</p>{!auth.ready && <Link className="bf-panel-action" href="/setup">Open setup diagnostics <ArrowUpRight size={15} /></Link>}</section>
  </div></AppShell>
}

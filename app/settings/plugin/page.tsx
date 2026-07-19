import Link from 'next/link'
import { ArrowUpRight, KeyRound, ShieldCheck } from 'lucide-react'
import { AppShell } from '../../../apps/web/src/components/app/AppShell'
import { BrowserLocalEnginePairing } from '../../../apps/web/src/components/engine/BrowserLocalEnginePairing'
import { getAuthEnvironment } from '../../../apps/web/src/lib/auth'

export const dynamic = 'force-dynamic'

export default function PluginSettingsPage() {
  const auth = getAuthEnvironment()
  const destination = auth.ready ? '/plugin/connect' : '/setup'
  return <AppShell title="Plugin pairing" subtitle="Pair the private desktop engine without exposing project or supplier secrets."><div className="bf-app-page">
    <section className="bf-app-hero"><span className="bf-kicker">Desktop integration</span><h1>Connect a local engine you control.</h1><p>Pairing issues a short-lived, one-time code. The desktop engine retains its revocable device token; browser sessions and supplier credentials never leave their respective environments.</p></section>
    <section className="bf-workspace-grid"><article className="bf-workspace-panel"><div className="bf-panel-title"><div><p>Account pairing</p><h2>{auth.ready ? 'Account services configured' : 'Account setup required'}</h2></div><ShieldCheck size={20} /></div><p className="bf-project-workspace-note">{auth.ready ? 'Generate a protected account-to-device code for the installed BoardForge local engine.' : `Authentication configuration is incomplete: ${auth.missing.join(', ')}.`}</p><Link className="bf-panel-action" href={destination}>{auth.ready ? 'Open account pairing' : 'Open setup'} <ArrowUpRight size={15} /></Link></article><BrowserLocalEnginePairing /><article className="bf-workspace-panel"><div className="bf-panel-title"><div><p>Security model</p><h2>Short-lived and revocable</h2></div><KeyRound size={20} /></div><ul className="bf-workspace-checklist"><li><span className="is-done" />One-time pairing code</li><li><span className="is-done" />Opaque local device token</li><li><span className="is-done" />Local project artifacts remain local</li><li><span className="is-waiting" />Pairing requires a configured account</li></ul></article></section>
  </div></AppShell>
}

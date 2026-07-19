import Link from 'next/link'
import { ArrowUpRight, CircleAlert } from 'lucide-react'
import { AppShell } from '../../components/app/AppShell'
import { DashboardLocalContent } from '../../components/project/DashboardLocalContent'
import { getAuthEnvironment } from '../../lib/auth'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const auth = getAuthEnvironment()
  return <AppShell title="Engineering command center" subtitle="Review projects, evidence, and local execution gates.">
    <div className="bf-workspace-page">
      {!auth.ready && <section className="bf-workspace-alert"><CircleAlert size={20} /><div><strong>Account services still need configuration.</strong><span>Missing: {auth.missing.join(', ')}. Local project files remain private to the approved workspace.</span></div><Link href="/setup">Complete setup <ArrowUpRight size={15} /></Link></section>}
      <header className="bf-workspace-head"><div><p>Workspace overview</p><h1>Welcome back, engineer.</h1><span>Everything below is derived from local project artifacts and readiness gates.</span></div><div className="bf-workspace-actions"><Link href="/new-board">Create board brief <ArrowUpRight size={16} /></Link><Link className="is-secondary" href="/import">Inspect KiCad</Link></div></header>
      <DashboardLocalContent authReady={auth.ready} />
    </div>
  </AppShell>
}

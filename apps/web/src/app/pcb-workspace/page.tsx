import Link from 'next/link'
import { Suspense } from 'react'
import { AppShell } from '../../components/app/AppShell'
import { BrowserPcbEditor } from '../../components/pcb/BrowserPcbEditor'

export const metadata = { title: 'PCB workspace · BoardForge' }

export default function PcbWorkspacePage() {
  return <AppShell title="PCB workspace" subtitle="Browser editing is transaction-backed; project-bound KiCad source remains a local-engine action.">
    <div className="bf-pcb-workspace-page">
      <section className="bf-pcb-workspace-notice">
        <div><strong>Browser PCB sandbox</strong><span>Use the Rust/WASM editor to inspect selection, placement, routing, measurements, and live geometry checks. Downloaded boards are sandbox handoffs for KiCad review, not validated project candidates.</span></div>
        <Link href="/projects">Choose a local project</Link>
      </section>
      <Suspense fallback={<section className="bf-workspace-panel" role="status">Loading browser PCB workspace…</section>}>
        <BrowserPcbEditor />
      </Suspense>
    </div>
  </AppShell>
}

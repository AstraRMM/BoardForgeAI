import { AppShell } from '../../components/app/AppShell'
import { EvidenceLocalContent } from '../../components/project/EvidenceLocalContent'

export const dynamic = 'force-dynamic'

export default function EvidencePage() {
  return <AppShell title="Evidence" subtitle="Every readiness claim must point back to an observable local result."><main className="bf-app-page"><section className="bf-app-hero"><span className="bf-kicker">Evidence registry</span><h1>Inspect recorded engineering evidence.</h1><p>BoardForge presents project-level validation and release state from local artifacts. Provider status, manufacturing readiness, and validation claims are absent until the local engine writes evidence.</p></section><EvidenceLocalContent /></main></AppShell>
}

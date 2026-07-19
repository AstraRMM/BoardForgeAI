import { ImportKiCadWizard } from '../../components/import/ImportKiCadWizard'
import { AppShell } from '../../components/app/AppShell'

export default function ImportPage() {
  return <AppShell title="Import KiCad project" subtitle="Copy-based import keeps source KiCad projects outside the browser workflow.">
    <div className="bf-app-page">
      <section className="bf-app-hero">
        <span className="bf-kicker">Local-first import</span>
        <h1>Import an existing KiCad project without modifying its source.</h1>
        <p>
          The local import workflow copies a selected project into a sandbox before validation or repair. Source hashes
          prove the original stayed untouched. No project has been selected or imported from this browser page.
        </p>
      </section>
      <ImportKiCadWizard />
    </div>
  </AppShell>
}

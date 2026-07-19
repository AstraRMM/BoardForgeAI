import { ImportKiCadWizard } from '../../components/import/ImportKiCadWizard'
import { AppShell } from '../../components/app/AppShell'

export default function ImportPage() {
  return <AppShell title="Import KiCad project" subtitle="Register existing work in the browser, then pair the desktop helper for KiCad operations.">
    <div className="bf-app-page">
      <section className="bf-app-hero">
        <span className="bf-kicker">Project intake</span>
        <h1>Bring an existing KiCad project into your workspace.</h1>
        <p>
          Register source files in this browser now to organize the project. Pair the desktop helper before asking BoardForge
          to copy, parse, validate, repair, or export those files; those operations remain explicit and source-safe.
        </p>
      </section>
      <ImportKiCadWizard />
    </div>
  </AppShell>
}

import { AppShell } from '../../components/app/AppShell'
import { BrowserSchematicPlanningWorkspace } from '../../components/schematic/BrowserSchematicPlanningWorkspace'
import { Suspense } from 'react'

export default function SchematicWorkspacePage() {
  return <AppShell title="Schematic planning" subtitle="Browser-local circuit intent, clearly separated from KiCad source and validation.">
    <Suspense fallback={<div className="bf-workspace-page"><section className="bf-workspace-panel" role="status">Loading browser schematic planning workspace…</section></div>}>
      <BrowserSchematicPlanningWorkspace />
    </Suspense>
  </AppShell>
}

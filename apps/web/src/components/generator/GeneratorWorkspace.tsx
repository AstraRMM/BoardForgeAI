import { AppShell } from '../app/AppShell'
import { OutlineEditor } from '../outline/OutlineEditor'
import { BoxSelect, FileCog, Info, Ruler } from 'lucide-react'
import { Suspense } from 'react'
import styles from './GeneratorWorkspace.module.css'

/**
 * The outline editor owns its tools, browser-draft export, and optional local
 * KiCad handoff. Keeping this wrapper intentionally small avoids duplicating
 * controls or validation reference panels beside the actual work surface.
 */
export function GeneratorWorkspace() {
  return (
    <AppShell title="Custom Board Generator" subtitle="Browser-first mechanical design with an optional gated KiCad handoff.">
      <div className={styles.workspace}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}><BoxSelect size={14} /> Mechanical design workspace</p>
            <h1>Custom Board Generator</h1>
            <p className={styles.copy}>Create a precise mechanical outline, review routeability in-browser, save a browser outline draft, or hand an exact Edge.Cuts seed to a paired local engine.</p>
          </div>
          <div className={styles.headerFacts} aria-label="Generator information">
            <span><Ruler size={15} /> Dimensions in mm</span>
            <span><FileCog size={15} /> Optional KiCad handoff</span>
          </div>
        </header>

        <div className={styles.notice}>
          <Info size={16} />
          <span>Geometry checks run here. A local engine is only needed when you request KiCad creation or KiCad evidence.</span>
        </div>

        <section className={styles.canvasRegion} aria-label="Board outline editor">
          <Suspense fallback={<div className="bf-workspace-panel" role="status">Loading outline workspace...</div>}>
            <OutlineEditor />
          </Suspense>
        </section>

        <section className={styles.workflow} aria-label="Export and handoff boundary">
          <div className="bf-workspace-panel">
            <p className="bf-panel-kicker">Export boundary</p>
            <h2>Browser drafts and KiCad candidates are distinct.</h2>
            <p className="bf-project-workspace-note">Save or download exact geometry from the editor. A paired local engine is required only to create Edge.Cuts files or later run KiCad validation.</p>
          </div>
        </section>
      </div>
    </AppShell>
  )
}

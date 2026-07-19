import { AppShell } from '../app/AppShell'
import { OutlineEditor } from '../outline/OutlineEditor'
import { OutlinePresetPicker } from '../outline/OutlinePresetPicker'
import { OutlineValidationPanel } from '../outline/OutlineValidationPanel'
import { LocalEngineStatusBar } from '../project/LocalEngineStatusBar'
import { BoxSelect, FileCog, Info, Keyboard, Ruler } from 'lucide-react'
import styles from './GeneratorWorkspace.module.css'

/**
 * Presentation-only integration for the protected outline editor.  The
 * actual geometry, Rust/WASM bridge, local-engine requests, and candidate
 * save contracts stay in their existing feature modules.
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

        <div className={styles.editorGrid}>
          <section className={styles.canvasRegion} aria-label="Board outline editor">
            <OutlineEditor />
          </section>
          <aside className={styles.inspector} aria-label="Board generator inspector">
            <LocalEngineStatusBar />
            <OutlinePresetPicker />
            <OutlineValidationPanel />
            <section className={styles.shortcuts} aria-labelledby="generator-shortcuts">
              <div><Keyboard size={16} /><h2 id="generator-shortcuts">Editor shortcuts</h2></div>
              <dl>
                <div><dt><kbd>A</kbd></dt><dd>Add point</dd></div>
                <div><dt><kbd>F</kbd></dt><dd>Auto-fix outline</dd></div>
                <div><dt><kbd>Space</kbd></dt><dd>Pan canvas</dd></div>
                <div><dt><kbd>Ctrl</kbd><kbd>Z</kbd></dt><dd>Undo geometry</dd></div>
              </dl>
            </section>
          </aside>
        </div>

        <section className={styles.workflow} aria-label="Local engineering workflow">
          <div className="bf-workspace-panel">
            <p className="bf-panel-kicker">Handoff boundary</p>
            <h2>Browser drafts and KiCad candidates are distinct.</h2>
            <p className="bf-project-workspace-note">The editor can save a browser outline draft and package exact geometry. A paired local engine must create Edge.Cuts files and later run KiCad validation; neither action is implied by browser geometry checks.</p>
          </div>
        </section>
      </div>
    </AppShell>
  )
}

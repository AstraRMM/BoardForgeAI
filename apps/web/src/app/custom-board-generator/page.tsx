import { OutlineEditor } from '../../components/outline/OutlineEditor'
import { OutlinePresetPicker } from '../../components/outline/OutlinePresetPicker'
import { OutlineValidationPanel } from '../../components/outline/OutlineValidationPanel'
import { LocalEngineStatusBar } from '../../components/project/LocalEngineStatusBar'
import { ProjectActionPanel } from '../../components/project/ProjectActionPanel'
import { localArtifactApiContract } from '../../lib/boardforge-local-artifact-client'

export default function CustomBoardGeneratorPage() {
  return (
    <main className="bf-app-page">
      <section className="bf-app-hero">
        <span className="bf-kicker">Flagship outline studio</span>
        <h1>Custom Board Shape Studio</h1>
        <p>
          Design the mechanical PCB outline visually, validate the geometry, then hand the exact Edge.Cuts seed to the
          BoardForge Codex plugin or the local engine for a real outline-only KiCad project.
        </p>
        <div className="bf-app-status-note">
          <strong>Desktop helper status</strong>
          <span>{localArtifactApiContract.offlineDisplayMessage}</span>
          <span>When paired, this studio validates the outline, records mechanical intent, and prepares real KiCad Edge.Cuts output.</span>
        </div>
        <div className="bf-app-panel">
          <LocalEngineStatusBar />
        </div>
      </section>
      <section className="bf-app-section">
        <OutlineEditor />
      </section>
      <section className="bf-app-grid two">
        <OutlinePresetPicker />
        <OutlineValidationPanel />
      </section>
      <section className="bf-app-section">
        <ProjectActionPanel />
      </section>
      <section className="bf-warning-panel">
        <p>No fake outline success: failed shapes must report exact Edge.Cuts, DRC/ERC, routeability, or manufacturing blockers.</p>
      </section>
    </main>
  )
}

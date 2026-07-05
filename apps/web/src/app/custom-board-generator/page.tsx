import { OutlineEditor } from '../../components/outline/OutlineEditor'
import { OutlinePresetPicker } from '../../components/outline/OutlinePresetPicker'
import { OutlineValidationPanel } from '../../components/outline/OutlineValidationPanel'
import { LocalEngineStatusBar } from '../../components/project/LocalEngineStatusBar'
import { ProjectActionPanel } from '../../components/project/ProjectActionPanel'
import { localArtifactApiContract } from '../../lib/boardforge-local-artifact-client'

export default function CustomBoardGeneratorPage() {
  const shapes = [
    ['rounded rectangle', 'Fast manufacturable default with M3 holes and edge connector intent.'],
    ['mounting ears', 'Mechanical ears for drone stacks, sensor modules, and enclosure screws.'],
    ['octagonal', 'Compact shape with clearer routing corners and board-edge clearance.'],
    ['L-shaped', 'Route around enclosure posts, camera cutouts, or connector access.'],
    ['tabbed connector', 'Explicit edge connector region and keepout warning.'],
    ['circular puck', 'Wearable or sensor puck seed with centered keepout.'],
    ['notched board', 'USB, antenna, or flex-cable relief with Edge.Cuts validation.'],
    ['internal cutout', 'Board cutout seed with manufacturability and routeability warnings.'],
  ]
  return (
    <main className="bf-app-page">
      <section className="bf-app-hero">
        <span className="bf-kicker">Flagship outline studio</span>
        <h1>Custom Board Generator</h1>
        <p>
          Create board outlines with presets, drawing, points, mounting holes, connector edge intent, routeability scoring,
          warnings, and a local-engine path to KiCad Edge.Cuts.
        </p>
        <div className="bf-app-status-note">
          <strong>Local engine status</strong>
          <span>{localArtifactApiContract.offlineMessage}</span>
          <span>When paired, this page uses localhost routes for intake, brief approval, project creation, downloads, and publish gates.</span>
        </div>
        <div className="bf-app-panel">
          <LocalEngineStatusBar />
        </div>
      </section>
      <section className="bf-app-grid two">
        {shapes.map(([shape, description]) => (
          <div key={shape} className="bf-premium-panel">
            <h3>{shape}</h3>
            <p>{description}</p>
            <span className="bf-mini-badge">routeability + Edge.Cuts review</span>
          </div>
        ))}
      </section>
      <section className="bf-app-grid three">
        <OutlinePresetPicker />
        <OutlineEditor />
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

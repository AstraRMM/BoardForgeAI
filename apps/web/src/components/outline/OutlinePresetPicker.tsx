import { outlinePresets } from '../../lib/outline-export'

export function OutlinePresetPicker() {
  return (
    <section className="bf-premium-panel">
      <p className="bf-kicker">Preset library</p>
      <h2>Start with a manufacturable family</h2>
      <p>
        These presets seed the same geometry contract used by the BoardForge local engine. Custom sketches still go
        through self-intersection, hole clearance, routeability, and Edge.Cuts checks before KiCad generation.
      </p>
      <p className="bf-outline-preset-keywords">
        rounded rectangle, mounting ears, octagonal, L-shape, cutout/notch, drone stack pattern, custom polygon
      </p>
      <div className="bf-outline-preset-grid">
        {outlinePresets.map((preset) => (
          <div key={preset.id} className="bf-outline-preset-card">
            <strong>{preset.label}</strong>
            <span>{preset.description}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

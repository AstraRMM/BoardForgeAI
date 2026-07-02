import { outlinePresets } from '../../lib/outline-export'

export function OutlinePresetPicker() {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-cyan-300">Outline presets</p>
      <p className="mt-2 text-xs text-slate-400">Includes rounded rectangle, mounting ears, octagonal, L-shape, cutout/notch, drone stack pattern, and custom polygon seeds.</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {outlinePresets.map((preset) => (
          <span key={preset} className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-200">{preset}</span>
        ))}
      </div>
    </section>
  )
}

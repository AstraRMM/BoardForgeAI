export function OutlineEditor() {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-cyan-300">Outline editor seed</p>
      <p className="mt-3 text-sm text-slate-300">This alpha page exports mechanical constraints for the local BoardForge engine. It does not fake an in-browser KiCad route.</p>
      <pre className="mt-3 overflow-auto rounded bg-slate-950 p-3 text-xs text-emerald-300">BoardForge_Custom_Outline_Project_Seed.json</pre>
      <pre className="mt-2 overflow-auto rounded bg-slate-950 p-3 text-xs text-emerald-300">BoardForge_Mechanical_Constraints.json</pre>
      <pre className="mt-2 overflow-auto rounded bg-slate-950 p-3 text-xs text-emerald-300">BoardForge_Outline_Validation_Report.md</pre>
    </section>
  )
}

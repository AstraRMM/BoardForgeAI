import { OutlineEditor } from '../../components/outline/OutlineEditor'
import { OutlinePresetPicker } from '../../components/outline/OutlinePresetPicker'
import { OutlineValidationPanel } from '../../components/outline/OutlineValidationPanel'
import { LocalEngineStatusBar } from '../../components/project/LocalEngineStatusBar'
import { ProjectActionPanel } from '../../components/project/ProjectActionPanel'
import { localArtifactApiContract } from '../../lib/boardforge-local-artifact-client'

export default function CustomBoardGeneratorPage() {
  const shapes = ['rounded rectangle', 'mounting ears', 'octagonal', 'L-shaped', 'tabbed connector', 'circular puck', 'notched board', 'internal cutout']
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-wide text-cyan-300">Local engine artifact</p>
        <h1 className="mt-2 text-3xl font-semibold">Custom Board Generator</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          BoardForge custom outlines are generated locally, scored for routeability, and must pass Edge.Cuts, mounting-hole,
          connector-access, DRC/ERC, and manufacturing checks before export.
        </p>
        <p className="mt-3 text-sm text-amber-200">{localArtifactApiContract.offlineMessage}</p>
        <p className="mt-2 text-sm text-slate-400">When online, this page uses localhost routes for intake, brief approval, project creation, downloads, and publish gates.</p>
        <div className="mt-6">
          <LocalEngineStatusBar />
        </div>
      </section>
      <section className="mx-auto mt-8 grid max-w-5xl gap-3 md:grid-cols-2">
        {shapes.map((shape) => (
          <div key={shape} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="font-semibold">{shape}</p>
            <p className="mt-2 text-sm text-slate-400">Planned for crazy-outline regression after the prompt/conversation layer foundation.</p>
          </div>
        ))}
      </section>
      <section className="mx-auto mt-8 grid max-w-5xl gap-4 lg:grid-cols-3">
        <OutlinePresetPicker />
        <OutlineEditor />
        <OutlineValidationPanel />
      </section>
      <section className="mx-auto mt-8 max-w-5xl">
        <ProjectActionPanel />
      </section>
      <section className="mx-auto mt-8 max-w-5xl rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="text-sm text-amber-100">No fake outline success: failed shapes must report exact Edge.Cuts, DRC/ERC, routeability, or manufacturing blockers.</p>
      </section>
    </main>
  )
}

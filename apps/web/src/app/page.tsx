import dashboard from '../sample-manifests/project-dashboard.json'
import { ProjectStatusCard } from '../components/ProjectStatusCard'

export default function HomePage() {
  const projects = dashboard.projects.slice(0, 2)
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-10 text-slate-100">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">BoardForge AI</p>
        <h1 className="mt-3 max-w-3xl text-5xl font-semibold">From PCB idea to manufacturable KiCad project.</h1>
        <p className="mt-5 max-w-3xl text-lg text-slate-300">
          Local-first PCB engineering for schematic generation, custom outlines, placement, routing, DRC/ERC repair, sourcing disclosure, and manufacturing exports.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {projects.map((project) => <ProjectStatusCard key={project.projectId} project={project as any} />)}
        </div>
      </section>
    </main>
  )
}

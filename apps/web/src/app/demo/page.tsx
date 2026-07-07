import { DemoProjectGallery } from '../../components/demo/DemoProjectGallery'
import { OneClickDemoButton } from '../../components/demo/OneClickDemoButton'

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-wide text-emerald-300">BoardForge guided local workflow</p>
        <h1 className="mt-2 text-3xl font-semibold">Run The Guided Workflow</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          This demo is local artifact-backed. It does not pretend to run cloud jobs.
        </p>
      </section>
      <section className="mx-auto mt-8 max-w-5xl rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">Workflow package</h2>
        <p className="mt-3 text-sm text-slate-300">
          The guided workflow creates a protected local package with intake evidence, brief approval, manufacturability review,
          sourcing state, and clearly labeled outputs.
        </p>
      </section>
      <section className="mx-auto mt-8 max-w-5xl">
        <OneClickDemoButton />
      </section>
      <section className="mx-auto mt-8 max-w-5xl">
        <DemoProjectGallery />
      </section>
      <section className="mx-auto mt-8 grid max-w-5xl gap-3 md:grid-cols-2">
        {['prompt intake', 'conditional questions', 'brief revisions', 'approval gate', 'local candidate', 'publish confirmation', 'manufacturing example', 'sourcing blocked when credentials are missing'].map((step) => (
          <div key={step} className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">{step}</div>
        ))}
      </section>
    </main>
  )
}

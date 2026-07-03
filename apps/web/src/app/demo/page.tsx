import { DemoProjectGallery } from '../../components/demo/DemoProjectGallery'
import { OneClickDemoButton } from '../../components/demo/OneClickDemoButton'

export default function DemoPage() {
  const demoFolder = 'C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures\\BF-ALPHA-DEMO-ROBOTICS-CONTROLLER-01'
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-wide text-emerald-300">BoardForge local alpha demo</p>
        <h1 className="mt-2 text-3xl font-semibold">Run The Guided Alpha Flow</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          This demo is local artifact-backed. It does not pretend to run cloud jobs.
        </p>
      </section>
      <section className="mx-auto mt-8 max-w-5xl rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">Command</h2>
        <pre className="mt-4 overflow-auto rounded bg-slate-950 p-4 text-sm text-emerald-300">npm run boardforge:demo</pre>
        <p className="mt-4 text-sm text-slate-400">Demo folder: {demoFolder}</p>
      </section>
      <section className="mx-auto mt-8 max-w-5xl">
        <OneClickDemoButton />
      </section>
      <section className="mx-auto mt-8 max-w-5xl">
        <DemoProjectGallery />
      </section>
      <section className="mx-auto mt-8 grid max-w-5xl gap-3 md:grid-cols-2">
        {['prompt intake', 'conditional questions', 'brief v1/v2', 'approval gate', 'local candidate', 'publish confirm gate', 'manufacturing example', 'sourcing NOT_CHECKED when keys are missing'].map((step) => (
          <div key={step} className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">{step}</div>
        ))}
      </section>
    </main>
  )
}

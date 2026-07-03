import { ImportKiCadWizard } from '../../components/import/ImportKiCadWizard'

export default function ImportPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-wide text-cyan-300">Local-first import</p>
        <h1 className="mt-2 text-3xl font-semibold">Import Existing KiCad Project</h1>
        <p className="mt-3 max-w-3xl text-slate-400">The live website asks the local engine to copy into a sandbox. Source hashes prove the original stayed untouched.</p>
      </section>
      <section className="mx-auto mt-8 max-w-5xl"><ImportKiCadWizard /></section>
    </main>
  )
}

import { FirstRunSetupWizard } from '../../components/setup/FirstRunSetupWizard'

export default function SetupPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm uppercase tracking-wide text-emerald-300">BoardForge first run</p>
        <h1 className="mt-2 text-3xl font-semibold">Pair the live website to your local engine</h1>
        <p className="mt-3 max-w-3xl text-slate-400">The live website controls KiCad through the installed local BoardForge engine. This wizard keeps that bridge explicit, local-first, and safe.</p>
      </section>
      <section className="mx-auto mt-8 max-w-6xl">
        <FirstRunSetupWizard />
      </section>
    </main>
  )
}

import evidence from '../../sample-manifests/readiness-evidence.json'
import { dirtyRepairEngineStatus } from '../../lib/boardforge-engine-status'
import { LocalEngineStatusBar } from '../../components/project/LocalEngineStatusBar'

export default function ReadinessPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <header className="mx-auto max-w-6xl">
        <p className="text-sm uppercase text-cyan-300">Evidence-backed readiness score</p>
        <h1 className="mt-2 text-3xl font-semibold">BoardForge Readiness</h1>
        <p className="mt-2 max-w-3xl text-slate-400">This dashboard reports what BoardForge has proven locally. It does not inflate readiness for unverified sourcing, compliance, or arbitrary dense-board autonomy.</p>
        <div className="mt-6">
          <LocalEngineStatusBar />
        </div>
      </header>
      <section className="mx-auto mt-6 grid max-w-6xl gap-4 md:grid-cols-5">
        <Metric label="Score" value={evidence.readiness} />
        <Metric label="Clean fixtures" value={evidence.evidence.cleanFixtures} />
        <Metric label="Manufacturing exports" value={evidence.evidence.manufacturingExports} />
        <Metric label="Dirty-to-clean repairs" value={evidence.evidence.dirtyToCleanRepairs} />
        <Metric label="Categories" value={evidence.evidence.categoryCoverage} />
      </section>
      <section className="mx-auto mt-8 max-w-6xl rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">Dirty-to-clean physical repair</h2>
        <p className="mt-2 text-sm text-slate-400">Local artifact-backed proof: DRC {dirtyRepairEngineStatus.drcBefore} &rarr; {dirtyRepairEngineStatus.drcAfter}, shorts {dirtyRepairEngineStatus.shortsBefore} &rarr; {dirtyRepairEngineStatus.shortsAfter}, transactions {dirtyRepairEngineStatus.transactionsCommitted}/{dirtyRepairEngineStatus.transactionsAttempted} committed.</p>
      </section>
      <section className="mx-auto mt-8 grid max-w-6xl gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-semibold">Known gaps</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {evidence.knownGaps.map((gap) => <li key={gap}>{gap}</li>)}
          </ul>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-semibold">Latest proof tests</h2>
          <div className="mt-4 space-y-2">
            {evidence.latestTests.map((test) => (
              <div key={test.command} className="flex items-center justify-between rounded border border-slate-800 bg-slate-950 p-3 text-sm">
                <span className="font-mono text-slate-300">{test.command}</span>
                <span className={test.status === 'passed' ? 'text-emerald-300' : 'text-amber-300'}>{test.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 font-mono text-3xl">{value}</p></div>
}

import type { BoardForgeEngineStatus } from '../../lib/boardforge-engine-status'

export function EngineStatusPanel({ status }: { status: BoardForgeEngineStatus }) {
  return (
    <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase text-cyan-300">Local engine artifact status</p>
          <h2 className="mt-1 text-xl font-semibold">{status.fixtureName}</h2>
          <p className="mt-1 text-sm text-slate-300">{status.latestStatus}</p>
          <p className="mt-2 max-w-3xl break-words text-sm text-slate-400">{status.currentBoardFile}</p>
        </div>
        <span className={status.manufacturingReady ? 'text-emerald-300' : 'text-amber-300'}>
          {status.manufacturingReady ? 'Manufacturing ready' : 'Blocked'}
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Metric label="DRC" value={`${status.drcBefore} -> ${status.drcAfter}`} />
        <Metric label="ERC" value={`${status.ercBefore} -> ${status.ercAfter}`} />
        <Metric label="Shorts" value={`${status.shortsBefore} -> ${status.shortsAfter}`} />
        <Metric label="Unconnected" value={`${status.unconnectedBefore} -> ${status.unconnectedAfter}`} />
        <Metric label="Attempted" value={status.transactionsAttempted} />
        <Metric label="Committed" value={status.transactionsCommitted} />
        <Metric label="Rolled back" value={status.transactionsRolledBack} />
        <Metric label="Source" value={status.source} />
        <Metric label="Evidence" value={status.readinessEvidenceCategory} />
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <p className="break-words rounded bg-slate-950 p-3 text-xs text-slate-300">Start: {status.startingBoard}</p>
        <p className="break-words rounded bg-slate-950 p-3 text-xs text-slate-300">Final: {status.finalBoard}</p>
        <pre className="overflow-auto rounded bg-slate-950 p-3 text-xs text-emerald-300">{status.cliReplayCommand}</pre>
        <p className="break-words rounded bg-slate-950 p-3 text-xs text-slate-300">{status.manufacturingZip || status.blocker || 'No package yet'}</p>
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded border border-slate-800 bg-slate-950 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-mono text-slate-100">{value}</p></div>
}

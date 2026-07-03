import { pairingInstructions } from '../../lib/boardforge-local-engine-pairing-client'

export function LocalEnginePairingPanel() {
  const pairing = pairingInstructions()
  return (
    <section className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
      <p className="text-sm uppercase tracking-wide text-emerald-300">Secure local engine pairing</p>
      <h2 className="mt-1 text-xl font-semibold text-emerald-50">Live website connected to local engine</h2>
      <p className="mt-2 text-sm text-emerald-100">{pairing.copy}</p>
      <div className="mt-3 grid gap-2 text-xs font-mono text-emerald-100 md:grid-cols-2">
        {Object.entries(pairing.routes).map(([name, route]) => <div key={name} className="rounded bg-slate-950/40 px-2 py-1">{name}: {route}</div>)}
      </div>
    </section>
  )
}

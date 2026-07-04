export function SupplierMatrixPanel({ matrix }: { matrix?: any }) {
  const providers = matrix?.providers || {
    digikey: { status: 'CONFIGURED_IF_LOCAL_ENV_PRESENT' },
    mouser: { status: 'NOT_CONFIGURED', reason: 'No product/search API configured' },
    lcsc: { status: 'NOT_CONFIGURED' },
    jlcpcb: { status: 'NOT_CONFIGURED' },
  }
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-sm font-semibold text-slate-100">Supplier Matrix</h3>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        {Object.entries(providers).map(([id, provider]: any) => (
          <div key={id} className="rounded border border-slate-800 bg-slate-950 p-2">
            <dt className="uppercase text-slate-500">{id}</dt>
            <dd className="mt-1 font-mono text-slate-200">{provider.status || `${provider.verified || 0}/${provider.rows || 0} verified`}</dd>
            {provider.reason ? <dd className="mt-1 text-slate-400">{provider.reason}</dd> : null}
          </div>
        ))}
      </dl>
    </section>
  )
}

type SupplierStatus = {
  status?: string
  reason?: string
  verified?: number
  rows?: number
}

type SupplierMatrix = { providers?: Record<string, SupplierStatus> }

export function SupplierMatrixPanel({ matrix }: { matrix?: SupplierMatrix }) {
  const providers = matrix?.providers || {
    digikey: { status: 'Ready when local credentials exist' },
    mouser: { status: 'Not configured', reason: 'No product/search API configured' },
    lcsc: { status: 'Not configured' },
    jlcpcb: { status: 'Not configured' },
  }
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-sm font-semibold text-slate-100">Supplier Matrix</h3>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        {Object.entries(providers).map(([id, provider]) => (
          <div key={id} className="rounded border border-slate-800 bg-slate-950 p-2">
            <dt className="uppercase text-slate-500">{id}</dt>
            <dd className="mt-1 font-semibold text-slate-200">{humanize(provider.status || `${provider.verified || 0}/${provider.rows || 0} verified`)}</dd>
            {provider.reason ? <dd className="mt-1 text-slate-400">{provider.reason}</dd> : null}
          </div>
        ))}
      </dl>
    </section>
  )
}

function humanize(value: unknown) {
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

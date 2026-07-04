export function BomVerificationTable({ rows = [] }: { rows?: any[] }) {
  const sample = rows.length ? rows : [
    { mpn: 'BOM not verified yet', sourcingStatus: 'NOT_CHECKED', stockStatus: 'UNKNOWN', risk: 'Run DigiKey Verification' },
  ]
  return (
    <div className="overflow-auto rounded border border-slate-800">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-slate-950 text-slate-300">
          <tr><th className="p-2">MPN</th><th className="p-2">Match</th><th className="p-2">Stock</th><th className="p-2">Lifecycle</th><th className="p-2">Risk</th></tr>
        </thead>
        <tbody>
          {sample.map((row, index) => (
            <tr key={index} className="border-t border-slate-800">
              <td className="p-2 font-mono">{row.MPN || row.mpn}</td>
              <td className="p-2">{row.sourcingStatus}</td>
              <td className="p-2">{row.stockStatus}</td>
              <td className="p-2">{row.lifecycleStatus || 'UNKNOWN'}</td>
              <td className="p-2">{row.risk}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

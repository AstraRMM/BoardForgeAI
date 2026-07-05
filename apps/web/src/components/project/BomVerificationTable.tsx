export function BomVerificationTable({ rows = [] }: { rows?: any[] }) {
  const sample = rows.length ? rows : [
    { Ref: 'R?', MPN: 'BOM not verified yet', Manufacturer: 'UNKNOWN', digiKeyPartNumber: 'NOT_CHECKED', matchType: 'not_checked', sourcingStatus: 'NOT_CHECKED', stockStatus: 'UNKNOWN', quantityAvailable: '', unitPrice: '', lifecycleStatus: 'UNKNOWN', rohsStatus: 'UNKNOWN', datasheetUrl: '', liveStatus: 'NOT_CHECKED', risk: 'Run DigiKey Verification', nextAction: 'Start sourcing_verify job' },
  ]
  return (
    <div className="overflow-auto rounded border border-slate-800">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-slate-950 text-slate-300">
          <tr>
            <th className="p-2">Ref</th><th className="p-2">Requested MPN</th><th className="p-2">Manufacturer</th><th className="p-2">DigiKey Match</th><th className="p-2">Match Type</th><th className="p-2">Stock</th><th className="p-2">Qty</th><th className="p-2">Unit</th><th className="p-2">Lifecycle</th><th className="p-2">RoHS</th><th className="p-2">Data</th><th className="p-2">Risk</th><th className="p-2">Next</th>
          </tr>
        </thead>
        <tbody>
          {sample.map((row, index) => (
            <tr key={index} className="border-t border-slate-800">
              <td className="p-2 font-mono">{row.Ref || row.ref || row.reference}</td>
              <td className="p-2 font-mono">{row.MPN || row.mpn || row.manufacturerPartNumber}</td>
              <td className="p-2">{row.Manufacturer || row.manufacturer || 'UNKNOWN'}</td>
              <td className="p-2 font-mono">{row.digiKeyPartNumber || row.digikeyPartNumber || row.selected?.digiKeyPartNumber || 'NOT_CHECKED'}</td>
              <td className="p-2">{row.matchType || row.sourcingStatus || 'not_checked'}</td>
              <td className="p-2">{row.stockStatus}</td>
              <td className="p-2">{row.quantityAvailable || ''}</td>
              <td className="p-2">{row.unitPrice || ''}</td>
              <td className="p-2">{row.lifecycleStatus || 'UNKNOWN'}</td>
              <td className="p-2">{row.rohsStatus || 'UNKNOWN'}</td>
              <td className="p-2">{row.datasheetUrl ? 'datasheet' : (row.liveStatus || 'NOT_CHECKED')}</td>
              <td className="p-2">{row.risk || row.sourcingStatus}</td>
              <td className="p-2">{row.nextAction || 'Review report'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

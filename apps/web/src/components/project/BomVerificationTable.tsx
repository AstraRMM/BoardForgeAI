export function BomVerificationTable({ rows = [] }: { rows?: any[] }) {
  const sample = rows.length ? rows : [
    { Ref: 'R?', MPN: 'BOM not verified yet', Manufacturer: 'Not verified', digiKeyPartNumber: 'Not verified yet', matchType: 'Waiting for supplier check', sourcingStatus: 'Supplier lookup not run', stockStatus: 'Not verified', quantityAvailable: '', unitPrice: '', lifecycleStatus: 'Not verified', rohsStatus: 'Not verified', datasheetUrl: '', liveStatus: 'Not verified yet', risk: 'Run supplier verification', nextAction: 'Start sourcing verification' },
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
              <td className="p-2">{humanize(row.Manufacturer || row.manufacturer || 'Not verified')}</td>
              <td className="p-2 font-mono">{humanize(row.digiKeyPartNumber || row.digikeyPartNumber || row.selected?.digiKeyPartNumber || 'Not verified yet')}</td>
              <td className="p-2">{humanize(row.matchType || row.sourcingStatus || 'Waiting for supplier check')}</td>
              <td className="p-2">{humanize(row.stockStatus || 'Not verified')}</td>
              <td className="p-2">{row.quantityAvailable || ''}</td>
              <td className="p-2">{row.unitPrice || ''}</td>
              <td className="p-2">{humanize(row.lifecycleStatus || 'Not verified')}</td>
              <td className="p-2">{humanize(row.rohsStatus || 'Not verified')}</td>
              <td className="p-2">{row.datasheetUrl ? 'Datasheet linked' : humanize(row.liveStatus || 'Not verified yet')}</td>
              <td className="p-2">{humanize(row.risk || row.sourcingStatus || 'Run supplier verification')}</td>
              <td className="p-2">{humanize(row.nextAction || 'Review report')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function humanize(value: string) {
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

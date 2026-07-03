export function DownloadsPanel({ zip }: { zip?: string }) {
  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Downloads Center</h2>
      <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
        {['Gerbers', 'Drill', 'BOM', 'CPL', 'Reports', 'Manifest', 'Engine Run Log', 'CLI Replay'].map((item) => <span key={item} className="rounded bg-slate-950 px-2 py-1 text-slate-200">{item}</span>)}
      </div>
      <p className="mt-3 text-sm text-slate-300">{zip || 'Manufacturing ZIP appears only when strict gates pass.'}</p>
    </section>
  )
}

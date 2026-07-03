export function EnvironmentCheckCard({ name, status, detail }: { name: string; status: string; detail: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-100">{name}</h3>
        <span className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200">{status}</span>
      </div>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </div>
  )
}

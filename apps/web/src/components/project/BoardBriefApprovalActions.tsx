export function BoardBriefApprovalActions() {
  return (
    <section className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
      <p className="text-xs uppercase tracking-wide text-emerald-300">Approval actions</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded border border-emerald-400/40 px-2 py-1 text-emerald-100">Approve brief</span>
        <span className="rounded border border-red-400/40 px-2 py-1 text-red-100">Reject brief</span>
        <span className="rounded border border-slate-600 px-2 py-1 text-slate-200">Request revision</span>
        <span className="rounded border border-cyan-400/40 px-2 py-1 text-cyan-100">Create local candidate</span>
      </div>
      <p className="mt-3 text-xs text-emerald-100">Actions are local CLI-backed artifacts. Publish still requires explicit confirmation.</p>
    </section>
  )
}

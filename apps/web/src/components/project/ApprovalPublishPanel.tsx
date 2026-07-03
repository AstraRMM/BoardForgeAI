export function ApprovalPublishPanel() {
  return (
    <section className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
      <h2 className="text-lg font-semibold text-cyan-100">Approval and Publish Gate</h2>
      <p className="mt-2 text-sm text-cyan-100/80">Local drafts and candidates stay hidden. Publishing requires explicit confirmation and approved-only sync.</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded border border-slate-500 px-2 py-1">Keep Local</span>
        <span className="rounded border border-slate-500 px-2 py-1">Archive</span>
        <span className="rounded border border-cyan-300 px-2 py-1">Publish with Confirm</span>
      </div>
    </section>
  )
}

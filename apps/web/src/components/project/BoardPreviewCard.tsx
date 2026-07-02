export function BoardPreviewCard({ previewPath, projectState, manufacturingZip }: { previewPath: string; projectState: string; manufacturingZip: string }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-cyan-300">Board preview</p>
      <p className="mt-2 text-sm text-slate-300">Preview artifact: {previewPath}</p>
      <p className="mt-1 text-sm text-slate-300">Project state: {projectState}</p>
      <p className="mt-1 text-sm text-slate-300">Manufacturing ZIP: {manufacturingZip || 'not exported'}</p>
    </section>
  )
}

export function BoardPreviewCard({ previewPath, projectState, manufacturingZip }: { previewPath: string; projectState: string; manufacturingZip: string }) {
  const previewStatus = previewPath ? 'Preview evidence available' : 'Preview pending'
  const state = humanize(projectState || 'local review')
  const packageStatus = manufacturingZip ? 'Manufacturing package evidence recorded' : 'Manufacturing package not exported'
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-cyan-300">Board preview</p>
      <p className="mt-2 text-sm text-slate-300">Preview: {previewStatus}</p>
      <p className="mt-1 text-sm text-slate-300">Project state: {state}</p>
      <p className="mt-1 text-sm text-slate-300">Package: {packageStatus}</p>
    </section>
  )
}

function humanize(value: string) {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

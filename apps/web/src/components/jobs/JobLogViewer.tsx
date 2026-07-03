import type { BoardForgeJobStatus } from '../../lib/boardforge-job-client'

export function JobLogViewer({ job }: { job: BoardForgeJobStatus }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">Latest job log</p>
      <div className="mt-2 space-y-1 text-xs text-slate-300">
        {job.logs.map((entry, index) => (
          <p key={`${entry.timestamp}-${index}`}><span className="font-mono text-slate-500">{entry.timestamp}</span> {entry.message}</p>
        ))}
      </div>
    </div>
  )
}

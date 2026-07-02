import type { BoardForgeIntakeSummary } from '../../lib/boardforge-intake'

export function BoardBriefPanel({ intake }: { intake: BoardForgeIntakeSummary }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-xl font-semibold">Board Brief Preview</h2>
      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <div><dt className="text-slate-400">Prompt</dt><dd>{intake.prompt}</dd></div>
        <div><dt className="text-slate-400">Inferred type</dt><dd className="font-mono">{intake.boardType}</dd></div>
        <div><dt className="text-slate-400">Approval gate</dt><dd className="font-mono">brief_pending_approval</dd></div>
        <div><dt className="text-slate-400">Build status</dt><dd className="font-mono">blocked_before_approval</dd></div>
      </dl>
      <h3 className="mt-4 text-sm font-semibold text-slate-300">Assumptions</h3>
      <ul className="mt-2 grid gap-1 text-sm text-slate-300">
        {intake.assumptions.map((item) => <li key={item}>- {item}</li>)}
      </ul>
      <h3 className="mt-4 text-sm font-semibold text-slate-300">Risks</h3>
      <ul className="mt-2 grid gap-1 text-sm text-slate-300">
        {intake.risks.map((item) => <li key={item}>- {item}</li>)}
      </ul>
    </section>
  )
}

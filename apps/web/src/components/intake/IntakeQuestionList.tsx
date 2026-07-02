import type { BoardForgeIntakeSummary } from '../../lib/boardforge-intake'

export function IntakeQuestionList({ intake }: { intake: BoardForgeIntakeSummary }) {
  return (
    <section className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
      <p className="text-xs uppercase tracking-wide text-cyan-300">Minimum useful questions</p>
      <ol className="mt-3 grid gap-2 text-sm text-cyan-50">
        {intake.questionsToAsk.map((question) => (
          <li key={question} className="rounded border border-cyan-400/20 bg-slate-950/40 px-3 py-2 font-mono">
            {question}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-cyan-100">Local engine artifact. BoardForge records skipped questions and assumptions instead of asking irrelevant follow-ups.</p>
    </section>
  )
}

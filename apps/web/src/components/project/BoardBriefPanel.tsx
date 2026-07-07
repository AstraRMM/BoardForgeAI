import type { BoardForgeIntakeSummary } from '../../lib/boardforge-intake'

function humanize(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function BoardBriefPanel({ intake }: { intake: BoardForgeIntakeSummary }) {
  return (
    <section className="bf-brief-panel">
      <p className="bf-panel-kicker">Board brief</p>
      <h2>Robotics controller candidate</h2>
      <dl className="bf-brief-facts">
        <div><dt>Prompt</dt><dd>{intake.prompt}</dd></div>
        <div><dt>Detected board type</dt><dd>{humanize(intake.boardType)}</dd></div>
        <div><dt>Approval gate</dt><dd>Waiting for engineering approval</dd></div>
        <div><dt>Build state</dt><dd>Protected until the brief is accepted</dd></div>
      </dl>
      <h3>Assumptions to confirm</h3>
      <ul className="bf-token-list">
        {intake.assumptions.map((item) => <li key={item}>{humanize(item)}</li>)}
      </ul>
      <h3>Risk areas</h3>
      <ul className="bf-token-list warning">
        {intake.risks.map((item) => <li key={item}>{humanize(item)}</li>)}
      </ul>
    </section>
  )
}

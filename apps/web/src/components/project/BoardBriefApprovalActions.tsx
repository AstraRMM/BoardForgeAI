export function BoardBriefApprovalActions() {
  const actions = [
    ['Approve brief', 'Let BoardForge create the local candidate.'],
    ['Request revision', 'Refine requirements before project creation.'],
    ['Reject brief', 'Stop before any KiCad files are generated.'],
    ['Create candidate', 'Start protected local project creation after approval.'],
  ]

  return (
    <section className="bf-approval-panel">
      <p className="bf-panel-kicker">Approval gate</p>
      <h2>Nothing touches KiCad until the brief is accepted.</h2>
      <div className="bf-approval-grid">
        {actions.map(([label, body]) => (
          <button key={label} type="button">
            <strong>{label}</strong>
            <span>{body}</span>
          </button>
        ))}
      </div>
      <p>Final publish and manufacturing exports still require explicit evidence-backed confirmation.</p>
    </section>
  )
}

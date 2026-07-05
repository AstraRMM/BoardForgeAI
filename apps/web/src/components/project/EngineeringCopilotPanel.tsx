export function EngineeringCopilotPanel({ state = {} }: { state?: any }) {
  const actions = state.actions || [
    'Run DigiKey Verification if BOM data is stale.',
    'Review quote readiness warnings before assembly claims.',
    'Run Make Sourcable before approving substitutions.',
    'Publish only after explicit dashboard confirmation.',
  ]
  return (
    <section className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4">
      <h3 className="text-sm font-semibold text-amber-100">Engineering Copilot</h3>
      <p className="mt-2 text-xs text-amber-100/80">Artifact-only guidance. BoardForge explains blockers and next actions from local reports; it does not hallucinate readiness.</p>
      <ul className="mt-3 space-y-2 text-xs text-amber-50">
        {actions.map((action: string, index: number) => <li key={index} className="rounded bg-slate-950/60 p-2">{action}</li>)}
      </ul>
    </section>
  )
}

export function ProjectStateBadge({ state }: { state: string }) {
  return <Badge label="Project" value={humanizeState(state)} tone={state === 'dashboard_published' ? 'green' : 'cyan'} />
}

export function ManufacturingReadinessBadge({ state }: { state: string }) {
  const tone = state === 'PCB_FAB_READY' || state === 'ASSEMBLY_READY_VERIFIED' ? 'green' : state.startsWith('BLOCKED') ? 'amber' : 'cyan'
  return <Badge label="Manufacturing" value={humanizeState(state)} tone={tone} />
}

export function SourcingStatusBadge({ state }: { state: string }) {
  return <Badge label="Sourcing" value={humanizeState(state)} tone={state === 'API_VERIFIED' ? 'green' : 'amber'} />
}

export function LicenseStatusBadge({ devMode = true }: { devMode?: boolean }) {
  return <Badge label="License" value={devMode ? 'Desktop development license' : 'License required'} tone={devMode ? 'green' : 'amber'} />
}

function Badge({ label, value, tone }: { label: string; value: string; tone: 'green' | 'cyan' | 'amber' }) {
  const classes = {
    green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  }[tone]
  return <span className={`inline-flex rounded border px-2 py-1 text-xs ${classes}`}>{label}: {value}</span>
}

function humanizeState(value: string) {
  const labels: Record<string, string> = {
    dashboard_published: 'Published to dashboard',
    PCB_FAB_READY: 'PCB fabrication ready',
    ASSEMBLY_READY_VERIFIED: 'Assembly evidence verified',
    API_VERIFIED: 'Live supplier data verified',
    NOT_CHECKED: 'Not verified yet',
    BLOCKED: 'Blocked with evidence',
  }
  return labels[value] || value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

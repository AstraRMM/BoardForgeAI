import dashboard from '../../sample-manifests/project-dashboard.json'

export default function ReportsPage() {
  return <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100"><h1 className="text-3xl font-semibold">Reports</h1><pre className="mt-6 overflow-auto rounded-lg bg-slate-900 p-4 text-xs">{JSON.stringify(dashboard.projects.map((p) => p.reports), null, 2)}</pre></main>
}

import { AppShell } from '../../components/app/AppShell'
import { ManufacturingLocalContent } from '../../components/project/ManufacturingLocalContent'

export const dynamic = 'force-dynamic'

export default function DownloadsPage() {
  return (
    <AppShell title="Manufacturing packages" subtitle="Release evidence is shown only after local gates pass."><main className="bf-app-page">
      <section className="bf-app-hero">
      <h1 className="text-3xl font-semibold">Manufacturing release evidence</h1>
      <p className="mt-2 max-w-3xl text-slate-400">Only validation-backed manufacturing outputs are listed as ready. Blocked projects keep their reports visible but do not pretend to have shippable packages.</p>
      <p className="mt-2 max-w-3xl text-cyan-300">A paired local engine retains package files in the protected workspace. Browser download is unavailable until an explicit artifact-transfer endpoint is added.</p>
      </section>
      <ManufacturingLocalContent />
    </main></AppShell>
  )
}

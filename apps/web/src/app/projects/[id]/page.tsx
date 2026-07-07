import dashboard from '../../../sample-manifests/project-dashboard.json'
import { ProjectStatusCard } from '../../../components/ProjectStatusCard'
import { EngineStatusPanel } from '../../../components/project/EngineStatusPanel'
import { LocalEngineStatusBar } from '../../../components/project/LocalEngineStatusBar'
import { ProjectActionPanel } from '../../../components/project/ProjectActionPanel'
import { ManufacturingReadinessBadge, ProjectStateBadge, SourcingStatusBadge } from '../../../components/project/StatusBadges'
import { getBoardForgeEngineStatus } from '../../../lib/boardforge-engine-status'
import { JobStatusPanel } from '../../../components/jobs/JobStatusPanel'
import { ProjectHealthScoreCard } from '../../../components/project/ProjectHealthScoreCard'
import { BoardReviewPanel } from '../../../components/project/BoardReviewPanel'
import { ManufacturingRiskPanel } from '../../../components/project/ManufacturingRiskPanel'
import { RouteabilityPanel } from '../../../components/project/RouteabilityPanel'
import { ProjectDiffPanel } from '../../../components/project/ProjectDiffPanel'
import { AppliedLessonsPanel } from '../../../components/project/AppliedLessonsPanel'
import { DownloadsPanel } from '../../../components/project/DownloadsPanel'
import { ApprovalPublishPanel } from '../../../components/project/ApprovalPublishPanel'
import { BoardPreviewCard } from '../../../components/project/BoardPreviewCard'
import { BlockerReportPanel } from '../../../components/project/BlockerReportPanel'
import { VariantComparisonPanel } from '../../../components/project/VariantComparisonPanel'
import { MakeManufacturableReportPanel } from '../../../components/project/MakeManufacturableReportPanel'
import { ProjectTimelinePanel } from '../../../components/project/ProjectTimelinePanel'
import { SourcingCommandCenter } from '../../../components/project/SourcingCommandCenter'
import { EngineeringCopilotPanel } from '../../../components/project/EngineeringCopilotPanel'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = dashboard.projects.find((item) => item.projectId === id) || dashboard.projects[0]
  const engineStatus = getBoardForgeEngineStatus(id)
  const publishState = (project as any).projectState || (project as any).publish?.projectState || 'local review'
  const syncStatus = (project as any).syncStatus || (project as any).publish?.syncStatus || 'review pending'
  const reports = project.reports || {}
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <LocalEngineStatusBar />
      <div className="mt-4 flex flex-wrap gap-2">
        <ProjectStateBadge state={(project as any).projectState || (project as any).publish?.projectState || 'local_draft'} />
        <ManufacturingReadinessBadge state={project.manufacturing.ready ? 'PCB_FAB_READY' : 'BLOCKED_DRC'} />
        <SourcingStatusBadge state="NOT_CHECKED" />
      </div>
      <ProjectStatusCard project={project as any} />
      <EngineStatusPanel status={engineStatus} />
      <div className="mt-6">
        <ProjectActionPanel />
      </div>
      <div className="mt-6">
        <JobStatusPanel />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <ProjectHealthScoreCard />
        <BoardReviewPanel />
        <ManufacturingRiskPanel />
        <RouteabilityPanel />
        <ProjectDiffPanel />
        <AppliedLessonsPanel />
        <BlockerReportPanel />
        <VariantComparisonPanel />
        <MakeManufacturableReportPanel />
        <ProjectTimelinePanel />
        <EngineeringCopilotPanel />
      </div>
      <div className="mt-6">
        <SourcingCommandCenter project={project as any} />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <BoardPreviewCard previewPath={(project as any).preview || 'BoardForge_Board_Preview.svg'} projectState={(project as any).projectState || (project as any).publish?.projectState || 'local_draft'} manufacturingZip={project.manufacturing.zip || ''} />
        <DownloadsPanel zip={project.manufacturing.zip || undefined} />
      </div>
      <div className="mt-6">
        <ApprovalPublishPanel />
      </div>
      <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-xl font-semibold">Reports</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {Object.entries(reports).map(([label, value]) => (
            <div key={label} className="rounded border border-slate-800 bg-slate-950 p-3">
              <dt className="text-sm text-cyan-300">{humanize(label)}</dt>
              <dd className="mt-1 text-sm text-slate-300">{humanize(String(value))}</dd>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-6 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
        <h2 className="text-xl font-semibold">Board Brief and Approval</h2>
        <p className="mt-2 text-sm text-cyan-100">
          BoardForge creates a local board brief before KiCad generation. The build is blocked until the brief is approved or an explicit dev/test bypass is used.
        </p>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div><dt className="text-cyan-300">Project state</dt><dd>{humanize(publishState)}</dd></div>
          <div><dt className="text-cyan-300">Dashboard visible</dt><dd>{Boolean((project as any).dashboardVisible || (project as any).publish?.dashboardVisible) ? 'Visible after approval' : 'Private review only'}</dd></div>
          <div><dt className="text-cyan-300">Publish approval</dt><dd>{Boolean((project as any).publishApproved || (project as any).publish?.publishApproved) ? 'Approved' : 'Awaiting approval'}</dd></div>
          <div><dt className="text-cyan-300">Sync status</dt><dd>{humanize(syncStatus)}</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded border border-cyan-400/40 px-2 py-1 text-cyan-100">Publish to Dashboard</span>
          <span className="rounded border border-slate-600 px-2 py-1 text-slate-200">Keep Local</span>
          <span className="rounded border border-red-400/40 px-2 py-1 text-red-100">Reject Brief</span>
          <span className="rounded border border-slate-600 px-2 py-1 text-slate-200">Archive</span>
          <span className="rounded border border-slate-600 px-2 py-1 text-slate-200">Revise / Rerun</span>
        </div>
      </section>
      <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-xl font-semibold">Local Replay</h2>
        <p className="mt-2 text-sm text-slate-400">Re-run is available from the protected local workflow. The web app does not fake cloud execution or expose project paths.</p>
        <p className="mt-3 rounded bg-slate-950 p-3 text-sm text-emerald-300">Protected local action available after desktop helper pairing.</p>
      </section>
      <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-xl font-semibold">Manufacturing Download</h2>
        <p className="mt-2 text-sm text-slate-300">
          {project.manufacturing.ready ? 'Manufacturing package evidence is recorded in the protected local workspace.' : humanize(project.manufacturing.blockedReason || 'No manufacturing package yet')}
        </p>
      </section>
    </main>
  )
}

function humanize(value: string) {
  return value
    .replace(/[A-Z]:\\[^ ]+/g, 'local project workspace')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

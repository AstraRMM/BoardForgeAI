'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { ProjectStatusCard } from '../ProjectStatusCard'
import { filterDashboardPublishedProjects, filterLocalDraftProjects } from '../../lib/boardforge-manifest'
import { LocalProjectDataNotice, useLocalProjectDashboard } from './LocalProjectDashboard'

export function ProjectsLocalContent() {
  const { state, data, message, refresh } = useLocalProjectDashboard()
  const projects = data?.projects || []
  const publishedProjects = filterDashboardPublishedProjects(projects)
  const localDrafts = filterLocalDraftProjects(projects)

  return <>
    <LocalProjectDataNotice state={state} message={message} onRetry={refresh} />
    {projects.length > 0 && <>
      <section className="bf-project-grid">
        {projects.map((project) => <div key={project.projectId} className="bf-project-card-wrap"><ProjectStatusCard project={project} /><Link href={`/projects/${encodeURIComponent(project.projectId)}`} className="bf-project-open">Open project workspace <ArrowUpRight size={15} /></Link></div>)}
      </section>
      <section className="bf-app-section">
        <div className="bf-premium-panel">
          <h2>Publication state</h2>
          <p>{publishedProjects.length} project{publishedProjects.length === 1 ? '' : 's'} approved and visible in the dashboard. Local candidates remain private until a human explicitly approves publication.</p>
          <span className="bf-mini-badge">{localDrafts.length} local-only candidate{localDrafts.length === 1 ? '' : 's'} awaiting approval</span>
        </div>
      </section>
    </>}
    {state === 'empty' && <section className="bf-app-section"><div className="bf-premium-panel"><h2>Start with a local project</h2><p>Create a board brief or inspect an existing KiCad project. BoardForge will show it here only after a local project artifact is written.</p><div className="bf-workspace-actions"><Link href="/new-board">Create board brief <ArrowUpRight size={15} /></Link><Link className="is-secondary" href="/upload-kicad">Inspect KiCad</Link></div></div></section>}
  </>
}

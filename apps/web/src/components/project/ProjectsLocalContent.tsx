'use client'

import Link from 'next/link'
import { Archive, ArchiveRestore, ArrowUpRight, Copy, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ProjectStatusCard } from '../ProjectStatusCard'
import { filterDashboardPublishedProjects, filterLocalDraftProjects } from '../../lib/boardforge-manifest'
import type { BoardForgeDashboardCard } from '../../lib/boardforge-manifest'
import { duplicateBrowserProject, readBrowserProjectLibraryMetadata, saveBrowserProjectLibraryMetadata, type BrowserProjectLibraryMetadata } from '../../lib/browser-project-registry'
import { LocalProjectDataNotice, useLocalProjectDashboard } from './LocalProjectDashboard'

export function ProjectsLocalContent() {
  const { state, data, message, refresh } = useLocalProjectDashboard()
  const projects = useMemo(() => data?.projects || [], [data])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('name')
  const [metadata, setMetadata] = useState<BrowserProjectLibraryMetadata>({})
  useEffect(() => { setMetadata(readBrowserProjectLibraryMetadata()) }, [])
  const publishedProjects = filterDashboardPublishedProjects(projects)
  const localDrafts = filterLocalDraftProjects(projects)
  const visibleProjects = useMemo(() => projects
    .filter((project) => matches(project, query, filter, metadata))
    .sort((left, right) => compare(left, right, sort, metadata)), [projects, query, filter, sort, metadata])
  const updateMetadata = (projectId: string, changes: { favorite?: boolean; archived?: boolean }) => {
    saveBrowserProjectLibraryMetadata(projectId, changes)
    setMetadata(readBrowserProjectLibraryMetadata())
  }
  const duplicate = (projectId: string) => {
    duplicateBrowserProject(projectId)
    refresh()
  }

  return <>
    <LocalProjectDataNotice state={state} message={message} onRetry={refresh} />
    {projects.length > 0 && <>
      <section className="bf-project-library-toolbar" aria-label="Project library controls">
        <label><span>Search saved projects</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, ID, or recorded status" /></label>
        <label><span>Show</span><select value={filter} onChange={(event) => setFilter(event.target.value as Filter)}><option value="all">All active projects</option><option value="browser">Browser drafts</option><option value="favorite">Starred browser drafts</option><option value="archived">Archived browser drafts</option><option value="evidence">Recorded evidence</option><option value="package">Package location recorded</option><option value="validation">Validation not run</option></select></label>
        <label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="name">Project name</option><option value="favorite">Starred first</option><option value="readiness">Readiness</option><option value="release">Release state</option></select></label>
      </section>
      <p className="bf-project-library-count">Showing {visibleProjects.length} of {projects.length} saved project{projects.length === 1 ? '' : 's'} in this browser.</p>
      <section className="bf-project-grid">
        {visibleProjects.map((project) => {
          const browserProject = isBrowserProject(project)
          const organization = metadata[project.projectId]
          return <div key={project.projectId} className="bf-project-card-wrap"><ProjectStatusCard project={project} />
            {browserProject && <div className="bf-project-library-actions">
              <span>Stored in this browser</span>
              <button type="button" aria-pressed={Boolean(organization?.favorite)} onClick={() => updateMetadata(project.projectId, { favorite: !organization?.favorite })}><Star size={14} fill={organization?.favorite ? 'currentColor' : 'none'} />{organization?.favorite ? 'Starred' : 'Star'}</button>
              <button type="button" onClick={() => updateMetadata(project.projectId, { archived: !organization?.archived })}>{organization?.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}{organization?.archived ? 'Restore' : 'Archive'}</button>
              <button type="button" onClick={() => duplicate(project.projectId)}><Copy size={14} />Duplicate</button>
            </div>}
            <Link href={`/projects/${encodeURIComponent(project.projectId)}`} className="bf-project-open">Open project workspace <ArrowUpRight size={15} /></Link>
          </div>
        })}
      </section>
      {!visibleProjects.length && <section className="bf-app-section"><div className="bf-premium-panel"><h2>No saved projects match these controls</h2><p>Change the search or filter to return to your browser-saved project library. BoardForge does not add sample projects to fill this view.</p><button className="bf-project-library-clear" type="button" onClick={() => { setQuery(''); setFilter('all') }}>Clear controls</button></div></section>}
      <section className="bf-app-section">
        <div className="bf-premium-panel">
          <h2>Publication state</h2>
          <p>{publishedProjects.length} project{publishedProjects.length === 1 ? '' : 's'} approved and visible in the dashboard. Local candidates remain private until a human explicitly approves publication.</p>
          <span className="bf-mini-badge">{localDrafts.length} local-only candidate{localDrafts.length === 1 ? '' : 's'} awaiting approval</span>
        </div>
      </section>
    </>}
    {state === 'empty' && <section className="bf-app-section"><div className="bf-premium-panel"><h2>Start a project in this browser</h2><p>Create a board brief or register an existing KiCad project. Saved browser projects appear here immediately; pair the desktop helper later for KiCad validation and manufacturing evidence.</p><div className="bf-workspace-actions"><Link href="/new-board">Create board brief <ArrowUpRight size={15} /></Link><Link className="is-secondary" href="/import">Import KiCad</Link></div></div></section>}
  </>
}

type Filter = 'all' | 'browser' | 'favorite' | 'archived' | 'evidence' | 'package' | 'validation'
type Sort = 'name' | 'favorite' | 'readiness' | 'release'

function hasRecordedEvidence(project: BoardForgeDashboardCard) {
  return Object.keys(project.reports).some((key) => key !== 'browserDraft')
    || [project.validation.drcViolations, project.validation.ercViolations, project.validation.unconnected].some((value) => value !== null)
}

function matches(project: BoardForgeDashboardCard, query: string, filter: Filter, metadata: BrowserProjectLibraryMetadata) {
  const needle = query.trim().toLocaleLowerCase()
  const haystack = [project.projectName, project.projectId, project.status, project.nextAction].join(' ').toLocaleLowerCase()
  if (needle && !haystack.includes(needle)) return false
  const browserProject = isBrowserProject(project)
  const organization = metadata[project.projectId]
  if (filter === 'all') return !browserProject || !organization?.archived
  if (filter === 'browser') return project.status.startsWith('BROWSER_')
  if (filter === 'favorite') return browserProject && Boolean(organization?.favorite) && !organization?.archived
  if (filter === 'archived') return browserProject && Boolean(organization?.archived)
  if (filter === 'evidence') return hasRecordedEvidence(project)
  if (filter === 'package') return Boolean(project.manufacturing.zip)
  if (filter === 'validation') return [project.validation.drcViolations, project.validation.ercViolations, project.validation.unconnected].every((value) => value === null)
  return true
}

function compare(left: BoardForgeDashboardCard, right: BoardForgeDashboardCard, sort: Sort, metadata: BrowserProjectLibraryMetadata) {
  if (sort === 'favorite') return Number(Boolean(metadata[right.projectId]?.favorite)) - Number(Boolean(metadata[left.projectId]?.favorite)) || left.projectName.localeCompare(right.projectName)
  if (sort === 'readiness') return readinessOrder(left.readiness) - readinessOrder(right.readiness) || left.projectName.localeCompare(right.projectName)
  if (sort === 'release') return Number(Boolean(right.manufacturing.zip)) - Number(Boolean(left.manufacturing.zip)) || left.projectName.localeCompare(right.projectName)
  return left.projectName.localeCompare(right.projectName)
}

function readinessOrder(value: string) { return ({ ready: 0, review: 1, blocked: 2 } as Record<string, number>)[value] ?? 3 }
function isBrowserProject(project: BoardForgeDashboardCard) { return project.localOnly === true && project.status.startsWith('BROWSER_') }

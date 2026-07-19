'use client'

import Link from 'next/link'
import { ArrowUpRight, Check, Download, MonitorCog, RotateCcw, Settings2, ShieldCheck, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { exportBrowserWorkspace, mergeBrowserWorkspaceImport, readBrowserProjects } from '../../lib/browser-project-registry'

type Density = 'comfortable' | 'compact'
type Preferences = { density: Density; reduceMotion: boolean }

const preferenceKey = 'boardforge.workspace-preferences.v1'
const defaults: Preferences = { density: 'comfortable', reduceMotion: false }

function readPreferences(): Preferences {
  try {
    const saved = JSON.parse(window.localStorage.getItem(preferenceKey) || '{}') as Partial<Preferences>
    return { density: saved.density === 'compact' ? 'compact' : 'comfortable', reduceMotion: saved.reduceMotion === true }
  } catch { return defaults }
}

function applyPreferences(next: Preferences) {
  document.documentElement.dataset.bfDensity = next.density
  document.documentElement.dataset.bfReduceMotion = String(next.reduceMotion)
  window.localStorage.setItem(preferenceKey, JSON.stringify(next))
}

export function WorkspaceSettings({ authReady, missing }: { authReady: boolean; missing: string[] }) {
  const [preferences, setPreferences] = useState<Preferences>(defaults)
  const [browserProjects, setBrowserProjects] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const importInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const next = readPreferences()
    setPreferences(next)
    setBrowserProjects(readBrowserProjects().projects.length)
    applyPreferences(next)
  }, [])

  const update = (partial: Partial<Preferences>) => {
    const next = { ...preferences, ...partial }
    setPreferences(next)
    applyPreferences(next)
    setNotice('Saved to this browser.')
  }

  const reset = () => {
    setPreferences(defaults)
    applyPreferences(defaults)
    setNotice('Workspace preferences reset for this browser.')
  }

  const downloadBrowserWorkspace = () => {
    const workspace = exportBrowserWorkspace()
    const file = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'boardforge-browser-workspace.json'
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice(`Exported ${workspace.projects.length} browser-saved project${workspace.projects.length === 1 ? '' : 's'}.`)
  }

  const importBrowserWorkspace = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.json')) {
      setNotice('Choose a .json browser workspace export from BoardForge Settings.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setNotice('This export is larger than 8 MB. Split it into a smaller browser workspace export before importing.')
      return
    }
    try {
      const imported = mergeBrowserWorkspaceImport(JSON.parse(await file.text()) as unknown)
      setBrowserProjects(readBrowserProjects().projects.length)
      const changes = [`${imported.added} added`, imported.updated ? `${imported.updated} updated` : 'no duplicates']
      if (imported.ignored) changes.push(`${imported.ignored} skipped`)
      setNotice(`Browser workspace imported: ${changes.join(', ')}. KiCad validation and release evidence were not imported.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The browser workspace could not be imported. No existing project was changed.')
    }
  }

  return <div className="bf-app-page bf-settings-page">
    <section className="bf-app-hero">
      <span className="bf-kicker">Workspace configuration</span>
      <h1>Set up the workspace without pretending the browser is your desktop.</h1>
      <p>These preferences are saved in this browser. Pairing adds approved local KiCad actions; it does not upload project files or supplier credentials to this page.</p>
    </section>

    {notice && <div className="bf-settings-notice" role="status"><Check size={16} /><span>{notice}</span></div>}

    <section className="bf-settings-grid" aria-label="Browser workspace preferences">
      <article className="bf-workspace-panel bf-settings-primary">
        <div className="bf-panel-title"><div><p>Browser workspace</p><h2>Comfort and accessibility</h2></div><Settings2 size={20} /></div>
        <div className="bf-settings-control">
          <div><strong>Workspace density</strong><span>Adjust the spacing of the engineering workspace in this browser.</span></div>
          <div className="bf-settings-segmented" role="group" aria-label="Workspace density">
            {(['comfortable', 'compact'] as Density[]).map((density) => <button type="button" key={density} className={preferences.density === density ? 'is-selected' : ''} aria-pressed={preferences.density === density} onClick={() => update({ density })}>{density === 'comfortable' ? 'Comfortable' : 'Compact'}</button>)}
          </div>
        </div>
        <div className="bf-settings-control">
          <div><strong>Reduce interface motion</strong><span>Stops hover movement and non-essential transitions for this browser workspace.</span></div>
          <button type="button" className={`bf-settings-switch${preferences.reduceMotion ? ' is-on' : ''}`} onClick={() => update({ reduceMotion: !preferences.reduceMotion })} role="switch" aria-checked={preferences.reduceMotion}><span />{preferences.reduceMotion ? 'On' : 'Off'}</button>
        </div>
        <div className="bf-settings-footer"><span>Only interface preferences are stored here.</span><button type="button" onClick={reset}><RotateCcw size={14} />Reset preferences</button></div>
      </article>

      <article className="bf-workspace-panel">
        <div className="bf-panel-title"><div><p>Browser data</p><h2>Keep a portable copy</h2></div><Download size={20} /></div>
        <p className="bf-project-workspace-note">{browserProjects ? `${browserProjects} browser-saved project${browserProjects === 1 ? '' : 's'} can be exported for this browser workspace.` : 'No browser-saved projects yet. New board, import, and outline drafts appear here after you save them.'}</p>
        <div className="bf-settings-data-actions">
          <button type="button" className="bf-settings-export" onClick={downloadBrowserWorkspace}><Download size={15} />Export browser workspace</button>
          <button type="button" className="bf-settings-export" onClick={() => importInput.current?.click()}><Upload size={15} />Import browser workspace</button>
          <input ref={importInput} className="bf-visually-hidden" type="file" accept="application/json,.json" onChange={(event) => void importBrowserWorkspace(event)} />
        </div>
        <small>Import merges only browser-local projects from a Settings export. Existing browser drafts with the same project ID are updated; helper projects, validation, fabrication readiness, and account state are never imported.</small>
      </article>
    </section>

    <section className="bf-settings-grid bf-settings-integrations" aria-label="Workspace integrations">
      <article className="bf-workspace-panel">
        <div className="bf-panel-title"><div><p>Desktop helper</p><h2>Use KiCad deliberately</h2></div><MonitorCog size={20} /></div>
        <p className="bf-project-workspace-note">Pair this browser when you want approved local KiCad creation, validation, or importing. The pairing token remains session-scoped and can be disconnected.</p>
        <Link className="bf-panel-action" href="/settings/plugin">Open plugin pairing <ArrowUpRight size={15} /></Link>
      </article>
      <article className="bf-workspace-panel">
        <div className="bf-panel-title"><div><p>Account services</p><h2>{authReady ? 'Authentication is configured' : 'Authentication setup needs attention'}</h2></div><ShieldCheck size={20} /></div>
        <p className="bf-project-workspace-note">{authReady ? 'This deployment has its authentication environment configured. Billing and device records stay unavailable until their real account APIs are introduced.' : `Missing configuration: ${missing.join(', ')}. Do not rely on account-only services until setup succeeds.`}</p>
        <Link className="bf-panel-action" href="/setup">Open setup diagnostics <ArrowUpRight size={15} /></Link>
      </article>
    </section>
  </div>
}

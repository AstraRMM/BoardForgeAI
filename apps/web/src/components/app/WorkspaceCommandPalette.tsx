'use client'

import { Command, FolderKanban, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useLocalProjectDashboard } from '../project/LocalProjectDashboard'
import styles from './WorkspaceCommandPalette.module.css'

type Result = { id: string; label: string; detail: string; href: string; project?: boolean }
const commands: Result[] = [
  ['dashboard', 'Overview', 'Engineering command center', '/dashboard'],
  ['projects', 'Projects', 'Saved project library', '/projects'],
  ['new', 'New board', 'Create a reviewable board brief', '/new-board'],
  ['outlines', 'Board outlines', 'Custom Edge.Cuts workflow', '/custom-board-generator'],
  ['inspect', 'Inspect KiCad', 'Review an existing KiCad project', '/import'],
  ['manufacturing', 'Manufacturing', 'Recorded package status', '/downloads'],
  ['evidence', 'Validation evidence', 'Recorded engineering results', '/evidence'],
  ['pairing', 'Plugin pairing', 'Connect the desktop helper', '/settings/plugin'],
].map(([id, label, detail, href]) => ({ id, label, detail, href }))

export function WorkspaceCommandPalette() {
  const router = useRouter()
  const trigger = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const { state: registryState, data: registry, message: registryMessage } = useLocalProjectDashboard()

  useEffect(() => {
    const key = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((value) => !value)
      }
      if (event.key === 'Escape' && open) {
        event.preventDefault()
        setOpen(false)
        trigger.current?.focus()
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open])

  useEffect(() => {
    if (open) window.setTimeout(() => input.current?.focus(), 0)
  }, [open])

  const registryLabel = registryState === 'offline'
    ? 'browser fallback; paired helper unavailable'
    : registryState === 'loading'
      ? 'loading merged registry'
      : registryMessage || 'merged project registry'
  const projects = (registry?.projects || []).map((project) => ({
    id: `project-${project.projectId}`,
    label: project.projectName,
    detail: `${project.projectId} · ${project.sourceManifest ? 'paired helper project' : registryLabel}`,
    href: `/projects/${encodeURIComponent(project.projectId)}`,
    project: true,
  }))
  const results = [...commands, ...projects].filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(query.trim().toLowerCase()))

  useEffect(() => setActiveIndex(0), [query, open])
  useEffect(() => {
    if (activeIndex >= results.length) setActiveIndex(Math.max(results.length - 1, 0))
  }, [activeIndex, results.length])

  const close = () => {
    setOpen(false)
    trigger.current?.focus()
  }
  const choose = (item: Result) => {
    router.push(item.href)
    close()
  }
  const moveActive = (amount: number) => setActiveIndex((current) => Math.min(Math.max(current + amount, 0), Math.max(results.length - 1, 0)))
  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return }
    if (event.key === 'ArrowDown') { event.preventDefault(); moveActive(1); return }
    if (event.key === 'ArrowUp') { event.preventDefault(); moveActive(-1); return }
    if (event.key === 'Home') { event.preventDefault(); setActiveIndex(0); return }
    if (event.key === 'End') { event.preventDefault(); setActiveIndex(Math.max(results.length - 1, 0)); return }
    if (event.key === 'Enter' && results[activeIndex]) { event.preventDefault(); choose(results[activeIndex]) }
  }

  return <>
    <button ref={trigger} className={styles.trigger} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label="Search workspace">
      <Search size={16}/><span>Search</span><kbd><Command size={11}/>K</kbd>
    </button>
    {open && <div className={styles.backdrop} onMouseDown={close}>
      <section className={styles.palette} role="dialog" aria-modal="true" aria-label="Workspace commands" onMouseDown={(event) => event.stopPropagation()}>
        <label><Search size={17}/><span className="sr-only">Search commands and saved projects</span><input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onInputKeyDown} aria-controls="workspace-command-results" aria-activedescendant={results[activeIndex] ? `workspace-command-${results[activeIndex].id}` : undefined} placeholder="Search commands and saved projects"/></label>
        <div id="workspace-command-results" role="listbox">
          {results.length ? results.map((item, index) => <button id={`workspace-command-${item.id}`} key={item.id} role="option" aria-selected={index === activeIndex} className={index === activeIndex ? styles.active : undefined} type="button" onMouseMove={() => setActiveIndex(index)} onClick={() => choose(item)}><span>{item.project ? <FolderKanban size={15}/> : <Search size={15}/>}</span><div><strong>{item.label}</strong><small>{item.detail}</small></div></button>) : <p>No matching command or merged project.</p>}
        </div>
        <footer>↑↓ navigate · Enter opens · Esc closes</footer>
      </section>
    </div>}
  </>
}

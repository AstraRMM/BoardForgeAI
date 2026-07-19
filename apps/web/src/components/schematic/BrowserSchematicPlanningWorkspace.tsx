'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Cable, CircuitBoard, FilePenLine, Plus, Save, Trash2 } from 'lucide-react'
import { readBrowserProjects, recordBrowserProjectActivity, saveBrowserProject } from '../../lib/browser-project-registry'
import type { BoardForgeBrowserSchematicPlan, BoardForgeDashboardCard } from '../../lib/boardforge-manifest'
import styles from './BrowserSchematicPlanningWorkspace.module.css'

type ComponentDraft = { reference: string; value: string; notes: string }

function newPlan(projectName: string): BoardForgeBrowserSchematicPlan {
  return { schema: 'boardforge.browser-schematic-plan.v1', version: 1, title: `${projectName} concept`, updatedAt: new Date().toISOString(), notes: '', components: [], connections: [] }
}

function isBrowserProject(project: BoardForgeDashboardCard) {
  return project.localOnly === true || project.status.startsWith('BROWSER_')
}

/** Persists an intent model only. It does not parse, write, or represent KiCad source. */
export function BrowserSchematicPlanningWorkspace() {
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<BoardForgeDashboardCard[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [plan, setPlan] = useState<BoardForgeBrowserSchematicPlan | null>(null)
  const [componentDraft, setComponentDraft] = useState<ComponentDraft>({ reference: '', value: '', notes: '' })
  const [fromComponentId, setFromComponentId] = useState('')
  const [toComponentId, setToComponentId] = useState('')
  const [netName, setNetName] = useState('')
  const [notice, setNotice] = useState('')
  const selectedProject = useMemo(() => projects.find((project) => project.projectId === selectedId) || null, [projects, selectedId])

  useEffect(() => {
    const records = readBrowserProjects().projects.filter(isBrowserProject)
    setProjects(records)
    const requestedId = searchParams.get('project')
    const initial = records.find((project) => project.projectId === requestedId) || records[0] || null
    if (initial) { setSelectedId(initial.projectId); setPlan(initial.browserDraft?.schematicPlan || newPlan(initial.projectName)) }
  }, [searchParams])

  function chooseProject(projectId: string) {
    const project = projects.find((item) => item.projectId === projectId)
    if (!project) return
    setSelectedId(projectId); setPlan(project.browserDraft?.schematicPlan || newPlan(project.projectName))
    setComponentDraft({ reference: '', value: '', notes: '' }); setFromComponentId(''); setToComponentId(''); setNetName('')
    setNotice(project.browserDraft?.schematicPlan ? 'Restored the browser-local planning model.' : 'New browser-local plan. Save it to retain it in this browser.')
  }

  function addComponent() {
    if (!plan) return
    const reference = componentDraft.reference.trim(), value = componentDraft.value.trim()
    if (!reference || !value) return setNotice('Enter both a reference and a value before adding a component.')
    if (plan.components.some((component) => component.reference.toLowerCase() === reference.toLowerCase())) return setNotice(`“${reference}” is already in this plan.`)
    setPlan({ ...plan, components: [...plan.components, { id: `component-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, reference, value, notes: componentDraft.notes.trim() }] })
    setComponentDraft({ reference: '', value: '', notes: '' }); setNotice(`Added ${reference}. Save the plan to retain it.`)
  }

  function removeComponent(componentId: string) {
    if (!plan) return
    const component = plan.components.find((item) => item.id === componentId)
    setPlan({ ...plan, components: plan.components.filter((item) => item.id !== componentId), connections: plan.connections.filter((connection) => connection.fromComponentId !== componentId && connection.toComponentId !== componentId) })
    setNotice(`Removed ${component?.reference || 'component'} and its planned connections. Save the plan to retain it.`)
  }

  function addConnection() {
    if (!plan) return
    const name = netName.trim()
    if (!fromComponentId || !toComponentId || fromComponentId === toComponentId || !name) return setNotice('Choose two different components and name the planned net.')
    if (plan.connections.some((connection) => connection.fromComponentId === fromComponentId && connection.toComponentId === toComponentId && connection.netName.toLowerCase() === name.toLowerCase())) return setNotice('That planned connection already exists.')
    setPlan({ ...plan, connections: [...plan.connections, { id: `connection-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, fromComponentId, toComponentId, netName: name }] })
    setNetName(''); setNotice('Added planned connection. Save the plan to retain it.')
  }

  function savePlan() {
    if (!selectedProject || !plan) return
    const updatedAt = new Date().toISOString()
    const schematicPlan = { ...plan, title: plan.title.trim() || `${selectedProject.projectName} concept`, updatedAt }
    saveBrowserProject({ ...selectedProject, browserDraft: { ...(selectedProject.browserDraft || { schema: 'boardforge.browser-draft.v1', kind: 'board', summary: 'Browser project planning record.', updatedAt }), updatedAt, schematicPlan } })
    recordBrowserProjectActivity(selectedProject.projectId, 'schematic_plan_saved', `${schematicPlan.components.length} components, ${schematicPlan.connections.length} planned nets`)
    setProjects(readBrowserProjects().projects.filter(isBrowserProject)); setPlan(schematicPlan)
    setNotice('Browser plan saved. It is not a KiCad schematic, netlist, validation result, or source file.')
  }

  if (!projects.length) return <section className={styles.empty}><CircuitBoard size={24} /><div><p>Browser schematic planning needs a browser-saved project.</p><h1>Save a browser board, import, or outline draft first.</h1><span>This workspace never opens paired-helper projects or KiCad source files.</span><Link href="/new-board">Create browser board request</Link></div></section>
  if (!selectedProject || !plan) return null
  const componentName = (componentId: string) => plan.components.find((component) => component.id === componentId)?.reference || 'Removed component'

  return <main className={styles.workspace}>
    <section className={styles.intro}><div><span>Browser-local schematic planning</span><h1>Capture circuit intent before KiCad work.</h1><p>This persistent component-and-connection planning model is saved only in this browser. It does not read, write, validate, or claim to be a KiCad schematic.</p></div><Link href={`/projects/${encodeURIComponent(selectedProject.projectId)}`}>Open project record</Link></section>
    <section className={styles.notice} role="status"><FilePenLine size={18} /><p><strong>Planning boundary</strong> A paired desktop helper must create a KiCad candidate and run ERC. Nothing on this page changes source files.</p></section>
    <section className={styles.toolbar} aria-label="Browser schematic planning controls"><label><span>Browser project</span><select value={selectedId} onChange={(event) => chooseProject(event.target.value)}>{projects.map((project) => <option key={project.projectId} value={project.projectId}>{project.projectName}</option>)}</select></label><label><span>Plan title</span><input value={plan.title} onChange={(event) => setPlan({ ...plan, title: event.target.value })} maxLength={120} /></label><button type="button" onClick={savePlan}><Save size={15} />Save browser plan</button></section>
    {notice && <p className={styles.status} aria-live="polite">{notice}</p>}
    <section className={styles.grid}>
      <section className={styles.panel} aria-labelledby="components-title"><header><div><span>Component intent</span><h2 id="components-title">Components</h2></div><CircuitBoard size={19} /></header><div className={styles.formGrid}><label><span>Reference</span><input placeholder="U1" value={componentDraft.reference} onChange={(event) => setComponentDraft({ ...componentDraft, reference: event.target.value })} /></label><label><span>Value / role</span><input placeholder="USB-C controller" value={componentDraft.value} onChange={(event) => setComponentDraft({ ...componentDraft, value: event.target.value })} /></label><label className={styles.full}><span>Planning note</span><input placeholder="Optional constraint or reason" value={componentDraft.notes} onChange={(event) => setComponentDraft({ ...componentDraft, notes: event.target.value })} /></label><button type="button" onClick={addComponent}><Plus size={15} />Add component</button></div>{plan.components.length ? <ul className={styles.list}>{plan.components.map((component) => <li key={component.id}><div><strong>{component.reference}</strong><span>{component.value}</span>{component.notes && <small>{component.notes}</small>}</div><button type="button" aria-label={`Remove ${component.reference}`} onClick={() => removeComponent(component.id)}><Trash2 size={15} /></button></li>)}</ul> : <p className={styles.emptyCopy}>No components planned yet. Add functional blocks for a later KiCad candidate.</p>}</section>
      <section className={styles.panel} aria-labelledby="connections-title"><header><div><span>Net intent</span><h2 id="connections-title">Planned connections</h2></div><Cable size={19} /></header><div className={styles.formGrid}><label><span>From</span><select value={fromComponentId} onChange={(event) => setFromComponentId(event.target.value)}><option value="">Choose component</option>{plan.components.map((component) => <option key={component.id} value={component.id}>{component.reference} — {component.value}</option>)}</select></label><label><span>To</span><select value={toComponentId} onChange={(event) => setToComponentId(event.target.value)}><option value="">Choose component</option>{plan.components.map((component) => <option key={component.id} value={component.id}>{component.reference} — {component.value}</option>)}</select></label><label className={styles.full}><span>Net name</span><input placeholder="VBUS, I2C_SDA, POWER_EN" value={netName} onChange={(event) => setNetName(event.target.value)} /></label><button type="button" onClick={addConnection} disabled={plan.components.length < 2}><Plus size={15} />Add connection</button></div>{plan.connections.length ? <ul className={styles.list}>{plan.connections.map((connection) => <li key={connection.id}><div><strong>{connection.netName}</strong><span>{componentName(connection.fromComponentId)} → {componentName(connection.toComponentId)}</span></div><button type="button" aria-label={`Remove ${connection.netName} connection`} onClick={() => setPlan({ ...plan, connections: plan.connections.filter((item) => item.id !== connection.id) })}><Trash2 size={15} /></button></li>)}</ul> : <p className={styles.emptyCopy}>No planned connections yet. This is intent capture, not an ERC-clean netlist.</p>}</section>
    </section>
    <section className={styles.panel}><header><div><span>Engineering context</span><h2>Notes and constraints</h2></div><FilePenLine size={19} /></header><textarea value={plan.notes} onChange={(event) => setPlan({ ...plan, notes: event.target.value })} placeholder="Record power assumptions, interface behavior, decisions to validate, or questions for the KiCad candidate." rows={5} /><p className={styles.emptyCopy}>Last browser-plan save: {new Date(plan.updatedAt).toLocaleString()}. Save after edits; this data stays in local browser storage.</p></section>
  </main>
}

'use client'

import { Command, FolderKanban, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useLocalProjectDashboard } from '../project/LocalProjectDashboard'
import styles from './WorkspaceCommandPalette.module.css'

type Result = { id: string; label: string; detail: string; href: string; project?: boolean }
const commands: Result[] = [['dashboard','Overview','Engineering command center','/dashboard'],['projects','Projects','Saved project library','/projects'],['new','New board','Create a reviewable board brief','/new-board'],['outlines','Board outlines','Custom Edge.Cuts workflow','/custom-board-generator'],['inspect','Inspect KiCad','Review an existing KiCad project','/import'],['manufacturing','Manufacturing','Recorded package status','/downloads'],['evidence','Validation evidence','Recorded engineering results','/evidence'],['pairing','Plugin pairing','Connect the desktop helper','/settings/plugin']].map(([id,label,detail,href])=>({id,label,detail,href}))

export function WorkspaceCommandPalette() {
  const router = useRouter(); const trigger = useRef<HTMLButtonElement>(null); const input = useRef<HTMLInputElement>(null)
  const [open,setOpen] = useState(false); const [query,setQuery] = useState('')
  const { state: registryState, data: registry, message: registryMessage } = useLocalProjectDashboard()
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setOpen(value=>!value)}if(event.key==='Escape'&&open){event.preventDefault();setOpen(false);trigger.current?.focus()}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[open])
  useEffect(()=>{if(open) window.setTimeout(()=>input.current?.focus(),0)},[open])
  const registryLabel = registryState === 'offline' ? 'browser fallback; paired helper unavailable' : registryState === 'loading' ? 'loading merged registry' : registryMessage || 'merged project registry'
  const projects = (registry?.projects || []).map(project=>({id:`project-${project.projectId}`,label:project.projectName,detail:`${project.projectId} · ${project.sourceManifest ? 'paired helper project' : registryLabel}`,href:`/projects/${encodeURIComponent(project.projectId)}`,project:true}))
  const results=[...commands,...projects].filter(item=>`${item.label} ${item.detail}`.toLowerCase().includes(query.trim().toLowerCase()))
  const choose=(item:Result)=>{router.push(item.href);setOpen(false);trigger.current?.focus()}
  return <><button ref={trigger} className={styles.trigger} type="button" onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label="Search workspace"><Search size={16}/><span>Search</span><kbd><Command size={11}/>K</kbd></button>{open&&<div className={styles.backdrop} onMouseDown={()=>{setOpen(false);trigger.current?.focus()}}><section className={styles.palette} role="dialog" aria-modal="true" aria-label="Workspace commands" onMouseDown={event=>event.stopPropagation()}><label><Search size={17}/><span className="sr-only">Search commands and saved projects</span><input ref={input} value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus()}}} placeholder="Search commands and saved projects"/></label><div role="listbox">{results.length?results.map(item=><button key={item.id} role="option" type="button" onClick={()=>choose(item)}><span>{item.project?<FolderKanban size={15}/>:<Search size={15}/>}</span><div><strong>{item.label}</strong><small>{item.detail}</small></div></button>):<p>No matching command or merged project.</p>}</div><footer>Esc closes · Click a result to open</footer></section></div>}</>
}

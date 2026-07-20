'use client'

import Link from 'next/link'
import { FileUp, Files } from 'lucide-react'
import { ChangeEvent, useRef, useState } from 'react'
import { createBrowserProject, saveBrowserProject } from '../../lib/browser-project-registry'

export function ImportKiCadWizard() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [saved, setSaved] = useState(false)
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null)
  const [message, setMessage] = useState('Choose the KiCad files you want to register in this browser. Source files stay on your device.')

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || [])
    const supported = selected.filter((file) => /\.(kicad_pcb|kicad_sch|kicad_pro|kicad_prl)$/i.test(file.name))
    setFiles(supported)
    setSaved(false)
    setSavedProjectId(null)
    setMessage(supported.length ? `${supported.length} KiCad file${supported.length === 1 ? '' : 's'} ready to register.` : 'Choose at least one .kicad_pcb, .kicad_sch, or .kicad_pro file.')
  }

  function saveImport() {
    if (!files.length) return
    const projectFile = files.find((file) => /\.kicad_pro$/i.test(file.name)) || files[0]
    const name = projectFile.name.replace(/\.kicad_(pcb|sch|pro|prl)$/i, '') || 'Imported KiCad project'
    const fileList = files.map((file) => `${file.name} (${Math.ceil(file.size / 1024)} KB)`).join(', ')
    const projectId = `browser-import-${Date.now().toString(36)}`
    saveBrowserProject(createBrowserProject({
      projectId,
      projectName: name,
      prompt: `Browser-registered KiCad files: ${fileList}`,
      kind: 'browser_import',
    }))
    setSaved(true)
    setSavedProjectId(projectId)
    setMessage('Saved to Projects in this browser. BoardForge has not uploaded, copied, parsed, or modified the source files.')
  }

  return <section className="bf-workspace-panel" aria-labelledby="import-launch-state">
    <div className="bf-panel-title"><div><p>Browser project registration</p><h2 id="import-launch-state">Add an existing KiCad project to this workspace.</h2></div></div>
    <p className="bf-project-workspace-note">Select project files to create a browser-local project record. This is useful for organizing work before pairing; it does not upload files or claim a sandbox copy, validation, repair, or manufacturing evidence.</p>
    <div className="bf-import-file-control">
      <input ref={fileInputRef} id="kicad-files" className="bf-visually-hidden" type="file" accept=".kicad_pcb,.kicad_sch,.kicad_pro,.kicad_prl" multiple onChange={selectFiles} />
      <div className="bf-import-file-copy"><span className="bf-import-file-icon"><Files size={18} /></span><span><strong>KiCad project files</strong><small>Choose .kicad_pro, .kicad_pcb, .kicad_sch, or .kicad_prl files. Nothing is uploaded.</small></span></div>
      <button type="button" className="bf-import-file-button" onClick={() => fileInputRef.current?.click()}><FileUp size={16} />Choose files</button>
    </div>
    {files.length > 0 && <ul className="bf-import-file-list">{files.map((file) => <li key={`${file.name}-${file.size}`}>{file.name}<small>{Math.ceil(file.size / 1024)} KB</small></li>)}</ul>}
    <div className="bf-button-row"><button type="button" className="bf-action bf-action-primary" onClick={saveImport} disabled={!files.length || saved}>{saved ? 'Saved to Projects' : 'Save browser project'}</button>{savedProjectId && <Link href={`/projects/${encodeURIComponent(savedProjectId)}`} className="bf-action bf-action-secondary">Open saved project</Link>}<Link href="/projects" className="bf-action bf-action-secondary">All projects</Link><Link href="/settings/plugin" className="bf-action bf-action-secondary">Pair for KiCad validation</Link></div>
    <p className="bf-project-workspace-note" aria-live="polite">{message}</p>
  </section>
}

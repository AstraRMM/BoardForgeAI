'use client'

import Link from 'next/link'
import { ChangeEvent, useState } from 'react'
import { createBrowserProject, saveBrowserProject } from '../../lib/browser-project-registry'

export function ImportKiCadWizard() {
  const [files, setFiles] = useState<File[]>([])
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState('Choose the KiCad files you want to register in this browser. Source files stay on your device.')

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || [])
    const supported = selected.filter((file) => /\.(kicad_pcb|kicad_sch|kicad_pro|kicad_prl)$/i.test(file.name))
    setFiles(supported)
    setSaved(false)
    setMessage(supported.length ? `${supported.length} KiCad file${supported.length === 1 ? '' : 's'} ready to register.` : 'Choose at least one .kicad_pcb, .kicad_sch, or .kicad_pro file.')
  }

  function saveImport() {
    if (!files.length) return
    const projectFile = files.find((file) => /\.kicad_pro$/i.test(file.name)) || files[0]
    const name = projectFile.name.replace(/\.kicad_(pcb|sch|pro|prl)$/i, '') || 'Imported KiCad project'
    const fileList = files.map((file) => `${file.name} (${Math.ceil(file.size / 1024)} KB)`).join(', ')
    saveBrowserProject(createBrowserProject({
      projectId: `browser-import-${Date.now().toString(36)}`,
      projectName: name,
      prompt: `Browser-registered KiCad files: ${fileList}`,
      kind: 'browser_import',
    }))
    setSaved(true)
    setMessage('Saved to Projects in this browser. BoardForge has not uploaded, copied, parsed, or modified the source files.')
  }

  return <section className="bf-workspace-panel" aria-labelledby="import-launch-state">
    <div className="bf-panel-title"><div><p>Browser project registration</p><h2 id="import-launch-state">Add an existing KiCad project to this workspace.</h2></div></div>
    <p className="bf-project-workspace-note">Select project files to create a browser-local project record. This is useful for organizing work before pairing; it does not upload files or claim a sandbox copy, validation, repair, or manufacturing evidence.</p>
    <label className="bf-import-file-control" htmlFor="kicad-files"><span>KiCad files</span><input id="kicad-files" type="file" accept=".kicad_pcb,.kicad_sch,.kicad_pro,.kicad_prl" multiple onChange={selectFiles} /></label>
    {files.length > 0 && <ul className="bf-import-file-list">{files.map((file) => <li key={`${file.name}-${file.size}`}>{file.name}<small>{Math.ceil(file.size / 1024)} KB</small></li>)}</ul>}
    <div className="bf-button-row"><button type="button" className="bf-new-board-primary" onClick={saveImport} disabled={!files.length || saved}>{saved ? 'Saved to Projects' : 'Save browser project'}</button><Link href="/settings/plugin" className="bf-new-board-secondary">Pair for KiCad validation</Link></div>
    <p className="bf-project-workspace-note" aria-live="polite">{message}</p>
  </section>
}

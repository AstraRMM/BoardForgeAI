'use client'

import { BotMessageSquare, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { callBoardForgeLocalEngine } from '../../lib/boardforge-local-artifact-client'

type CopilotBriefing = {
  generatedAt: string
  actions: string[]
  hallucinationPolicy: 'artifact_only' | string
}

type CopilotEnvelope = {
  ok?: boolean
  data?: CopilotBriefing
  errors?: Array<{ message?: string }>
}

/**
 * A narrow, reviewable local-engine briefing. It intentionally has no prompt
 * box: the helper can explain current artifacts, but it cannot safely invent
 * design intent or make unapproved edits.
 */
export function ProjectEngineeringCopilot({ projectId }: { projectId: string }) {
  const [briefing, setBriefing] = useState<CopilotBriefing | null>(null)
  const [message, setMessage] = useState('')
  const [running, setRunning] = useState(false)

  const createBriefing = async () => {
    setRunning(true)
    setMessage('Reading current local project evidence…')
    try {
      const response = await callBoardForgeLocalEngine(`/project/${encodeURIComponent(projectId)}/copilot`, { method: 'POST' }) as CopilotEnvelope
      if (!response.ok || !response.data || !Array.isArray(response.data.actions)) {
        setBriefing(null)
        setMessage(response.errors?.[0]?.message || 'The paired helper did not return an engineering briefing.')
        return
      }
      setBriefing(response.data)
      setMessage('Current evidence reviewed. This briefing did not change the project.')
    } catch {
      setBriefing(null)
      setMessage('The paired helper is not reachable. Connect it to create an artifact-backed briefing.')
    } finally {
      setRunning(false)
    }
  }

  return <section className="bf-workspace-panel bf-project-workspace-reports">
    <div className="bf-panel-title"><div><p>Engineering copilot</p><h2>Evidence-backed next actions</h2></div><BotMessageSquare size={20} /></div>
    <p className="bf-project-workspace-note">Review current local project artifacts for the next engineering step. This creates a local report only; it does not edit the board, select parts, or claim validation results.</p>
    <div className="bf-browser-project-actions"><button type="button" onClick={() => void createBriefing()} disabled={running}>{running ? 'Reviewing evidence…' : briefing ? 'Refresh briefing' : 'Review next actions'} {running && <RefreshCw className="bf-spin" size={14} />}</button></div>
    {message && <p className="bf-project-workspace-note" role="status">{message}</p>}
    {briefing && <dl className="bf-project-reports-list"><div><dt>Report policy</dt><dd>{briefing.hallucinationPolicy === 'artifact_only' ? 'Artifact-backed only' : briefing.hallucinationPolicy}</dd></div><div><dt>Generated</dt><dd>{new Date(briefing.generatedAt).toLocaleString()}</dd></div></dl>}
    {briefing && <ol className="bf-workspace-checklist">{briefing.actions.map((action) => <li key={action}><span className="is-waiting" />{action}</li>)}</ol>}
  </section>
}

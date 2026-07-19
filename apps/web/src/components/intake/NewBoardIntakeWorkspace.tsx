'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { callBoardForgeLocalEngine, checkBoardForgeLocalEngine, localArtifactApiContract } from '../../lib/boardforge-local-artifact-client'
import { saveBrowserProject } from '../../lib/browser-project-registry'
import type { BoardForgeDashboardCard } from '../../lib/boardforge-manifest'

type IntakeSession = {
  sessionId?: string
  originalPrompt?: string
  boardType?: string
  currentStage?: string
  questionsToAsk?: string[]
  assumptions?: string[]
  risks?: string[]
  approvalStatus?: string
  projectState?: string
}

type BoardBrief = {
  boardPurpose?: string
  boardType?: string
  selectedArchitecture?: string[]
  assumptions?: string[]
  boardOutlinePlan?: string
  connectorPlan?: string
  powerPlan?: string
  manufacturingTarget?: string
  briefApproved?: boolean
}

type EngineResponse = {
  ok?: boolean
  status?: string
  data?: { projectId?: string; session?: IntakeSession; brief?: BoardBrief; projectCreated?: boolean; projectState?: string; blockers?: string[] }
  errors?: Array<{ message?: string }>
}

const starterPrompt = ''

export function NewBoardIntakeWorkspace() {
  const [prompt, setPrompt] = useState(starterPrompt)
  const [projectId] = useState(() => `intake-${Date.now().toString(36)}`)
  const [session, setSession] = useState<IntakeSession | null>(null)
  const [brief, setBrief] = useState<BoardBrief | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('Describe the board you want to build. BoardForge will ask only the requirements it cannot safely infer.')
  const [error, setError] = useState('')
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [candidateCreated, setCandidateCreated] = useState(false)
  const [browserDraftSaved, setBrowserDraftSaved] = useState(false)

  const questions = useMemo(() => session?.questionsToAsk || [], [session])
  const approved = session?.approvalStatus === 'approved'

  const run = async (action: 'start' | 'answer' | 'generate' | 'approve' | 'create') => {
    setError('')
    setBusyAction(action)
    try {
      const health = await checkBoardForgeLocalEngine()
      if (!health?.ok) throw new Error(localArtifactApiContract.offlineDisplayMessage)

      const request = action === 'start'
        ? { path: '/intake/start', body: { prompt: prompt.trim(), projectId } }
        : action === 'answer'
          ? { path: '/intake/answer', body: { projectId, answers: answeredValues(answers) } }
          : action === 'generate'
            ? { path: '/brief/generate', body: { projectId } }
            : action === 'approve'
              ? { path: '/brief/approve', body: { projectId } }
              : { path: '/project/create', body: { projectId } }
      const response = await callBoardForgeLocalEngine(request.path, {
        method: 'POST',
        body: JSON.stringify(request.body),
      }) as EngineResponse
      const data = response.data
      if (!response.ok || !data || (action !== 'create' && !data.session)) throw new Error(response.errors?.[0]?.message || 'The local engine did not return an intake update.')

      if (data.session) setSession(data.session)
      if (data.brief) setBrief(data.brief)
      if (action === 'start') setAnswers({})
      if (action === 'create') {
        if (!data.projectCreated) throw new Error(data.blockers?.[0] || 'The approved brief did not create a local candidate.')
        setCandidateCreated(true)
        setMessage('A local KiCad candidate was created. It remains outside the dashboard until its engineering and manufacturing evidence is accepted.')
      } else {
        setMessage(messageFor(action, data.session!))
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The local intake request could not be completed.'
      if (action === 'start' && !browserDraftSaved && message === localArtifactApiContract.offlineDisplayMessage) {
        saveBrowserDraft()
        setMessage('Your board request was saved in this browser. Continue in the PCB workspace now, or pair the desktop helper later when you are ready to create and validate KiCad files.')
        return
      }
      setError(message)
    } finally {
      setBusyAction(null)
    }
  }

  const startIntake = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!prompt.trim()) { setError('Describe the board before starting intake.'); return }
    void run('start')
  }

  const submitAnswers = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!Object.keys(answeredValues(answers)).length) { setError('Answer at least one engineering question before continuing.'); return }
    void run('answer')
  }

  const saveBrowserDraft = () => {
    if (!prompt.trim()) { setError('Describe the board before saving a browser draft.'); return }
    const draft: BoardForgeDashboardCard = {
      schema: 'boardforge.project-dashboard-card.v1', projectId, projectName: browserDraftName(prompt), status: 'Browser draft — not a KiCad project',
      boardPath: null, schematicPath: null, readiness: 'review', routingCompletionPercent: 0,
      validation: { shorts: null, unconnected: null, forbiddenVias: null, drcViolations: null, ercViolations: null },
      manufacturing: { ready: false, zip: null, blockedReason: 'Browser draft has no local KiCad artifacts or manufacturing evidence.' },
      reports: { intakeSummary: browserDraftSummary(prompt) }, replayCommand: null, criticalBlockers: [{ code: 'BROWSER_DRAFT', count: 1, severity: 'review' }],
      nextAction: 'Connect the local engine to turn this browser draft into an engineering intake.', sourceManifest: null,
      honestyBadges: ['browser-saved draft', 'no KiCad files', 'validation not run'], projectState: 'local_draft', localOnly: true,
    }
    saveBrowserProject(draft)
    setBrowserDraftSaved(true)
    setError('')
    setMessage('Browser draft saved. It is a request record only; it has no KiCad files, routing, validation, or manufacturing evidence.')
  }

  return (
    <div className="bf-new-board-intake">
      <section className="bf-new-board-intake-intro">
        <div>
          <span className="bf-kicker">Browser-first engineering intake</span>
          <h1>Turn a board request into a reviewable engineering brief.</h1>
          <p>Capture a board request and save it to this workspace immediately. Pair the desktop helper only when you want BoardForge to create or validate real KiCad files.</p>
        </div>
        <div className="bf-new-board-intake-status" aria-live="polite">
          <strong>{approved ? 'Brief approved' : session ? 'Requirements in review' : 'Ready for a board request'}</strong>
          <span>{message}</span>
        </div>
      </section>

      {error && <section className="bf-workspace-alert" role="alert"><div><strong>{error === localArtifactApiContract.offlineDisplayMessage ? 'Desktop helper unavailable.' : 'Engineering intake could not continue.'}</strong><span>{error}</span></div>{!browserDraftSaved && <button type="button" onClick={saveBrowserDraft}>Save browser draft</button>}</section>}

      {!session && <section className="bf-workspace-panel bf-new-board-request-panel">
        <div className="bf-panel-title"><div><p>Board request</p><h2>What should BoardForge engineer?</h2></div></div>
        <form onSubmit={startIntake} className="bf-new-board-form">
          <label htmlFor="board-prompt">Describe the purpose, interfaces, power source, mechanical constraints, and manufacturing target you know.</label>
          <textarea id="board-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Example: a compact CAN sensor node with 24 V input, an M12 connector, and JLCPCB assembly." rows={7} disabled={busyAction !== null} />
          <div className="bf-button-row"><button className="bf-new-board-primary" type="submit" disabled={busyAction !== null}>{busyAction === 'start' ? 'Starting intake…' : 'Start engineering intake'}</button><button className="bf-new-board-secondary" type="button" onClick={saveBrowserDraft} disabled={busyAction !== null || browserDraftSaved}>{browserDraftSaved ? 'Browser draft saved' : 'Save browser draft'}</button><span>Browser drafts are request records only. The paired local engine is required for KiCad work.</span></div>
        </form>
        {browserDraftSaved && <p className="bf-new-board-draft-note">Saved in this browser only. <Link href={`/projects/${encodeURIComponent(projectId)}`}>Open this draft</Link> or <Link href="/projects">view all local drafts</Link>.</p>}
      </section>}

      {session && <>
        <section className="bf-workspace-grid">
          <article className="bf-workspace-panel">
            <div className="bf-panel-title"><div><p>Detected project class</p><h2>{humanize(session.boardType || 'board request')}</h2></div></div>
            <p className="bf-project-workspace-note">{session.originalPrompt}</p>
            <div className="bf-token-list">{(session.assumptions || []).map((item) => <span key={item}>{humanize(item)}</span>)}</div>
          </article>
          <article className="bf-workspace-panel">
            <div className="bf-panel-title"><div><p>Engineering risks to review</p><h2>{(session.risks || []).length ? 'Recorded constraints' : 'No additional risks recorded'}</h2></div></div>
            {(session.risks || []).length > 0 && <ul className="bf-new-board-risk-list">{session.risks?.map((item) => <li key={item}>{humanize(item)}</li>)}</ul>}
          </article>
        </section>

        {!approved && <section className="bf-workspace-panel bf-new-board-question-panel">
          <div className="bf-panel-title"><div><p>Minimum required review</p><h2>{questions.length ? 'Answer the remaining engineering questions.' : 'No additional questions are required.'}</h2></div></div>
          {questions.length > 0 ? <form onSubmit={submitAnswers} className="bf-new-board-form">
            <div className="bf-new-board-question-grid">{questions.map((question) => <label key={question} htmlFor={`question-${question}`}><span>{questionLabel(question)}</span><textarea id={`question-${question}`} value={answers[question] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [question]: event.target.value }))} placeholder={questionHint(question)} rows={2} disabled={busyAction !== null} /></label>)}</div>
            <div className="bf-button-row"><button className="bf-new-board-primary" type="submit" disabled={busyAction !== null}>{busyAction === 'answer' ? 'Saving answers…' : 'Save answers and continue'}</button><span>BoardForge will recompute only the questions that remain necessary.</span></div>
          </form> : <div className="bf-button-row"><button className="bf-new-board-primary" type="button" onClick={() => void run('generate')} disabled={busyAction !== null}>{busyAction === 'generate' ? 'Refreshing brief…' : 'Refresh engineering brief'}</button></div>}
        </section>}

        {brief && <section className="bf-workspace-panel bf-new-board-brief-panel">
          <div className="bf-panel-title"><div><p>Engineering brief</p><h2>{brief.briefApproved ? 'Approved local brief' : 'Review before candidate creation'}</h2></div></div>
          <div className="bf-brief-facts"><div><dt>Outline</dt><dd>{brief.boardOutlinePlan || 'Not specified'}</dd></div><div><dt>Interfaces</dt><dd>{brief.connectorPlan || 'Not specified'}</dd></div><div><dt>Power</dt><dd>{brief.powerPlan || 'Not specified'}</dd></div><div><dt>Manufacturing</dt><dd>{brief.manufacturingTarget || 'Not specified'}</dd></div></div>
          <h3>Proposed blocks</h3><div className="bf-token-list">{(brief.selectedArchitecture || []).map((item) => <span key={item}>{item}</span>)}</div>
        </section>}

        <section className="bf-workspace-panel bf-new-board-approval-panel">
          <div className="bf-panel-title"><div><p>Approval gate</p><h2>{approved ? 'Brief recorded as approved.' : 'Approve only when this brief reflects your intent.'}</h2></div></div>
          <p className="bf-project-workspace-note">Approval permits the local candidate workflow; it does not silently create a board or bypass validation.</p>
          <div className="bf-button-row"><button className="bf-new-board-primary" type="button" onClick={() => void run('approve')} disabled={busyAction !== null || approved}>{busyAction === 'approve' ? 'Approving brief…' : approved ? 'Brief approved' : 'Approve engineering brief'}</button>{!approved && <button className="bf-new-board-secondary" type="button" onClick={() => void run('generate')} disabled={busyAction !== null}>Refresh brief</button>}</div>
          {approved && <div className="bf-button-row"><button className="bf-new-board-primary" type="button" onClick={() => void run('create')} disabled={busyAction !== null || candidateCreated}>{busyAction === 'create' ? 'Creating local candidate...' : candidateCreated ? 'Local candidate created' : 'Create local candidate'}</button><span>{candidateCreated ? 'Review and validate the local KiCad project before publishing it to the dashboard.' : 'This creates an unvalidated local KiCad candidate; it does not publish or claim production readiness.'}</span></div>}
        </section>
      </>}
    </div>
  )
}

function answeredValues(values: Record<string, string>) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]).filter(([, value]) => Boolean(value)))
}

function messageFor(action: 'start' | 'answer' | 'generate' | 'approve', session: IntakeSession) {
  if (action === 'approve') return 'The engineering brief is approved locally. Candidate creation remains a separate, explicit local-engine action.'
  if (action === 'generate') return 'The engineering brief was refreshed from the recorded local intake.'
  if (action === 'answer') return (session.questionsToAsk || []).length ? 'Answers recorded. Review the remaining engineering questions.' : 'Answers recorded. The brief is ready for review.'
  return (session.questionsToAsk || []).length ? 'Intake started. Answer the engineering questions that materially affect this board.' : 'Intake started. BoardForge has enough information to prepare a brief.'
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function questionLabel(question: string) {
  return {
    controller_preference: 'Which controller family do you prefer?',
    power_input: 'What powers the board?',
    interfaces_needed: 'Which interfaces must be present?',
    board_shape: 'What board shape best fits the enclosure?',
    manufacturing_target: 'Which manufacturing target should constrain the design?',
    shape_family: 'Which outline family should BoardForge use?',
    max_dimensions: 'What is the maximum board envelope?',
    mounting_scheme: 'How must the board mount?',
    connector_edges: 'Which edges can carry connectors?',
  }[question] || `Provide the required ${humanize(question)}.`
}

function questionHint(question: string) {
  return {
    controller_preference: 'Example: STM32G4, ESP32-S3, or let BoardForge recommend one.',
    power_input: 'Example: USB-C 5 V, 24 V field supply, or single-cell Li-ion.',
    interfaces_needed: 'Example: CAN FD, I2C, UART, 6 PWM outputs.',
    manufacturing_target: 'Example: JLCPCB assembled, PCBWay, or bare Gerbers.',
    max_dimensions: 'Example: 65 mm × 45 mm, including mounting ears.',
  }[question] || 'State the engineering constraint or preference.'
}

function browserDraftSummary(prompt: string) {
  const normalized = prompt.trim().replace(/\s+/g, ' ')
  return normalized.length > 56 ? `${normalized.slice(0, 53).trim()}…` : normalized
}

function browserDraftName(value: string) {
  const words = value.trim().replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 7)
  return words.length ? words.map((word) => word[0].toUpperCase() + word.slice(1)).join(' ') : 'Untitled browser draft'
}

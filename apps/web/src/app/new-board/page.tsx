import { IntakeQuestionList } from '../../components/intake/IntakeQuestionList'
import { BoardBriefPanel } from '../../components/project/BoardBriefPanel'
import { BoardBriefApprovalActions } from '../../components/project/BoardBriefApprovalActions'
import { LocalEngineStatusBar } from '../../components/project/LocalEngineStatusBar'
import { ProjectActionPanel } from '../../components/project/ProjectActionPanel'
import { roboticsControllerIntake } from '../../lib/boardforge-intake'
import { localArtifactApiContract } from '../../lib/boardforge-local-artifact-client'

export default function NewBoardPage() {
  return <LocalActionPage title="New Board" command={roboticsControllerIntake.localArtifactCommand} />
}

function LocalActionPage({ title, command }: { title: string; command: string }) {
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-3 text-slate-400">This UI talks to the BoardForge Local Engine Service on localhost. Cloud execution is not enabled.</p>
      <p className="mt-2 text-sm text-amber-200">{localArtifactApiContract.offlineMessage}</p>
      <div className="mt-6">
        <LocalEngineStatusBar />
      </div>
      <section className="mt-6 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
        <p className="text-sm uppercase tracking-wide text-cyan-300">Premium intake flow</p>
        <p className="mt-2 text-sm text-cyan-100">Prompt intake creates a board brief first. Build is blocked until the brief is approved, and the result starts as a local candidate.</p>
      </section>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <IntakeQuestionList intake={roboticsControllerIntake} />
        <BoardBriefPanel intake={roboticsControllerIntake} />
      </div>
      <div className="mt-6">
        <BoardBriefApprovalActions />
      </div>
      <div className="mt-6">
        <ProjectActionPanel />
      </div>
      <pre className="mt-6 overflow-auto rounded-lg bg-slate-900 p-4 text-sm">{command}</pre>
    </main>
  )
}

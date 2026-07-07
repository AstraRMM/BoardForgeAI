import { IntakeQuestionList } from '../../components/intake/IntakeQuestionList'
import { BoardBriefPanel } from '../../components/project/BoardBriefPanel'
import { BoardBriefApprovalActions } from '../../components/project/BoardBriefApprovalActions'
import { LocalEngineStatusBar } from '../../components/project/LocalEngineStatusBar'
import { ProjectActionPanel } from '../../components/project/ProjectActionPanel'
import { roboticsControllerIntake } from '../../lib/boardforge-intake'

export default function NewBoardPage() {
  return <NewBoardCommandCenter />
}

function NewBoardCommandCenter() {
  return (
    <main className="bf-premium-site bf-app-page bf-new-board-page">
      <section className="bf-app-hero bf-new-board-hero">
        <div>
          <span className="bf-kicker">AI board intake</span>
          <h1>Start a real KiCad board without exposing your files.</h1>
          <p>
            BoardForge captures requirements, creates a reviewable board brief, asks only meaningful engineering questions,
            and waits for approval before the local engine creates or changes KiCad files.
          </p>
          <div className="bf-new-board-hero-actions">
            <a href="#board-brief">Review brief</a>
            <a href="/custom-board-generator">Create custom outline</a>
            <a href="/projects">View projects</a>
          </div>
        </div>
        <div className="bf-new-board-preview" aria-label="BoardForge intake preview">
          <div className="bf-new-board-preview-grid">
            {[
              ['01', 'Requirements', 'power, connectors, use case'],
              ['02', 'Board brief', 'shape, stackup, constraints'],
              ['03', 'Approval', 'human review before generation'],
              ['04', 'Local build', 'protected KiCad workspace'],
            ].map(([step, title, body]) => (
              <div key={step}>
                <small>{step}</small>
                <strong>{title}</strong>
                <span>{body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bf-app-section">
        <LocalEngineStatusBar />
      </section>

      <section className="bf-app-section bf-intake-summary">
        <p className="bf-panel-kicker">Protected workflow</p>
        <h2>Prompt intake becomes an engineering object.</h2>
        <p>
          The generator does not jump straight from prompt to unchecked files. It records the goal, unknowns, constraints,
          assumptions, and risks so the board can be reviewed before creation.
        </p>
      </section>

      <div id="board-brief" className="bf-app-grid two">
        <IntakeQuestionList intake={roboticsControllerIntake} />
        <BoardBriefPanel intake={roboticsControllerIntake} />
      </div>

      <section className="bf-app-section">
        <BoardBriefApprovalActions />
      </section>

      <section className="bf-app-section">
        <ProjectActionPanel />
      </section>
    </main>
  )
}

import { DemoProjectGallery } from '../../components/demo/DemoProjectGallery'
import { OneClickDemoButton } from '../../components/demo/OneClickDemoButton'

export default function DemoPage() {
  return (
    <main className="bf-premium-site bf-app-page bf-guided-workflow-page">
      <section className="bf-app-hero">
        <span className="bf-kicker">Guided local workflow</span>
        <h1>Run the guided workflow.</h1>
        <p>
          The guided workflow uses local artifacts and explicit evidence gates. It keeps cloud execution claims blocked
          unless the local engine, source protection, sourcing, and publish checks prove the state.
        </p>
      </section>
      <section className="bf-app-section">
        <div className="bf-premium-panel">
          <h2>Workflow package</h2>
          <p>
          The guided workflow creates a protected local package with intake evidence, brief approval, manufacturability review,
          sourcing state, and clearly labeled outputs.
          </p>
        </div>
      </section>
      <section className="bf-app-section">
        <OneClickDemoButton />
      </section>
      <section className="bf-app-section">
        <DemoProjectGallery />
      </section>
      <section className="bf-app-grid two">
        {['prompt intake', 'conditional questions', 'brief revisions', 'approval gate', 'local candidate', 'publish confirmation', 'manufacturing example', 'sourcing blocked when credentials are missing'].map((step) => (
          <div key={step} className="bf-premium-panel bf-guided-step">{step}</div>
        ))}
      </section>
    </main>
  )
}

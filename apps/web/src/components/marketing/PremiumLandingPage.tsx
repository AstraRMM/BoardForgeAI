'use client'

import { useMemo, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  CircuitBoard,
  DatabaseZap,
  Download,
  FileCheck2,
  Gauge,
  HardDrive,
  Layers3,
  LockKeyhole,
  MousePointer2,
  PackageCheck,
  PenTool,
  PlugZap,
  Radar,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react'

const productFlow = [
  ['Describe', 'Capture requirements, constraints, use case, board size, layer target, connectors, power, and risk areas.'],
  ['Generate', 'Create a board brief, KiCad-ready outline intent, starter project structure, and candidate component plan.'],
  ['Validate', 'Run local checks, DRC/ERC evidence, footprint/model resolution, source protection, and readiness gates.'],
  ['Source', 'Verify live DigiKey and Mouser data where configured. No fake stock or silent mock availability.'],
  ['Repair', 'Use Make Manufacturable and Make Sourcable to explain blockers and prepare safe local actions.'],
  ['Export', 'Package reports, downloads, and manufacturing artifacts only when evidence supports the status.'],
]

const coreTools = [
  ['AI Board Generator', 'Turn a board idea into a structured KiCad project brief and approved creation path.', CircuitBoard],
  ['Custom Board Generator', 'Design rounded boards, mounting ears, cutouts, drone stacks, odd outlines, and Edge.Cuts seeds.', PenTool],
  ['KiCad Project Import', 'Copy projects into a protected sandbox, inspect them, and keep source files untouched.', HardDrive],
  ['Make Manufacturable', 'Review DRC/ERC, placement, routing, export blockers, and repair recommendations.', Wrench],
  ['Make Sourcable', 'Audit BOM risk, supplier availability, alternatives, and quote readiness.', DatabaseZap],
  ['Live DigiKey + Mouser', 'Use configured supplier APIs for real lookup evidence with redacted local credentials.', PlugZap],
  ['JLCPCB Export Package', 'Prepare Gerbers, drill files, BOM, CPL, manifests, and limitation reports.', PackageCheck],
  ['Evidence Dashboard', 'Show proof cards for E2E, sourcing, source protection, publish gates, fixtures, and reports.', FileCheck2],
]

const proofCards = [
  ['Browser E2E', 'passed', 'Setup, demo, sourcing UI, manufacturable/sourcable flows, ranking, import protection, publish gate.'],
  ['Mouser live sourcing', 'passed', 'Mouser search lookup is available when local credentials are configured.'],
  ['DigiKey OAuth', 'configured', 'ProductInformation live lookup works when token is valid; quote depth remains separately gated.'],
  ['No fake stock', 'passed', 'Unavailable supplier data is shown as unavailable, blocked, or needs OAuth.'],
  ['Source protection', 'passed', 'Imported KiCad projects are copied to sandbox before repair or publish action.'],
  ['Approved publish gate', 'passed', 'Public/demo publish requires approved state and evidence.'],
  ['Fixtures', 'passed', 'Regression fixtures and reports are generated for alpha readiness evidence.'],
  ['Reports', 'generated', 'Evidence dashboard, launch gate, sourcing, and readiness reports are packaged.'],
]

const demoSteps = ['Generate robotics controller', 'Run Make Manufacturable', 'Run Make Sourcable', 'View evidence', 'Download package']

function AnimatedCTAButton({ href, children, variant = 'primary' }: { href: string; children: ReactNode; variant?: 'primary' | 'secondary' }) {
  return <a className={`bf-animated-button ${variant}`} href={href}>{children}</a>
}

function PremiumNav() {
  return (
    <header className="bf-nav">
      <a className="bf-brand" href="/">
        <span>BF</span>
        <strong>BoardForge AI</strong>
      </a>
      <nav aria-label="Public navigation">
        <a href="#product">Product</a>
        <a href="/new-board">Generator</a>
        <a href="#sourcing">Sourcing</a>
        <a href="/evidence">Evidence</a>
        <a href="/docs">Docs</a>
        <a href="/pricing">Pricing</a>
        <a href="/dashboard">Login</a>
      </nav>
    </header>
  )
}

function Hero3DBoard() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const transform = useMemo(() => `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`, [tilt])

  return (
    <div
      className="bf-hero-visual"
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        setTilt({
          x: ((event.clientX - rect.left) / rect.width - 0.5) * 10,
          y: -((event.clientY - rect.top) / rect.height - 0.5) * 8,
        })
      }}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div className="bf-cad-window">
        <div className="bf-window-bar"><span /><span /><span /><strong>KiCad-ready board preview</strong></div>
        <div className="bf-board-stage">
          <div className="bf-board-3d" style={{ transform }}>
            <svg viewBox="0 0 740 430" role="img" aria-label="Premium PCB rendering">
              <defs>
                <filter id="softGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path className="bf-board-base" d="M90 92 Q90 54 128 54 H288 Q318 54 336 80 L360 116 Q376 140 404 140 H612 Q650 140 650 178 V308 Q650 346 612 346 H128 Q90 346 90 308 V236 Q90 214 72 201 Q52 186 52 162 V130 Q52 106 76 101 Z" />
              <path className="bf-board-edge" d="M90 92 Q90 54 128 54 H288 Q318 54 336 80 L360 116 Q376 140 404 140 H612 Q650 140 650 178 V308 Q650 346 612 346 H128 Q90 346 90 308 V236 Q90 214 72 201 Q52 186 52 162 V130 Q52 106 76 101 Z" />
              {[132, 594].map((x) => [104, 294].map((y) => <circle key={`${x}-${y}`} className="bf-hole" cx={x} cy={y} r="18" />))}
              <rect className="bf-metal" x="94" y="182" width="72" height="48" rx="7" />
              <rect className="bf-metal" x="548" y="190" width="76" height="60" rx="7" />
              <rect className="bf-chip" x="292" y="170" width="88" height="76" rx="8" />
              <rect className="bf-chip" x="424" y="168" width="66" height="52" rx="7" />
              <rect className="bf-chip light" x="210" y="160" width="62" height="42" rx="6" />
              <rect className="bf-chip light" x="240" y="246" width="52" height="24" rx="5" />
              <rect className="bf-chip light" x="404" y="260" width="52" height="24" rx="5" />
              <rect className="bf-chip dark" x="468" y="252" width="42" height="32" rx="4" />
              {Array.from({ length: 10 }).map((_, index) => <rect key={index} className="bf-pin" x={442 + index * 15} y="106" width="8" height="64" rx="3" />)}
              {Array.from({ length: 28 }).map((_, index) => <circle key={index} className="bf-via" cx={174 + (index % 14) * 28} cy={122 + Math.floor(index / 14) * 166} r="4" />)}
              <path className="bf-trace power" d="M166 205 H242 V188 H292" />
              <path className="bf-trace" d="M380 194 H424 M336 246 V286 H510 V252 H548" />
              <path className="bf-trace" d="M272 180 L292 190 M490 194 H548" />
              <path className="bf-trace glow" filter="url(#softGlow)" d="M166 214 C228 220 250 248 292 240 M380 218 C414 236 448 238 548 220" />
              <text className="bf-silk" x="112" y="262">USB-C</text>
              <text className="bf-silk" x="304" y="266">MCU</text>
              <text className="bf-silk" x="544" y="274">RJ45</text>
              <text className="bf-silk small" x="438" y="92">DEBUG HEADER</text>
              <text className="bf-silk small" x="456" y="326">BF DEMO BOARD</text>
            </svg>
          </div>
        </div>
        <div className="bf-status-strip">
          <span>DRC/ERC checks</span>
          <span>live sourcing</span>
          <span>local engine</span>
          <span>human review</span>
        </div>
      </div>
    </div>
  )
}

function ScrollProductFlow() {
  return (
    <section className="bf-section" id="product">
      <div className="bf-section-head">
        <span className="bf-kicker">Product flow</span>
        <h2>{'Describe -> Generate -> Validate -> Source -> Repair -> Export'}</h2>
        <p>BoardForge is built around evidence gates. It does not just make a PCB looking object. It checks, sources, explains, repairs, and packages work for KiCad inspection.</p>
      </div>
      <div className="bf-flow-grid">
        {productFlow.map(([title, body], index) => (
          <article className="bf-flow-card" key={title} style={{ '--i': index } as React.CSSProperties}>
            <small>{String(index + 1).padStart(2, '0')}</small>
            <strong>{title}</strong>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function FeatureCard({ title, body, Icon }: { title: string; body: string; Icon: ComponentType<{ size?: number }> }) {
  return (
    <article className="bf-feature-card">
      <Icon size={22} />
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  )
}

function AnimatedPCBTraces() {
  return (
    <div className="bf-trace-map" aria-hidden="true">
      <span className="node n1">BOM</span>
      <span className="node n2">DigiKey</span>
      <span className="node n3">Mouser</span>
      <span className="node n4">Alternatives</span>
      <span className="node n5">Quote readiness</span>
      <svg viewBox="0 0 680 300">
        <path d="M110 150 H250 C300 150 290 72 348 72 H522" />
        <path d="M110 150 H250 C300 150 290 228 348 228 H522" />
        <path d="M250 150 H380 V150 H560" />
      </svg>
    </div>
  )
}

function SourcingNetworkAnimation() {
  return (
    <section className="bf-section bf-sourcing" id="sourcing">
      <div className="bf-section-head">
        <span className="bf-kicker">Sourcing command center</span>
        <h2>Live supplier verification without fake stock claims.</h2>
        <p>DigiKey and Mouser data is shown only when configured and verified. Missing OAuth, missing credentials, lifecycle risk, and quote blockers stay visible.</p>
      </div>
      <div className="bf-sourcing-grid">
        <AnimatedPCBTraces />
        <div className="bf-sourcing-panel">
          {[
            ['DigiKey', 'configured / OAuth-gated live lookup'],
            ['Mouser', 'live sourcing available'],
            ['Stock status', 'verified or blocked with reason'],
            ['Price breaks', 'available when supplier returns data'],
            ['Datasheets', 'linked when source provides URLs'],
            ['Quote readiness', 'reviewed before assembly claims'],
            ['Alternatives', 'ranked with drop-in risk notes'],
            ['No fake stock', 'enforced by tests'],
          ].map(([label, value]) => (
            <div key={label}><span>{label}</span><strong>{value}</strong></div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CustomOutlineShowcase() {
  const shapes = ['rounded rectangle', 'mounting ears', 'cutout', 'drone stack', 'custom polygon']
  return (
    <section className="bf-section bf-outline-showcase">
      <div>
        <span className="bf-kicker">Flagship board shape studio</span>
        <h2>Custom board outlines stay first-class.</h2>
        <p>Choose a preset, draw points, validate holes and connector edge intent, review routeability, then create an outline seed or KiCad Edge.Cuts project through the local engine.</p>
        <div className="bf-outline-controls">
          {shapes.map((shape) => <span key={shape}>{shape}</span>)}
        </div>
        <AnimatedCTAButton href="/custom-board-generator"><PenTool size={17} /> Open Custom Generator</AnimatedCTAButton>
      </div>
      <div className="bf-outline-card">
        <svg viewBox="0 0 520 320" role="img" aria-label="Custom outline preview">
          <path className="outline-board" d="M72 80 Q72 48 104 48 H270 Q302 48 318 76 L340 112 Q354 136 384 136 H444 Q472 136 472 164 V242 Q472 274 440 274 H102 Q72 274 72 244 V198 Q72 178 52 168 Q36 160 36 138 V116 Q36 92 60 86 Z" />
          <path className="outline-keepout" d="M92 118 H150 V176 H92 Z" />
          {[106, 436].map((x) => [92, 236].map((y) => <circle key={`${x}-${y}`} className="outline-hole" cx={x} cy={y} r="13" />))}
          <rect className="outline-part" x="210" y="132" width="84" height="62" rx="7" />
          <rect className="outline-part" x="366" y="160" width="62" height="42" rx="6" />
          <path className="outline-route" d="M150 148 H210 M294 164 H366 M252 194 V236 H436" />
          <text x="86" y="306">routeability score 82 / needs edge connector review</text>
        </svg>
      </div>
    </section>
  )
}

function EvidenceProofGrid() {
  return (
    <section className="bf-section" id="evidence">
      <div className="bf-section-head">
        <span className="bf-kicker">Evidence-backed alpha</span>
        <h2>Public alpha with limitations, not hand-wavy demos.</h2>
        <p>Current launch status is PUBLIC_ALPHA_SOFTWARE_READY_EXTERNAL_CERTS_PENDING. External signing and PoE review limitations are disclosed instead of buried.</p>
      </div>
      <div className="bf-proof-grid">
        {proofCards.map(([title, status, body]) => (
          <article className="bf-proof-card" key={title}>
            <BadgeCheck size={18} />
            <span>{status}</span>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function LocalEngineExplainer() {
  return (
    <section className="bf-section bf-engine-section">
      <div>
        <span className="bf-kicker">Local-first KiCad engine</span>
        <h2>The website is the command center. Your machine does the KiCad work.</h2>
        <p>The installed local engine handles project files, KiCad CLI, routing reports, DRC/ERC, manufacturing exports, source protection, and downloads in your selected workspace.</p>
      </div>
      <div className="bf-engine-chain">
        {[
          ['Website', 'briefs, dashboards, sourcing, reports'],
          ['Pairing', 'localhost connection with source protection'],
          ['Local engine', 'KiCad automation and evidence generation'],
          ['KiCad project', '.kicad_pro, .kicad_sch, .kicad_pcb, exports'],
        ].map(([label, body]) => (
          <div key={label}><ShieldCheck size={18} /><strong>{label}</strong><span>{body}</span></div>
        ))}
      </div>
    </section>
  )
}

function PublicDemoSection() {
  return (
    <section className="bf-section bf-demo-section">
      <div className="bf-section-head">
        <span className="bf-kicker">One-click demo</span>
        <h2>Run a realistic command-center path.</h2>
        <p>Generate a robotics controller demo, review manufacturability, verify sourcing status, inspect reports, and download clearly labeled artifacts.</p>
      </div>
      <div className="bf-demo-timeline">
        {demoSteps.map((step, index) => (
          <div key={step}><small>{index + 1}</small><strong>{step}</strong></div>
        ))}
      </div>
      <div className="bf-button-row">
        <AnimatedCTAButton href="/demo"><Sparkles size={17} /> Try Demo</AnimatedCTAButton>
        <AnimatedCTAButton href="/evidence" variant="secondary"><ScanLine size={17} /> View Evidence</AnimatedCTAButton>
      </div>
    </section>
  )
}

function FooterCTA() {
  return (
    <footer className="bf-footer-cta">
      <span className="bf-kicker">Start with a board idea</span>
      <h2>BoardForge turns it into a KiCad project you can inspect, validate, source, and manufacture.</h2>
      <p>Human engineering review remains required. BoardForge shows blockers, limitations, and evidence before export claims.</p>
      <div className="bf-button-row">
        <AnimatedCTAButton href="/new-board"><Zap size={17} /> Start Building</AnimatedCTAButton>
        <AnimatedCTAButton href="/custom-board-generator" variant="secondary"><MousePointer2 size={17} /> Create Custom Outline</AnimatedCTAButton>
      </div>
    </footer>
  )
}

export function PremiumLandingPage() {
  return (
    <main className="bf-premium-site">
      <PremiumNav />
      <section className="bf-hero">
        <div className="bf-hero-copy">
          <span className="bf-kicker">AI PCB engineering command center</span>
          <h1>From PCB idea to manufacturable KiCad project.</h1>
          <p>BoardForge helps you generate board briefs, create custom outlines, validate KiCad projects, verify live supplier sourcing, repair manufacturability issues, and export fabrication-ready packages.</p>
          <div className="bf-button-row">
            <AnimatedCTAButton href="/new-board"><Zap size={17} /> Start Building</AnimatedCTAButton>
            <AnimatedCTAButton href="/demo" variant="secondary"><Sparkles size={17} /> Try Demo</AnimatedCTAButton>
            <AnimatedCTAButton href="/evidence" variant="secondary"><FileCheck2 size={17} /> View Evidence</AnimatedCTAButton>
          </div>
          <div className="bf-hero-metrics">
            <span><strong>KiCad-native</strong> project output</span>
            <span><strong>Local-first</strong> source protection</span>
            <span><strong>Live sourcing</strong> where configured</span>
          </div>
        </div>
        <Hero3DBoard />
      </section>
      <ScrollProductFlow />
      <section className="bf-section">
        <div className="bf-section-head">
          <span className="bf-kicker">Core tools</span>
          <h2>The serious PCB workflow, from intake to evidence.</h2>
        </div>
        <div className="bf-feature-grid">
          {coreTools.map(([title, body, Icon]) => <FeatureCard key={title as string} title={title as string} body={body as string} Icon={Icon as any} />)}
        </div>
      </section>
      <CustomOutlineShowcase />
      <SourcingNetworkAnimation />
      <LocalEngineExplainer />
      <EvidenceProofGrid />
      <PublicDemoSection />
      <section className="bf-section bf-alpha-limitations">
        <Gauge size={22} />
        <div>
          <h2>Public alpha status: PUBLIC_ALPHA_SOFTWARE_READY_EXTERNAL_CERTS_PENDING</h2>
          <p>Limitations: public installer signing is not done, PoE compliance and safety review is external, and DigiKey live lookup requires valid OAuth/local credentials.</p>
        </div>
        <AnimatedCTAButton href="/alpha-readiness" variant="secondary"><Radar size={17} /> View launch gate</AnimatedCTAButton>
      </section>
      <FooterCTA />
    </main>
  )
}

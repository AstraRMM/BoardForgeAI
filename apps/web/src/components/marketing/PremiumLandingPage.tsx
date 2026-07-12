'use client'

import { useMemo, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  CircuitBoard,
  DatabaseZap,
  Download,
  FileCheck2,
  Gauge,
  HardDrive,
  Layers3,
  LockKeyhole,
  Menu,
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

type ProductFlowStep = [string, string, ComponentType<{ size?: number }>, string]

const productFlow: ProductFlowStep[] = [
  ['Describe', 'Capture requirements, constraints, use case, board size, layer target, connectors, power, and risk areas.', ScanLine, 'intent'],
  ['Generate', 'Create a board brief, KiCad-ready outline intent, starter project structure, and candidate component plan.', CircuitBoard, 'cad'],
  ['Validate', 'Run local checks, DRC/ERC evidence, footprint/model resolution, source protection, and readiness gates.', BadgeCheck, 'proof'],
  ['Source', 'Verify live DigiKey and Mouser data where configured. No fake stock or silent mock availability.', DatabaseZap, 'supply'],
  ['Repair', 'Use Make Manufacturable and Make Sourcable to explain blockers and prepare safe local actions.', Wrench, 'repair'],
  ['Export', 'Package reports, downloads, and manufacturing artifacts only when evidence supports the status.', PackageCheck, 'export'],
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
  ['Browser workflow', 'verified', 'Setup, guided board flow, sourcing UI, manufacturable/sourcable checks, ranking, import protection, and publish gates.'],
  ['Mouser sourcing', 'verified', 'Mouser lookup is available when local credentials are configured and the supplier returns data.'],
  ['DigiKey sourcing', 'OAuth gated', 'DigiKey lookup works when local OAuth credentials are valid; missing OAuth remains visible.'],
  ['No fake stock', 'enforced', 'Unavailable supplier data is shown as unavailable, blocked, or needs credentials.'],
  ['Source protection', 'verified', 'Imported KiCad projects are copied into a sandbox before repair or publish actions.'],
  ['Publish gate', 'verified', 'Downloads and public artifacts require approved evidence instead of optimistic claims.'],
  ['Fixture coverage', 'tracked', 'Regression fixtures prove the local engine across board categories and failure cases.'],
  ['Readiness evidence', 'packaged', 'Dashboard, launch gate, sourcing, manufacturing, and limitation evidence are generated together.'],
]

const demoSteps = ['Create board brief', 'Run Make Manufacturable', 'Run Make Sourcable', 'Inspect evidence', 'Prepare package']

const workflowMetrics = [
  ['KiCad-native', 'project structure, board outlines, reports, and exports'],
  ['Sourcing-aware', 'DigiKey/Mouser lookup evidence and alternative risk notes'],
  ['Evidence-backed', 'browser workflow, source protection, publish gates, readiness reports'],
]

function AnimatedPCBBackground() {
  return (
    <div className="bf-animated-pcb-background" aria-hidden="true">
      <span className="bf-pcb-pulse p1" />
      <span className="bf-pcb-pulse p2" />
      <span className="bf-pcb-pulse p3" />
      <svg viewBox="0 0 1440 920" preserveAspectRatio="none">
        <path d="M0 180 H240 V330 H460 C540 330 560 250 650 250 H940 V140 H1440" />
        <path d="M120 720 H360 V610 H610 C720 610 730 720 850 720 H1120 V610 H1440" />
        <path d="M0 470 H210 C310 470 300 400 420 400 H710 V510 H1000 C1090 510 1110 430 1220 430 H1440" />
        <path className="fast" d="M0 260 H330 V214 H520 V292 H820 V238 H1440" />
        <path className="fast copper" d="M145 835 H420 V792 H560 C660 792 664 858 760 858 H1030" />
        <path className="slow" d="M-20 610 H196 V555 H340 C430 555 454 650 540 650 H780 V590 H1010 V646 H1460" />
        <path className="slow copper" d="M1120 60 V188 H1268 V310 H1440 M0 812 H170 V690 H278" />
        <path className="copper" d="M80 90 H340 V168 H620 M790 830 H1030 V760 H1320" />
      </svg>
    </div>
  )
}

function BoardForgeMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? 'bf-logo-mark compact' : 'bf-logo-mark'} aria-hidden="true">
      <svg viewBox="0 0 64 64">
        <rect x="6" y="6" width="52" height="52" rx="14" />
        <path className="trace copper" d="M14 20 H28 V14 H48" />
        <path className="trace blue" d="M16 46 H28 V38 H48" />
        <path className="trace blue" d="M32 14 V50" />
        <circle cx="48" cy="14" r="4" />
        <circle cx="48" cy="38" r="4" />
        <circle cx="32" cy="50" r="4" />
        <text x="17" y="39">BF</text>
      </svg>
    </span>
  )
}

function AnimatedCTAButton({ href, children, variant = 'primary' }: { href: string; children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' }) {
  return <a className={`bf-animated-button ${variant}`} href={href}>{children}</a>
}

function PremiumNav() {
  const [open, setOpen] = useState(false)
  const links = [
    ['Product', '#product'],
    ['Generator', '/new-board'],
    ['Sourcing', '#sourcing'],
    ['Evidence', '/evidence'],
    ['Docs', '/docs'],
    ['Pricing', '/pricing'],
  ]

  return (
    <header className="bf-nav">
      <a className="bf-brand" href="/">
        <BoardForgeMark compact />
        <span className="bf-brand-copy">
          <strong>BoardForge AI</strong>
          <small>AI PCB Engineering Command Center</small>
        </span>
      </a>
      <button className="bf-nav-toggle" type="button" aria-expanded={open} aria-controls="bf-public-nav" onClick={() => setOpen((value) => !value)}>
        <Menu size={18} />
        Menu
      </button>
      <div className="bf-nav-right">
        <nav id="bf-public-nav" className={open ? 'open' : ''} aria-label="Public navigation">
          {links.map(([label, href]) => <a href={href} key={label} onClick={() => setOpen(false)}>{label}</a>)}
        </nav>
        <a className="bf-nav-cta" href="/login">Launch App</a>
      </div>
    </header>
  )
}

function Hero3DBoard() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [glare, setGlare] = useState({ x: 50, y: 44 })
  const transform = useMemo(() => `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`, [tilt])

  return (
    <div
      className="bf-hero-visual"
      style={{ '--mx': `${glare.x}%`, '--my': `${glare.y}%` } as React.CSSProperties}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width
        const y = (event.clientY - rect.top) / rect.height
        setTilt({
          x: (x - 0.5) * 13,
          y: -(y - 0.5) * 10,
        })
        setGlare({ x: x * 100, y: y * 100 })
      }}
      onMouseLeave={() => {
        setTilt({ x: 0, y: 0 })
        setGlare({ x: 50, y: 44 })
      }}
    >
      <div className="bf-cad-window">
        <div className="bf-window-bar"><span /><span /><span /><strong>KiCad-ready physical preview</strong></div>
        <div className="bf-board-stage">
          <div className="bf-board-3d" style={{ transform }}>
            <img
              className="bf-hero-pcb-render-image"
              src="/images/boardforge-hero-pcb-render.png"
              alt="Realistic BoardForge PCB render with USB-C, RJ45, debug header, mounted ICs, traces, vias, and gold-plated mounting holes"
              draggable={false}
            />
            <svg viewBox="0 0 740 430" role="img" aria-label="Premium PCB rendering">
              <defs>
                <linearGradient id="boardMask" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#0a4a2b" />
                  <stop offset="0.46" stopColor="#063a22" />
                  <stop offset="1" stopColor="#031d12" />
                </linearGradient>
                <linearGradient id="boardEdge" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#b9e4c9" />
                  <stop offset="1" stopColor="#4e7f66" />
                </linearGradient>
                <linearGradient id="metalBody" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="0.48" stopColor="#c9d0d1" />
                  <stop offset="1" stopColor="#8c9698" />
                </linearGradient>
                <linearGradient id="blackPackage" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#2d333b" />
                  <stop offset="1" stopColor="#0e1217" />
                </linearGradient>
                <filter id="boardShadow" x="-20%" y="-30%" width="140%" height="170%">
                  <feDropShadow dx="0" dy="34" stdDeviation="24" floodColor="#000000" floodOpacity="0.45" />
                </filter>
                <filter id="softGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <pattern id="maskTexture" width="18" height="18" patternUnits="userSpaceOnUse">
                  <path d="M0 9 H18 M9 0 V18" stroke="rgba(255,255,255,0.055)" strokeWidth="0.7" />
                  <circle cx="4" cy="4" r="0.8" fill="rgba(255,255,255,0.06)" />
                  <circle cx="13" cy="14" r="0.7" fill="rgba(0,0,0,0.12)" />
                </pattern>
              </defs>
              <path className="bf-board-shadow" filter="url(#boardShadow)" d="M82 106 Q82 66 122 66 H252 Q286 66 304 91 L335 136 Q354 162 388 162 H610 Q652 162 652 204 V306 Q652 348 610 348 H122 Q82 348 82 306 V250 Q82 226 62 214 Q40 200 40 170 V142 Q40 116 66 110 Z" />
              <path className="bf-board-edge-layer" d="M84 116 Q84 72 128 72 H252 Q286 72 304 97 L334 139 Q352 166 388 166 H606 Q646 166 646 206 V305 Q646 345 606 345 H128 Q88 345 88 305 V249 Q88 222 66 211 Q46 201 46 172 V145 Q46 120 70 114 Z" />
              <path className="bf-board-base" d="M84 104 Q84 60 128 60 H252 Q286 60 304 85 L334 127 Q352 154 388 154 H606 Q646 154 646 194 V293 Q646 333 606 333 H128 Q88 333 88 293 V237 Q88 210 66 199 Q46 189 46 160 V133 Q46 108 70 102 Z" />
              <path className="bf-board-texture" d="M84 104 Q84 60 128 60 H252 Q286 60 304 85 L334 127 Q352 154 388 154 H606 Q646 154 646 194 V293 Q646 333 606 333 H128 Q88 333 88 293 V237 Q88 210 66 199 Q46 189 46 160 V133 Q46 108 70 102 Z" />
              <path className="bf-copper-plane" d="M110 117 H266 L309 176 H612 V300 H120 V235 C104 223 94 211 90 195 V132 Z" />
              {[126, 594].map((x) => [106, 286].map((y) => <g key={`${x}-${y}`}><circle className="bf-hole-ring" cx={x} cy={y} r="20" /><circle className="bf-hole-core" cx={x} cy={y} r="10" /></g>))}
              {Array.from({ length: 25 }).map((_, index) => <circle key={index} className="bf-via" cx={176 + (index % 13) * 29} cy={122 + Math.floor(index / 13) * 151} r="3.8" />)}
              <path className="bf-trace power" d="M158 214 H244 V194 H294" />
              <path className="bf-trace power" d="M380 218 H456 V260 H548" />
              <path className="bf-trace signal" d="M162 236 C232 240 252 264 300 248 M383 242 C426 254 470 245 548 222" />
              <path className="bf-trace signal" d="M272 178 L295 190 M491 191 H548 M380 194 H424" />
              <path className="bf-trace signal" d="M334 247 V287 H507 V251" />
              <path className="bf-trace signal fine" d="M176 177 H210 M178 192 H208 M492 176 C512 170 530 174 548 190 M412 154 V127 H438 M258 202 C266 230 280 242 294 238" />
              <path className="bf-trace glow" filter="url(#softGlow)" d="M164 225 C225 228 250 254 294 244 M383 228 C426 242 475 238 550 218" />
              <rect className="bf-metal bf-usb-a" x="88" y="182" width="82" height="54" rx="7" />
              <rect className="bf-metal bf-rj45" x="548" y="188" width="82" height="66" rx="7" />
              <rect className="bf-chip bf-qfp" x="294" y="168" width="88" height="78" rx="7" />
              {Array.from({ length: 11 }).map((_, index) => <rect key={`q1-${index}`} className="bf-qfp-pin" x={300 + index * 7} y="157" width="4" height="11" rx="1" />)}
              {Array.from({ length: 11 }).map((_, index) => <rect key={`q2-${index}`} className="bf-qfp-pin" x={300 + index * 7} y="246" width="4" height="11" rx="1" />)}
              {Array.from({ length: 8 }).map((_, index) => <rect key={`q3-${index}`} className="bf-qfp-pin" x="283" y={176 + index * 8} width="11" height="4" rx="1" />)}
              {Array.from({ length: 8 }).map((_, index) => <rect key={`q4-${index}`} className="bf-qfp-pin" x="382" y={176 + index * 8} width="11" height="4" rx="1" />)}
              <rect className="bf-chip bf-small-ic" x="422" y="166" width="70" height="52" rx="6" />
              <rect className="bf-chip light" x="208" y="158" width="64" height="42" rx="6" />
              <rect className="bf-chip light" x="236" y="246" width="56" height="23" rx="5" />
              <rect className="bf-chip light" x="404" y="258" width="56" height="23" rx="5" />
              <rect className="bf-chip dark" x="468" y="250" width="44" height="32" rx="4" />
              <rect className="bf-chip dark slim" x="214" y="212" width="38" height="20" rx="3" />
              <rect className="bf-chip dark slim" x="512" y="270" width="38" height="20" rx="3" />
              <rect className="bf-chip dark micro" x="168" y="150" width="20" height="17" rx="2" />
              <rect className="bf-chip dark micro" x="520" y="139" width="24" height="17" rx="2" />
              <rect className="bf-chip light micro" x="452" y="292" width="25" height="12" rx="2" />
              <rect className="bf-chip light micro" x="185" y="284" width="24" height="12" rx="2" />
              <rect className="bf-crystal" x="395" y="130" width="38" height="18" rx="3" />
              {Array.from({ length: 10 }).map((_, index) => <rect key={index} className="bf-header-pin" x={442 + index * 15} y="99" width="8" height="66" rx="3" />)}
              {Array.from({ length: 10 }).map((_, index) => <rect key={`header-shadow-${index}`} className="bf-header-socket" x={438 + index * 15} y="157" width="16" height="9" rx="2" />)}
              {Array.from({ length: 8 }).map((_, index) => <rect key={`pad-${index}`} className="bf-passive" x={176 + index * 42} y={292 + (index % 2) * 8} width="24" height="8" rx="2" />)}
              {Array.from({ length: 10 }).map((_, index) => <rect key={`top-passive-${index}`} className="bf-passive small" x={188 + index * 30} y={128 + (index % 2) * 9} width="18" height="7" rx="2" />)}
              {Array.from({ length: 8 }).map((_, index) => <rect key={`decouple-${index}`} className="bf-passive cap" x={256 + (index % 4) * 42} y={150 + Math.floor(index / 4) * 105} width="15" height="8" rx="2" />)}
              {Array.from({ length: 28 }).map((_, index) => <rect key={`gold-pad-${index}`} className="bf-gold-pad" x={138 + (index % 14) * 31} y={104 + Math.floor(index / 14) * 184} width="8" height="4" rx="1.5" />)}
              <path className="bf-silk-outline" d="M112 95 H250 Q278 95 294 118 M416 181 H620 V286 H554" />
              <text className="bf-silk" x="108" y="263">USB-C</text>
              <text className="bf-silk" x="310" y="266">MCU</text>
              <text className="bf-silk" x="550" y="274">RJ45</text>
              <text className="bf-silk small" x="434" y="86">DEBUG HEADER</text>
              <text className="bf-silk small" x="450" y="322">BOARDFORGE</text>
            </svg>
          </div>
        </div>
        <div className="bf-status-strip">
          <span><strong>DRC/ERC checks</strong> local evidence</span>
          <span><strong>live sourcing</strong> DigiKey + Mouser</span>
          <span><strong>local engine</strong> protected KiCad flow</span>
          <span><strong>human review</strong> honest gates</span>
        </div>
      </div>
    </div>
  )
}

function ScrollProductFlow() {
  return (
    <section className="bf-section bf-theme-flow" id="product">
      <div className="bf-flow-shell">
        <div className="bf-section-head bf-flow-intro">
          <span className="bf-kicker">Product flow</span>
          <h2>One controlled engineering path from prompt to package.</h2>
          <p>Each gate has a specific job: capture intent, generate KiCad-ready structure, validate the board, verify supply, repair safe blockers, and export only when evidence supports it.</p>
        </div>
        <div className="bf-flow-rail" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="bf-flow-grid">
        {productFlow.map(([title, body, Icon, accent], index) => (
          <article className={`bf-flow-card ${accent}`} key={title as string} style={{ '--i': index } as React.CSSProperties}>
            <small>{String(index + 1).padStart(2, '0')}</small>
            {Icon ? <Icon size={22} /> : null}
            <strong>{title as string}</strong>
            <p>{body as string}</p>
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
    <div className="bf-sourcing-render-card" aria-label="Live supplier verification workflow diagram">
      <div className="bf-sourcing-render-stage">
        <img
          className="bf-sourcing-render-image"
          src="/images/boardforge-sourcing-command-render.png"
          alt="BoardForge sourcing command center showing BOM input, DigiKey, Mouser, stock verification, risk review, alternatives, quote readiness, datasheet links, and no fake stock evidence"
          draggable={false}
        />
        <span className="bf-sourcing-scan scan-a" />
        <span className="bf-sourcing-scan scan-b" />
        <span className="bf-sourcing-pulse pulse-a" />
        <span className="bf-sourcing-pulse pulse-b" />
        <span className="bf-sourcing-pulse pulse-c" />
      </div>
    </div>
  )
}

function SourcingNetworkAnimation() {
  return (
    <section className="bf-section bf-sourcing bf-theme-sourcing" id="sourcing">
      <div className="bf-section-head">
        <span className="bf-kicker">Sourcing command center</span>
        <h2>Live supplier verification without fake stock claims.</h2>
        <p>DigiKey and Mouser data is shown only when configured and verified. Missing OAuth, missing credentials, lifecycle risk, and quote blockers stay visible instead of being replaced with fake stock.</p>
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
    <section className="bf-section bf-outline-showcase bf-theme-outline">
      <div>
        <span className="bf-kicker">Flagship board shape studio</span>
        <h2>Custom board outlines stay first-class.</h2>
        <p>Choose a preset, draw points, validate holes and connector edge intent, review routeability, then send the outline into board creation or export a KiCad Edge.Cuts project.</p>
        <div className="bf-outline-controls">
          {shapes.map((shape) => <span key={shape}>{shape}</span>)}
        </div>
        <AnimatedCTAButton href="/custom-board-generator"><PenTool size={17} /> Open Custom Generator</AnimatedCTAButton>
      </div>
      <div className="bf-outline-card">
        <div className="bf-outline-render-stage">
          <img
            className="bf-outline-render-image"
            src="/images/boardforge-outline-render.png"
            alt="Realistic custom bare PCB outline with gold-plated mounting holes, green solder mask, and routed board contour"
            draggable={false}
          />
        </div>
        <div className="bf-outline-render-status">
          <span>Edge.Cuts-ready contour</span>
          <strong>5 holes verified inside outline</strong>
        </div>
      </div>
    </section>
  )
}

function MakeWorkflowSection() {
  return (
    <section className="bf-section bf-make-section bf-theme-repair">
      <div className="bf-section-head">
        <span className="bf-kicker">Repair workflows</span>
        <h2>Make Manufacturable and Make Sourcable turn blockers into action.</h2>
        <p>BoardForge separates PCB/manufacturing issues from BOM/sourcing risk so users know exactly what must be fixed before ordering.</p>
      </div>
      <div className="bf-make-grid">
        <article>
          <Wrench size={24} />
          <h3>Make Manufacturable</h3>
          <p>Checks DRC/ERC evidence, placement risks, routing blockers, board outline geometry, export readiness, and manufacturer-rule gaps. Safe fixes are proposed or run through the local engine; unsafe changes require review.</p>
          <ul>
            <li>DRC/ERC parsing and blocker categories</li>
            <li>placement, routeability, and outline warnings</li>
            <li>Gerber, drill, BOM, CPL, and package evidence</li>
          </ul>
        </article>
        <article>
          <DatabaseZap size={24} />
          <h3>Make Sourcable</h3>
          <p>Checks BOM risk, live supplier availability, stock confidence, lifecycle flags, price-break visibility, alternatives, and quote readiness without inventing supplier data.</p>
          <ul>
            <li>DigiKey and Mouser lookup where configured</li>
            <li>drop-in alternative risk notes</li>
            <li>no-fake-stock status enforcement</li>
          </ul>
        </article>
      </div>
    </section>
  )
}

function EvidenceProofGrid() {
  return (
    <section className="bf-section bf-theme-evidence" id="evidence">
      <div className="bf-section-head">
        <span className="bf-kicker">Evidence layer</span>
        <h2>Proof before manufacturing claims.</h2>
        <p>BoardForge exposes passed checks, blocked checks, supplier state, source protection, package evidence, and external review requirements instead of hiding uncertainty behind polished copy.</p>
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
    <section className="bf-section bf-engine-section bf-theme-engine">
      <div>
        <span className="bf-kicker">Local-first safety</span>
        <h2>The website commands the workflow. Your machine protects the KiCad files.</h2>
        <p>The installed local engine handles KiCad projects, routing reports, DRC/ERC, manufacturing exports, source protection, and downloads inside the workspace the user approves.</p>
      </div>
      <div className="bf-engine-chain">
        {[
          ['Website', 'board intake, dashboards, sourcing, reports'],
          ['Pairing', 'private desktop connection with source protection'],
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
    <section className="bf-section bf-demo-section bf-theme-workflow">
      <div className="bf-section-head">
        <span className="bf-kicker">Guided workflow</span>
        <h2>Run a realistic command-center path.</h2>
        <p>Create a board brief, review manufacturability, verify sourcing status, inspect evidence, and prepare clearly labeled artifacts.</p>
      </div>
      <div className="bf-demo-timeline">
        {demoSteps.map((step, index) => (
          <div key={step}><small>{index + 1}</small><strong>{step}</strong></div>
        ))}
      </div>
      <div className="bf-button-row">
        <AnimatedCTAButton href="/demo"><Sparkles size={17} /> Open Guided Workflow</AnimatedCTAButton>
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
      <AnimatedPCBBackground />
      <PremiumNav />
      <section className="bf-hero">
        <div className="bf-hero-copy">
          <span className="bf-kicker">AI PCB Engineering Command Center</span>
          <h1>From PCB idea to manufacturable KiCad project.</h1>
          <p>BoardForge helps you generate board briefs, create custom outlines, validate KiCad projects, verify live supplier sourcing, repair manufacturability issues, and export fabrication-ready packages.</p>
          <div className="bf-button-row">
            <AnimatedCTAButton href="/new-board"><Zap size={17} /> Start Building</AnimatedCTAButton>
            <AnimatedCTAButton href="/demo" variant="secondary"><Sparkles size={17} /> Guided Workflow</AnimatedCTAButton>
            <AnimatedCTAButton href="/evidence" variant="ghost"><FileCheck2 size={17} /> View Evidence</AnimatedCTAButton>
          </div>
          <div className="bf-hero-metrics">
            {workflowMetrics.map(([label, value]) => (
              <span key={label}><strong>{label}</strong> {value}</span>
            ))}
          </div>
        </div>
        <Hero3DBoard />
      </section>
      <ScrollProductFlow />
      <section className="bf-section bf-theme-tools">
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
      <MakeWorkflowSection />
      <LocalEngineExplainer />
      <EvidenceProofGrid />
      <PublicDemoSection />
      <section className="bf-section bf-alpha-limitations bf-theme-gate">
        <Gauge size={22} />
        <div>
          <h2>Engineering review gate</h2>
          <p>BoardForge is honest about external requirements: public installer signing, PoE compliance and safety review, and live DigiKey OAuth credentials remain visible until completed.</p>
        </div>
        <AnimatedCTAButton href="/alpha-readiness" variant="secondary"><Radar size={17} /> View launch gate</AnimatedCTAButton>
      </section>
      <FooterCTA />
    </main>
  )
}

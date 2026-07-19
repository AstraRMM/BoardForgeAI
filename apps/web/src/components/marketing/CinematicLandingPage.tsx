'use client'

import Link from 'next/link'
import {
  ArrowRight, BadgeCheck, Box, Check, CheckCircle2, ChevronDown, ClipboardCheck,
  Cpu, Download, FileText, Layers3, ShieldCheck, Sparkles, Wrench,
} from 'lucide-react'
import styles from './CinematicLandingPage.module.css'

const nav = [['Product', '#product'], ['Solutions', '#platform'], ['Resources', '#resources'], ['Company', '#company']] as const
const trust = [['AI-Powered', Cpu], ['Production Ready', ShieldCheck], ['Manufacturing Verified', ClipboardCheck], ['Secure by Design', BadgeCheck]] as const
const metrics = [
  ['Faster Iteration', 'Requirements to editable PCB', Wrench],
  ['ERC + DRC', 'Built-in validation gates', ShieldCheck],
  ['Manufacturing Outputs', 'Gerber, drill, BOM and CPL', Layers3],
  ['KiCad Native', 'Openable project deliverables', FileText],
] as const
const plans = [
  { name: 'Builder', price: '$26', limit: 'Up to 12 production boards / month', blurb: 'For individual builders and engineers with a focused project cadence.', features: ['AI-assisted board requirements', 'Custom Board Generator', 'Schematic and PCB generation', 'KiCad-native project export', 'ERC + DRC validation', 'DigiKey and Mouser sourcing', 'Gerber, drill, BOM and CPL exports'], cta: 'Start with Builder', href: '/signup?plan=builder', featured: false },
  { name: 'Engineer', price: '$57', limit: 'Up to 42 production boards / month', blurb: 'For active engineers and small product teams that need deeper tools.', features: ['Everything in Builder', 'Requirements Intelligence', 'Advanced component binding', 'Advanced placement and routing', 'Differential-pair workflows', 'Manufacturing-readiness reports', 'Evidence history and priority processing'], cta: 'Choose Engineer', href: '/signup?plan=engineer', featured: true },
  { name: 'Team', price: '$110', limit: 'Up to 90 production boards / month', blurb: 'For teams managing review, approval, and manufacturing handoff together.', features: ['Everything in Engineer', 'Team workspaces and member access', 'Shared projects and libraries', 'Design review and approval gates', 'Role-based access and comments', 'Team activity history', 'Manufacturing handoff collaboration'], cta: 'Choose Team', href: '/signup?plan=team', featured: false },
] as const

function Logo() {
  return <Link className={styles.brand} href="/" aria-label="BoardForge home"><b>B</b><span>BoardForge</span></Link>
}

function Header() {
  return <header className={styles.header}>
    <Logo />
    <nav className={styles.nav} aria-label="Primary navigation">
      {nav.map(([name, href]) => <a key={name} href={href}>{name}{name !== 'Company' && <ChevronDown size={13} />}</a>)}
      <a href="#pricing">Pricing</a>
    </nav>
    <div className={styles.actions}><Link className={styles.signIn} href="/login">Sign in</Link><Link className={styles.getStarted} href="/signup">Get Started <ArrowRight size={15} /></Link></div>
  </header>
}

function BoardVisual() {
  const panel = (className: string, children: React.ReactNode) => <section className={`${styles.panel} ${styles[className]}`}>{children}</section>
  return <div className={styles.visual} aria-label="BoardForge PCB design status">
    <div className={styles.guide} />
    <img className={styles.board} src="/images/boardforge-production-pcb-hero.png" alt="Production PCB with USB-C, Ethernet, microcontrollers, routing, and mounted components" />
    {panel('copilot', <><span><Cpu size={14} /> AI Copilot</span><p>Routing differential pairs...</p><div className={styles.progress}><i /><b>92%</b></div></>)}
    {panel('drc', <><span>DRC Status <ChevronDown size={13} /></span><strong><CheckCircle2 size={16} />No errors</strong><small>0 warnings</small></>)}
    {panel('parts', <><span>Components <ChevronDown size={13} /></span><strong><CheckCircle2 size={14} />All parts verified</strong><b>98% <small>Sourced</small></b></>)}
    {panel('package', <><span><Box size={14} /> Manufacturing Package</span><strong><CheckCircle2 size={14} />Ready for production</strong><div className={styles.files}>{['GERBER', 'DRILL', 'BOM', 'CPL'].map((item) => <small key={item}><FileText size={16} />{item}</small>)}</div><Link href="/downloads"><Download size={13} />Download package <ArrowRight size={13} /></Link></>)}
  </div>
}

function Hero() {
  return <section className={styles.hero} id="product">
    <div className={styles.copy}>
      <span className={styles.eyebrow}><Cpu size={13} />AI-NATIVE PCB ENGINEERING PLATFORM</span>
      <h1>From idea to<br />manufacturing,<br /><em>instantly.</em></h1>
      <p>BoardForge is the AI-native PCB engineering platform that helps engineers move from concept to production-ready boards faster—without compromising the engineering record.</p>
      <div className={styles.ctas}><Link href="/new-board">Start Designing <ArrowRight size={16} /></Link><a href="mailto:hello@boardforge.ai?subject=BoardForge%20demo%20request">Book a Demo</a></div>
      <div className={styles.trust}>{trust.map(([label, Icon]) => <span key={label}><Icon size={14} />{label}</span>)}</div>
    </div>
    <BoardVisual />
  </section>
}

function Metrics() {
  return <section className={styles.metrics} aria-label="BoardForge product capabilities">{metrics.map(([label, detail, Icon]) => <article key={label}><i><Icon size={21} /></i><div><b>{label}</b><small>{detail}</small></div></article>)}</section>
}

function EditorPreview() {
  return <div className={styles.editor} aria-label="BoardForge PCB editor preview">
    <header><Logo /><span>⌕&nbsp; HexFlight F7 Controller</span><i>Top Layer</i><i>View</i></header>
    <aside><small>PROJECT</small><b>HexFlight F7 Controller</b><small>DESIGN</small><span>Schematic</span><strong>PCB Layout</strong><span>3D Viewer</span><small>ANALYSIS</small><span>DRC Check</span><span>ERC Check</span></aside>
    <main><div><b>PCB Layout</b><span>● All changes saved</span><i>Design rules</i></div><section><img src="/images/boardforge-production-pcb-hero.png" alt="PCB preview inside BoardForge editor" /><div className={styles.editorRef}>U1</div><div className={styles.editorRefTwo}>J3</div></section></main>
  </div>
}

function Platform() {
  return <section className={styles.platform} id="platform"><EditorPreview /><div><span className={styles.eyebrow}><Cpu size={13} />DESIGN WITHOUT LIMITS</span><h2>Powerful tools.<br />Seamless experience.</h2><p>Schematic capture, intelligent placement, advanced routing, and real-time validation—everything you need in one unified platform.</p><Link href="/dashboard">Explore the Platform <ArrowRight size={16} /></Link></div></section>
}

function Company() {
  const proofs = ['Local-first project control', 'Source-attributed component decisions', 'Visible ERC and DRC gates', 'KiCad-native deliverables', 'Manufacturing evidence packages', 'User-approved publishing']
  return <section className={styles.company} id="company"><div><span className={styles.eyebrow}><BadgeCheck size={13} />BUILT FOR ACCOUNTABLE ENGINEERING</span><h2>Engineering decisions backed by evidence.</h2><p>BoardForge keeps requirements, component sources, validation reports, and manufacturing outputs attached to the project so every decision can be reviewed and reproduced.</p></div><div className={styles.proofList}>{proofs.map((proof) => <span key={proof}><CheckCircle2 size={16} />{proof}</span>)}</div></section>
}

function Pricing() {
  return <section className={styles.pricing} id="pricing"><header><span className={styles.eyebrow}><Sparkles size={13} />PRICING</span><h2>Pricing built around how many boards you produce.</h2><p>Every plan includes BoardForge’s core engineering workflow. Higher plans unlock additional design tools, larger production allowances, and collaboration capabilities.</p></header><div className={styles.planGrid}>{plans.map((plan) => <article className={plan.featured ? styles.featuredPlan : ''} key={plan.name}>{plan.featured && <span className={styles.popular}>Most Popular</span>}<h3>{plan.name}</h3><strong>{plan.price}<small>/month</small></strong><b>{plan.limit}</b><p>{plan.blurb}</p><ul>{plan.features.map((feature) => <li key={feature}><Check size={14} />{feature}</li>)}</ul><Link href={plan.href}>{plan.cta} <ArrowRight size={15} /></Link></article>)}</div><small className={styles.disclosure}>Production-board allowances apply to boards generated and completed through the BoardForge production workflow during each billing month. Drafts, failed candidates, archived attempts, and user-rejected candidates do not consume a production-board allowance.</small></section>
}

function FinalCta() {
  return <section className={styles.finalCta}><div><h2>Build your next board with evidence behind every decision.</h2><p>Move from requirements to an editable, sourced, validated, manufacturing-ready KiCad project.</p></div><div><Link href="/new-board">Start Designing <ArrowRight size={16} /></Link><Link href="/login">Sign In</Link></div></section>
}

function Footer() {
  return <footer id="resources"><section><div><Logo /><p>AI-native PCB engineering from requirements through manufacturing handoff.</p></div><div><b>Product</b><Link href="/dashboard">Dashboard</Link><Link href="/custom-board-generator">Custom Board Generator</Link><Link href="/schematic-workspace">Schematic Editor</Link><Link href="/pcb-workspace">PCB Editor</Link><Link href="/downloads">Manufacturing</Link></div><div><b>Resources</b><Link href="/docs">Documentation</Link><Link href="/readiness">Reference Designs</Link><Link href="/reports">Updates</Link><Link href="/readiness">System Status</Link></div><div><b>Company</b><a href="#company">About</a><a href="mailto:hello@boardforge.ai">Contact</a><a href="#pricing">Pricing</a><a href="mailto:privacy@boardforge.ai">Privacy</a><a href="mailto:legal@boardforge.ai">Terms</a></div></section><small>© {new Date().getFullYear()} BoardForge <i /> Engineering systems operational</small></footer>
}

export function CinematicLandingPage() {
  return <main className={styles.landing}><Header /><Hero /><Metrics /><Platform /><Company /><Pricing /><FinalCta /><Footer /></main>
}

export default CinematicLandingPage

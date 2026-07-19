'use client'

import Link from 'next/link'
import { ArrowRight, BadgeCheck, Box, CheckCircle2, ChevronDown, ClipboardCheck, Cpu, Download, FileText, Layers3, ShieldCheck, Sun, Users, Wrench } from 'lucide-react'
import styles from './CinematicLandingPage.module.css'

const nav = [['Product', '#product'], ['Solutions', '#platform'], ['Resources', '#resources']] as const
const trust = [['AI-Powered', Cpu], ['Production Ready', ShieldCheck], ['Manufacturing Verified', ClipboardCheck], ['Secure by Design', BadgeCheck]] as const
const metrics = [['10x', 'Faster Design', 'AI-powered automation', Wrench], ['0', 'DRC Errors', 'Clean by design', ShieldCheck], ['100%', 'Manufacturing Ready', 'First-pass success', Layers3], ['50K+', 'Engineers', 'Building with BoardForge', Users]] as const

function Logo() {
  return <Link className={styles.brand} href="/" aria-label="BoardForge home"><b>B</b><span>BoardForge</span></Link>
}

function Header() {
  return <header className={styles.header}>
    <Logo />
    <nav className={styles.nav} aria-label="Primary navigation">
      {nav.map(([name, href]) => <a key={name} href={href}>{name}<ChevronDown size={13} /></a>)}
      <Link href="/pricing">Pricing</Link>
      <a href="#company">Company<ChevronDown size={13} /></a>
    </nav>
    <div className={styles.actions}><button type="button" aria-label="Dark theme"><Sun size={18} /></button><Link className={styles.signIn} href="/login">Sign in</Link><Link className={styles.getStarted} href="/signup">Get Started <ArrowRight size={16} /></Link></div>
  </header>
}

function BoardVisual() {
  const panel = (className: string, children: React.ReactNode) => <section className={[styles.panel, styles[className]].join(' ')}>{children}</section>
  return <div className={styles.visual} aria-label="BoardForge PCB design status">
    <div className={styles.grid} />
    <div className={styles.board}><i /><i /><i /><i /><i /><i /></div>
    {panel('copilot', <><span><Cpu size={14} />AI Copilot</span><p>Routing differential<br />pairs...</p><div className={styles.progress}><i /><b>92%</b></div></>)}
    {panel('drc', <><span>DRC Status<ChevronDown size={14} /></span><strong><CheckCircle2 size={17} />No errors</strong><small>0 warnings</small></>)}
    {panel('parts', <><span>Components<ChevronDown size={14} /></span><strong><CheckCircle2 size={15} />All parts verified</strong><b>98% <small>Sourced</small></b></>)}
    {panel('package', <><span><Box size={14} />Manufacturing Package</span><strong><CheckCircle2 size={15} />Ready for Production</strong><div className={styles.files}>{['GERBER', 'DRILL', 'BOM', 'CPL'].map((item) => <small key={item}><FileText size={20} />{item}</small>)}</div><Link href="/downloads"><Download size={14} />Download Package <ArrowRight size={14} /></Link></>)}
  </div>
}

function Hero() {
  return <section className={styles.hero} id="product">
    <div className={styles.copy}>
      <span className={styles.eyebrow}><Cpu size={13} />AI-NATIVE PCB ENGINEERING PLATFORM</span>
      <h1>From idea to<br />manufacturing,<br /><em>instantly.</em></h1>
      <p>BoardForge is the AI-native PCB engineering platform that helps engineers go from concept to production-ready boards faster than ever—without compromise.</p>
      <div className={styles.ctas}><Link href="/new-board">Start Designing <ArrowRight size={17} /></Link><a href="mailto:hello@boardforge.ai?subject=BoardForge%20demo%20request">Book a Demo</a></div>
      <div className={styles.trust}>{trust.map(([label, Icon]) => <span key={label}><Icon size={14} />{label}</span>)}</div>
    </div>
    <BoardVisual />
  </section>
}

function Metrics() {
  return <section className={styles.metrics}>{metrics.map(([value, label, detail, Icon]) => <article key={label}><i><Icon size={27} /></i><div><b>{value}</b><span>{label}</span><small>{detail}</small></div></article>)}</section>
}

function EditorPreview() {
  return <div className={styles.editor}>
    <header><Logo /><span>⌕ &nbsp; BoardForge</span><i>◌</i><i>◌</i></header>
    <aside><small>PROJECT</small><b>HexFlight F7 Controller</b><small>DESIGN</small><span>Schematic</span><strong>PCB Layout</strong><span>3D Viewer</span><small>ANALYSIS</small><span>DRC Check</span><span>ERC Check</span></aside>
    <main><div><b>PCB Layout</b><span>● All changes saved</span><i>Top Layer⌄</i><i>View⌄</i></div><section><i /><i /><i /><i /></section></main>
  </div>
}

function Platform() {
  return <section className={styles.platform} id="platform"><EditorPreview /><div><span className={styles.eyebrow}><Cpu size={13} />DESIGN WITHOUT LIMITS</span><h2>Powerful tools.<br />Seamless experience.</h2><p>Schematic capture, intelligent placement, advanced routing, and real-time validation—everything you need in one unified platform.</p><Link href="/dashboard">Explore the Platform <ArrowRight size={16} /></Link></div></section>
}

function Company() {
  return <section className={styles.company} id="company"><div><span className={styles.eyebrow}><BadgeCheck size={13} />BUILT FOR ACCOUNTABLE ENGINEERING</span><h2>Engineering software that keeps the evidence in the work.</h2><p>BoardForge connects the design brief, local KiCad workflow, validation evidence, sourcing, and manufacturing handoff so engineering teams can make decisions with context.</p></div><div className={styles.companyCards}><span><ShieldCheck size={18} />Local-first project control</span><span><ClipboardCheck size={18} />Visible review gates</span><span><Layers3 size={18} />KiCad-native outputs</span></div></section>
}

export function CinematicLandingPage() {
  return <main className={styles.landing}><Header /><Hero /><Metrics /><Platform /><Company /><footer id="resources"><Logo /><span>© {new Date().getFullYear()} BoardForge</span><div><Link href="/docs">Resources</Link><a href="#company">Company</a><Link href="/pricing">Pricing</Link><Link href="/login">Sign in</Link></div></footer></main>
}

export default CinematicLandingPage

import Link from 'next/link'
import { ArrowRight, CheckCircle2, ClipboardList, FilePlus2, FolderOpen, MoreHorizontal, PlugZap, Upload } from 'lucide-react'
import { getAuthEnvironment } from '../../lib/auth'
import { AppShell } from '../../components/app/AppShell'
import styles from './dashboard.module.css'

const quickActions = [
  { title: 'AI Board Generator', body: 'Turn requirements into a reviewable board brief.', href: '/new-board', icon: <FilePlus2 />, tone: 'blue' },
  { title: 'Schematic Editor', body: 'Inspect and edit browser schematic plans.', href: '/schematic-workspace', icon: <ClipboardList />, tone: 'violet' },
  { title: 'PCB Editor', body: 'Open a browser PCB draft for review.', href: '/pcb-workspace', icon: <PlugZap />, tone: 'green' },
  { title: 'Import KiCad', body: 'Register a project before protected local operations.', href: '/import', icon: <FolderOpen />, tone: 'slate' },
]

export default function DashboardPage() {
  const auth = getAuthEnvironment()
  return <AppShell title="Engineering command center" subtitle="Your saved projects, local engineering work, and evidence."><div className={styles.layout}>
    <section className={styles.primary}>
      <header className={styles.welcome}><p>ENGINEERING WORKSPACE</p><h1>Good evening, Luifi.</h1><span>Start a board brief, inspect an existing project, or continue a verified candidate.</span></header>
      {!auth.ready && <section className={styles.setupNotice}><strong>Account services need setup.</strong><span>{auth.missing.join(', ')} is missing, so protected workspace actions are unavailable.</span><Link href="/setup">Complete setup <ArrowRight /></Link></section>}
      <section className={styles.quickGrid}>{quickActions.map((action) => <Link href={action.href} key={action.title} className={styles.quickCard}><span className={styles[action.tone]}>{action.icon}</span><h2>{action.title}</h2><p>{action.body}</p><i>Open <ArrowRight /></i></Link>)}</section>
      <section className={styles.panel}><header><div><h2>Recent projects</h2><p>Only projects you save in BoardForge or through the paired helper appear here.</p></div><Link href="/projects">View all <ArrowRight /></Link></header><div className={styles.emptyProjects}><span><Upload /></span><div><h3>Start a saved project to see it here</h3><p>Save a board request in the browser, import a KiCad project, or approve a plugin save. BoardForge does not seed this view with demo boards.</p></div><div className={styles.emptyActions}><Link href="/import">Import KiCad</Link><Link href="/new-board">New board</Link></div></div></section>
      <section className={styles.toolPanel}><h2>Design tools</h2><div>{[['DRC check','Run local design-rule validation','/evidence'],['ERC check','Review schematic electrical rules','/evidence'],['3D viewer','Open only a recorded KiCad render artifact','/projects'],['Gerber package','Review manufacturing exports','/downloads']].map(([title, body, href]) => <Link href={href} key={title}><CheckCircle2 /><span><b>{title}</b><small>{body}</small></span></Link>)}</div></section>
    </section>
    <aside className={styles.rightRail}>
      <section className={styles.metrics}><Metric value="Local" label="Projects" /><Metric value="—" label="Boards" /><Metric value={auth.ready ? 'Ready' : 'Setup'} label="Auth" good={auth.ready} /><Metric value="0" label="Candidates" /></section>
      <section className={styles.railPanel}><header><h2>Running jobs</h2><Link href="/evidence">View all</Link></header><div className={styles.blank}><PlugZap /><p>No jobs are running</p><span>Start a board brief to create the first candidate.</span><Link href="/new-board">Create board <ArrowRight /></Link></div></section>
      <section className={styles.railPanel}><header><h2>System status</h2><span className={styles.healthy}>Local status</span></header><Status title="BoardForge Engine" detail="Pair a local desktop engine" href="/settings/plugin"/><Status title="Rust Geometry Engine" detail="Browser runtime available" href="/custom-board-generator"/><Status title="Manufacturing pipeline" detail="Awaiting accepted board" href="/downloads"/><Status title="Account services" detail={auth.ready ? 'Authenticated workspace ready' : 'Configuration required'} href="/settings"/></section>
    </aside>
  </div></AppShell>
}

function Metric({ value, label, good }: { value: string; label: string; good?: boolean }) { return <div><strong className={good ? styles.good : undefined}>{value}</strong><span>{label}</span></div> }
function Status({ title, detail, href }: { title: string; detail: string; href: string }) { return <Link href={href} className={styles.statusRow}><PlugZap /><span><b>{title}</b><small>{detail}</small></span><MoreHorizontal /></Link> }

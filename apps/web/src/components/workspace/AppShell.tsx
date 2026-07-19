import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  Bell, Bot, Box, Boxes, Cable, ChevronDown, CircleHelp, ClipboardCheck,
  FileCheck2, FolderKanban, Gauge, Hexagon, LayoutDashboard,
  MonitorCog, PackageSearch, Plus, RadioTower, Search, Settings2, ShieldCheck,
  Sparkles, Wrench,
} from 'lucide-react'
import styles from './AppShell.module.css'

type NavItem = { href: string; label: string; icon: ReactNode }
const workspaceItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
  { href: '/projects', label: 'Projects', icon: <FolderKanban /> },
  { href: '/pcb-workspace', label: 'PCB Editor', icon: <MonitorCog /> },
  { href: '/schematic-workspace', label: 'Schematic Editor', icon: <Cable /> },
  { href: '/custom-board-generator', label: 'Board Generator', icon: <Sparkles /> },
  { href: '/new-board', label: 'AI PCB Chat', icon: <Bot /> },
  { href: '/downloads', label: 'Manufacturing', icon: <PackageSearch /> },
  { href: '/reports', label: 'Reports', icon: <ClipboardCheck /> },
  { href: '/plugin/connect', label: 'Plugin Pairing', icon: <RadioTower /> },
  { href: '/settings', label: 'Settings', icon: <Settings2 /> },
]

export function AppShell({ children, active = 'Dashboard' }: { children: ReactNode; active?: string }) {
  return <div className={styles.shell}>
    <aside className={styles.sidebar}>
      <Link href="/dashboard" className={styles.brand}><span className={styles.logo}><Hexagon /><b>B</b></span><strong>BoardForge</strong></Link>
      <Link href="/new-board" className={styles.newProject}><Plus /> New project <ChevronDown /></Link>
      <p className={styles.groupLabel}>WORKSPACE</p>
      <nav className={styles.nav} aria-label="Workspace navigation">
        {workspaceItems.map((item) => <Link key={item.label} href={item.href} className={active === item.label ? styles.active : undefined}>{item.icon}<span>{item.label}</span></Link>)}
      </nav>
      <p className={styles.groupLabel}>RESOURCES</p>
      <nav className={styles.nav} aria-label="Resource navigation">
        <Link href="/docs"><CircleHelp /> <span>Documentation</span></Link>
        <Link href="/evidence"><FileCheck2 /> <span>Reference designs</span></Link>
        <Link href="/readiness"><Gauge /> <span>System readiness</span></Link>
      </nav>
      <div className={styles.engineCard}>
        <div><span className={styles.statusDot} /> <strong>BoardForge Engine</strong><small>Local connection required</small></div>
        <div><span className={styles.statusDot} /> <strong>Rust Geometry Engine</strong><small>Browser runtime ready</small></div>
        <Link href="/plugin/connect">View system status <ChevronDown /></Link>
      </div>
    </aside>
    <section className={styles.frame}>
      <header className={styles.topbar}>
        <nav aria-label="Primary navigation" className={styles.primaryNav}><Link href="/dashboard" className={styles.topActive}>Dashboard</Link><Link href="/projects">Projects</Link><Link href="/pcb-workspace">Design</Link><Link href="/evidence">Libraries</Link><Link href="/downloads">Parts</Link><Link href="/new-board">AI tools</Link><Link href="/settings">Admin</Link></nav>
        <div className={styles.topActions}><button className={styles.search} type="button" aria-label="Search workspace"><Search /><span>Search projects, parts, docs…</span><kbd>⌘ K</kbd></button><button className={styles.iconButton} type="button" aria-label="Notifications"><Bell /><i>3</i></button><Link href="/settings" className={styles.account}><span>LF</span><b>Luifi</b><small>Pro plan</small></Link></div>
      </header>
      <main className={styles.content}>{children}</main>
    </section>
  </div>
}

export function StatusIcon({ kind }: { kind: 'engine' | 'candidate' | 'validation' | 'package' }) {
  const icons = { engine: <Wrench />, candidate: <Boxes />, validation: <ShieldCheck />, package: <Box /> }
  return <span className={styles.statusIcon + ' ' + styles[kind]}>{icons[kind]}</span>
}

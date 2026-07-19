'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Boxes,
  FolderKanban,
  Grid2X2,
  Layers3,
  ExternalLink,
  Menu,
  PlugZap,
  ScanSearch,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

const navigation = [
  { href: '/dashboard', label: 'Overview', icon: Grid2X2 },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/new-board', label: 'New board', icon: Sparkles },
  { href: '/custom-board-generator', label: 'Board outlines', icon: Layers3 },
  { href: '/import', label: 'Inspect KiCad', icon: ScanSearch },
]

const operations = [
  { href: '/downloads', label: 'Manufacturing', icon: Boxes },
  { href: '/evidence', label: 'Validation evidence', icon: ShieldCheck },
  { href: '/settings/plugin', label: 'Plugin pairing', icon: PlugZap },
]

export function AppShell({ children, title = 'Engineering workspace', subtitle = 'Browser drafts stay available here; KiCad creation and validation use the paired desktop helper.' }: { children: ReactNode; title?: string; subtitle?: string }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobileNavigation = () => setMobileOpen(false)

  return (
    <div className="bf-command-shell">
      <a className="bf-command-skip-link" href="#main-content">Skip to workspace content</a>
      <button className="bf-command-mobile-toggle" type="button" onClick={() => setMobileOpen(true)} aria-label="Open workspace navigation"><Menu size={20} /></button>
      <aside className={`bf-command-sidebar${mobileOpen ? ' is-open' : ''}`} aria-label="Engineering workspace navigation">
        <button className="bf-command-mobile-close" type="button" onClick={closeMobileNavigation} aria-label="Close workspace navigation"><X size={20} /></button>
        <Link href="/dashboard" className="bf-command-brand">
          <span className="bf-command-mark">BF</span>
          <span><strong>BoardForge</strong><small>Engineering workspace</small></span>
        </Link>
        <nav className="bf-command-nav">
          <p>Workspace</p>
          {navigation.map(({ href, label, icon: Icon }) => <ShellLink key={href} href={href} label={label} icon={<Icon size={16} />} active={isActivePath(pathname, href)} onFollow={closeMobileNavigation} />)}
          <p>Operations</p>
          {operations.map(({ href, label, icon: Icon }) => <ShellLink key={label} href={href} label={label} icon={<Icon size={16} />} active={isActivePath(pathname, href)} onFollow={closeMobileNavigation} />)}
        </nav>
        <div className="bf-command-sidebar-foot">
          <span className="bf-engine-dot" /> Desktop pairing unlocks KiCad actions
        </div>
      </aside>
      <section className="bf-command-main">
        <header className="bf-command-topbar">
          <div className="bf-command-context"><span><strong>{title}</strong><small>{subtitle}</small></span></div>
          <div className="bf-command-top-actions">
            <span className="bf-command-engine-status"><span />Desktop helper for KiCad</span>
            <Link href="/settings/plugin" aria-label="Plugin pairing" title="Plugin pairing"><PlugZap size={17} /></Link>
            <Link href="/settings" aria-label="Workspace settings" title="Workspace settings"><Settings2 size={17} /></Link>
            <Link href="/" aria-label="Open BoardForge home" title="Open BoardForge home"><ExternalLink size={17} /></Link>
          </div>
        </header>
        <main id="main-content" className="bf-command-content">{children}</main>
      </section>
    </div>
  )
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function ShellLink({ href, label, icon, active, onFollow }: { href: string; label: string; icon: ReactNode; active: boolean; onFollow: () => void }) {
  return <Link href={href} onClick={onFollow} className={`bf-command-link${active ? ' is-active' : ''}`}>{icon}<span>{label}</span></Link>
}

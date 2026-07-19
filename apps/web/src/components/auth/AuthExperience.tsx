import Link from 'next/link'
import { ArrowRight, BookOpen, CheckCircle2, FolderKanban, LockKeyhole, ShieldCheck } from 'lucide-react'
import { AuthForms } from './AuthForms'
import styles from './AuthExperience.module.css'

type Mode = 'login' | 'signup'

export function AuthExperience({ mode, ready, missing }: { mode: Mode; ready: boolean; missing: string[] }) {
  const login = mode === 'login'
  const copy = login
    ? { eyebrow: 'WELCOME BACK', title: 'Sign in to BoardForge', body: 'Continue to your projects, local engine, and engineering workspace.', action: 'New to BoardForge?', link: 'Create an account', href: '/signup' }
    : { eyebrow: 'CREATE WORKSPACE ACCESS', title: 'Create your BoardForge account', body: 'Create an account to save projects, pair the local engine, and manage your BoardForge workspace.', action: 'Already have an account?', link: 'Sign in', href: '/login' }

  return <main className={styles.page}>
    <TraceBackground />
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="BoardForge home"><Logo /><span>BoardForge</span></Link>
      <nav aria-label="Authentication navigation" className={styles.headerLinks}><Link href="/docs"><BookOpen size={16} aria-hidden="true" />Documentation</Link><Link href="/">Back to home <ArrowRight size={16} aria-hidden="true" /></Link></nav>
    </header>
    <section className={styles.content}>
      <article className={styles.intro}>
        <p className={styles.kicker}>BOARD FORGE ENGINEERING WORKSPACE</p>
        <h1>Design with confidence.<br />Keep every decision reviewable.</h1>
        <p className={styles.introBody}>BoardForge keeps your KiCad project local, tracks sourcing and validation evidence, and lets you approve every candidate before anything is published.</p>
        <ul className={styles.proofPoints}>
          <Proof icon={<ShieldCheck />} title="Local-first" body="project execution" />
          <Proof icon={<LockKeyhole />} title="Revocable" body="device pairing" />
          <Proof icon={<FolderKanban />} title="KiCad-native" body="deliverables" />
          <Proof icon={<CheckCircle2 />} title="Evidence-backed" body="validation" />
        </ul>
      </article>
      <article className={styles.card}>
        <p className={styles.cardKicker}>{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
        <p className={styles.cardBody}>{copy.body}</p>
        {ready ? <AuthForms mode={mode} /> : <div className={styles.setupNotice} role="status"><strong>Authentication setup is incomplete.</strong><span>This deployment is missing: {missing.join(', ')}.</span><Link href="/setup">View setup requirements <ArrowRight size={15} /></Link></div>}
        <p className={styles.switchMode}>{copy.action} <Link href={copy.href}>{copy.link}</Link></p>
      </article>
    </section>
    <footer className={styles.footer}><LockKeyhole size={15} aria-hidden="true" /> Your data stays local. You’re in control.</footer>
  </main>
}

function Proof({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) { return <li><span>{icon}</span><p><strong>{title}</strong><small>{body}</small></p></li> }
function Logo() { return <span className={styles.logo} aria-hidden="true"><b>B</b><i /></span> }

function TraceBackground() {
  return <div className={styles.traces} aria-hidden="true"><svg viewBox="0 0 1600 1000" preserveAspectRatio="none">
    <g className={styles.traceBase}><path d="M0 156H190l48 48h188l48 48v140l88 88h225"/><path d="M0 380h248l64-64h137l62 62v212l100 100h192l68-68h330"/><path d="M120 1000V792l100-100h176l66-66h210l76-76V324l102-102h328"/><path d="M1600 160h-226l-86 86h-176l-70 70v146l-120 120H670"/><path d="M1600 654h-194l-60-60h-234l-80-80V364l-84-84H732"/><path d="M1600 872h-208l-76-76h-170l-104-104H848l-78-78H610"/></g>
    <g className={styles.traceAccent}><path d="M0 156H190l48 48h188l48 48"/><path d="M0 380h248l64-64h137l62 62"/><path d="M1600 160h-226l-86 86h-176l-70 70"/><path d="M120 1000V792l100-100h176l66-66"/><path d="M1600 654h-194l-60-60h-234l-80-80"/><path d="M610 280h122l84 84v100l96 96"/><path d="M0 708h164l72-72h186l64-64"/><path d="M1600 408h-178l-58 58h-154l-72 72"/><path className={styles.copper} d="M1600 872h-208l-76-76h-170l-104-104"/></g>
    <g className={styles.vias}><circle cx="238" cy="204" r="5"/><circle cx="502" cy="392" r="5"/><circle cx="612" cy="590" r="5"/><circle cx="1288" cy="246" r="5"/><circle cx="1042" cy="462" r="5"/><circle cx="1146" cy="796" r="5"/></g>
  </svg><span className={styles.pulse + ' ' + styles.pulseOne} /><span className={styles.pulse + ' ' + styles.pulseTwo} /><span className={styles.pulse + ' ' + styles.pulseThree} /></div>
}

import Link from 'next/link'
import { ArrowUpRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import { AuthForms } from './AuthForms'

export function AuthScreen({ mode, ready }: { mode: 'login' | 'signup'; ready: boolean }) {
  const isLogin = mode === 'login'
  return (
    <main className="bf-auth-screen">
      <section className="bf-auth-story">
        <Link href="/" className="bf-auth-brand"><span>BF</span>BoardForge</Link>
        <div className="bf-auth-story-copy">
          <p className="bf-auth-eyebrow">AI PCB engineering platform</p>
          <h1>Design smarter. Engineer with evidence.</h1>
          <p>BoardForge keeps KiCad files in the workspace you approve, pairs a local engine for real work, and makes validation, sourcing, and manufacturing evidence visible before release.</p>
        </div>
        <div className="bf-auth-board-image" aria-hidden="true" />
        <div className="bf-auth-story-points">
          <span><ShieldCheck size={17} /> Protected local KiCad workflow</span>
          <span><LockKeyhole size={17} /> Revocable device pairing</span>
        </div>
      </section>
      <section className="bf-auth-form-region">
        <div className="bf-auth-card">
          <p className="bf-auth-eyebrow">{isLogin ? 'Welcome back' : 'Create workspace access'}</p>
          <h2>{isLogin ? 'Sign in to BoardForge' : 'Build your BoardForge account'}</h2>
          <p className="bf-auth-card-copy">{isLogin ? 'Open your project workspace and pair the local engineering tools when you are ready.' : 'Accounts are required before creating protected projects or pairing the local engine.'}</p>
          {ready ? <AuthForms mode={mode} /> : (
            <div className="bf-auth-setup-warning">
              <strong>Account services are not ready yet.</strong>
              <span>This environment still needs account-service configuration before sign-in can be enabled.</span>
              <Link href="/setup">View setup requirements <ArrowUpRight size={15} /></Link>
            </div>
          )}
          <p className="bf-auth-switch">{isLogin ? 'New to BoardForge?' : 'Already have an account?'} <Link href={isLogin ? '/signup' : '/login'}>{isLogin ? 'Create an account' : 'Sign in'}</Link></p>
        </div>
      </section>
    </main>
  )
}

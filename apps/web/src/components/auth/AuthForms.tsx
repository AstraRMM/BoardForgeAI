'use client'

import { FormEvent, useState } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { authClient } from '../../lib/auth-client'
import styles from './AuthExperience.module.css'

type Mode = 'login' | 'signup'
type FieldErrors = Partial<Record<'name' | 'email' | 'password', string>>

export function AuthForms({ mode }: { mode: Mode }) {
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') || '').trim()
    const password = String(form.get('password') || '')
    const name = String(form.get('name') || '').trim()
    const nextErrors: FieldErrors = {}

    if (mode === 'signup' && !name) nextErrors.name = 'Enter the name you want associated with your workspace.'
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = 'Enter a valid email address.'
    if (!password) nextErrors.password = 'Enter your password.'
    else if (mode === 'signup' && password.length < 8) nextErrors.password = 'Use at least 8 characters for your password.'

    setErrors(nextErrors)
    setMessage(null)
    if (Object.keys(nextErrors).length) return

    setBusy(true)
    try {
      const result = mode === 'login'
        ? await authClient.signIn.email({ email, password, callbackURL: '/dashboard' })
        : await authClient.signUp.email({ name, email, password, callbackURL: '/dashboard' })
      if (result.error) {
        setMessage(mode === 'login'
          ? 'We could not sign you in with those details. Check your email and password, then try again.'
          : 'We could not create that account. Check the details and try again.')
        return
      }
      window.location.assign('/dashboard')
    } catch {
      setMessage('Authentication is temporarily unavailable. Please try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  const passwordError = errors.password
  return (
    <form className={styles.form} noValidate onSubmit={submit} aria-describedby={message ? 'auth-form-error' : undefined}>
      {message && <div id="auth-form-error" role="alert" className={styles.formError}>{message}</div>}
      {mode === 'signup' && (
        <Field label="Name" fieldId="name" error={errors.name}>
          <span className={styles.inputShell}>
            <UserRound aria-hidden="true" size={18} strokeWidth={1.8} />
            <input id="name" required name="name" autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-field-error' : undefined} placeholder="Your name" />
          </span>
        </Field>
      )}
      <Field label="Email" fieldId="email" error={errors.email}>
        <span className={styles.inputShell}>
          <Mail aria-hidden="true" size={18} strokeWidth={1.8} />
          <input id="email" required name="email" type="email" autoComplete="email" inputMode="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-field-error' : undefined} placeholder="you@example.com" />
        </span>
      </Field>
      <Field label="Password" fieldId="password" error={passwordError} extra={mode === 'login' ? <a href="mailto:support@boardforge.ai?subject=Password%20reset">Forgot password?</a> : undefined}>
        <span className={styles.inputShell}>
          <LockKeyhole aria-hidden="true" size={18} strokeWidth={1.8} />
          <input id="password" required minLength={8} name="password" type={passwordVisible ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} aria-invalid={Boolean(passwordError)} aria-describedby={passwordError ? 'password-field-error' : undefined} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'} />
          <button type="button" className={styles.visibilityToggle} onClick={() => setPasswordVisible((value) => !value)} aria-label={passwordVisible ? 'Hide password' : 'Show password'}>
            {passwordVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </span>
      </Field>
      {mode === 'signup' && <p className={styles.passwordHint}>Use 8 or more characters. Your credentials are never exposed in project files.</p>}
      <button type="submit" className={styles.submit} disabled={busy}>
        {busy && <span className={styles.spinner} aria-hidden="true" />}
        {busy ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : (mode === 'login' ? 'Sign in' : 'Create account')}
      </button>
    </form>
  )
}

function Field({ label, fieldId, error, extra, children }: { label: string; fieldId: string; error?: string; extra?: React.ReactNode; children: React.ReactNode }) {
  const id = fieldId + '-field-error'
  return <div className={styles.field}>
    <div className={styles.fieldLabel}><label htmlFor={fieldId}>{label}</label>{extra}</div>
    {children}
    {error && <p id={id} className={styles.fieldError}>{error}</p>}
  </div>
}

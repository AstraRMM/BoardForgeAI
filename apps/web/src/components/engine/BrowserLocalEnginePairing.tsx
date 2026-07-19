'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Copy, KeyRound, LoaderCircle, Unplug } from 'lucide-react'
import { clearLocalEngineBrowserSession, hasLocalEngineBrowserSession, requestLocalEnginePairingCode, verifyLocalEngineBrowserSession, type BrowserPairingCode } from '../../lib/boardforge-local-engine-pairing-client'

type Phase = 'idle' | 'creating' | 'ready' | 'verifying' | 'paired' | 'error'

export function BrowserLocalEnginePairing() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [pairing, setPairing] = useState<BrowserPairingCode | null>(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (hasLocalEngineBrowserSession()) setPhase('paired')
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function createCode() {
    setPhase('creating'); setMessage('')
    try {
      const created = await requestLocalEnginePairingCode()
      setPairing(created); setCode(created.code); setPhase('ready')
    } catch (error) {
      setMessage(pairingFailureMessage(error, 'create a pairing code')); setPhase('error')
    }
  }

  async function verify() {
    if (!code.trim()) return
    setPhase('verifying'); setMessage('')
    try {
      await verifyLocalEngineBrowserSession(code)
      setPairing(null); setCode(''); setPhase('paired'); setMessage('This browser session is paired with the local engine.')
    } catch (error) {
      setMessage(pairingFailureMessage(error, 'verify this pairing code')); setPhase('error')
    }
  }

  async function copyCode() {
    if (!code || !navigator.clipboard) return
    await navigator.clipboard.writeText(code)
    setMessage('Pairing code copied to the clipboard.')
  }

  function disconnect() {
    clearLocalEngineBrowserSession(); setPairing(null); setCode(''); setMessage('This browser session is no longer paired.'); setPhase('idle')
  }

  const busy = phase === 'creating' || phase === 'verifying'
  const paired = phase === 'paired'
  return <article className="bf-workspace-panel bf-plugin-command">
    <div className="bf-panel-title"><div><p>Browser session</p><h2>{paired ? 'Local engine paired' : 'Pair this browser session'}</h2></div>{paired ? <CheckCircle2 size={20} /> : <KeyRound size={20} />}</div>
    <p className="bf-project-workspace-note">{paired ? 'Local-engine POST actions will use a session-only token until you disconnect or close this browser.' : 'Create a one-time code from the local helper, then confirm it here. The token is kept only in this browser session and is never displayed.'}</p>
    {!paired && <div className="bf-plugin-pairing-controls">
      <button type="button" className="bf-panel-action" onClick={createCode} disabled={busy}>{phase === 'creating' ? <LoaderCircle className="bf-spin" size={15} /> : <KeyRound size={15} />}{pairing ? 'Refresh code' : 'Create pairing code'}</button>
      {pairing && <>
        <label className="bf-plugin-pairing-code"><span>One-time code{pairing.expiresAt ? ` · expires ${new Date(pairing.expiresAt).toLocaleTimeString()}` : ''}</span><div><input aria-label="Local engine pairing code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} autoComplete="one-time-code" /><button type="button" aria-label="Copy pairing code" onClick={copyCode}><Copy size={15} /></button></div></label>
        <button type="button" className="bf-panel-action" onClick={verify} disabled={busy || !code.trim()}>{phase === 'verifying' ? <LoaderCircle className="bf-spin" size={15} /> : <CheckCircle2 size={15} />}Pair browser</button>
      </>}
    </div>}
    {paired && <button type="button" className="bf-panel-action" onClick={disconnect}><Unplug size={15} />Disconnect this browser</button>}
    {message && <p className={phase === 'error' ? 'bf-plugin-pairing-message is-error' : 'bf-plugin-pairing-message'} role={phase === 'error' ? 'alert' : 'status'}>{message}</p>}
  </article>
}

function pairingFailureMessage(error: unknown, action: string) {
  const message = error instanceof Error ? error.message : ''
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return `BoardForge Desktop Helper is not reachable on this device. Start the helper, then retry to ${action}. Browser projects remain available without pairing.`
  }
  return message || `The local engine could not ${action}.`
}

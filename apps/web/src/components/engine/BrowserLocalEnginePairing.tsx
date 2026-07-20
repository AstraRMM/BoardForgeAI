'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Copy, KeyRound, LoaderCircle, PlugZap, Unplug } from 'lucide-react'
import { checkLocalEnginePairingConnection, clearLocalEngineBrowserSession, hasLocalEngineBrowserSession, requestLocalEnginePairingCode, verifyLocalEngineBrowserSession, type BrowserPairingCode, type LocalEnginePairingDiagnostic } from '../../lib/boardforge-local-engine-pairing-client'

type Phase = 'idle' | 'creating' | 'ready' | 'verifying' | 'paired' | 'error'

export function BrowserLocalEnginePairing() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [pairing, setPairing] = useState<BrowserPairingCode | null>(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [diagnostic, setDiagnostic] = useState<LocalEnginePairingDiagnostic | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (hasLocalEngineBrowserSession()) setPhase('paired')
      void checkConnection()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function checkConnection() {
    const next = await checkLocalEnginePairingConnection()
    setDiagnostic(next)
    return next
  }

  async function createCode() {
    setPhase('creating'); setMessage('')
    try {
      const connection = await checkConnection()
      if (!connection.reachable) throw new Error(connection.message)
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
      setPairing(null); setCode(''); setPhase('paired'); setMessage('This browser session can now authorize supported local-helper actions.')
    } catch (error) {
      setMessage(pairingFailureMessage(error, 'verify this pairing code')); setPhase('error')
    }
  }

  async function copyCode() {
    if (!code || !navigator.clipboard) return
    await navigator.clipboard.writeText(code)
    setMessage('Pairing code copied to the clipboard.')
  }

  async function copyLaunchCommand() {
    try {
      await navigator.clipboard.writeText('npm run boardforge:start')
      setMessage('Helper launch command copied. Run it from your local BoardForge workspace, then check the connection again.')
    } catch {
      setMessage('Copy is unavailable in this browser. From your local BoardForge workspace, run: npm run boardforge:start')
    }
  }

  function disconnect() {
    clearLocalEngineBrowserSession(); setPairing(null); setCode(''); setMessage('This browser session is disconnected. Browser-only work remains available.'); setPhase('idle')
  }

  const busy = phase === 'creating' || phase === 'verifying'
  const paired = phase === 'paired'
  return <article className="bf-workspace-panel bf-plugin-command">
    <div className="bf-panel-title"><div><p>Browser session</p><h2>{paired ? 'Helper paired for this browser' : 'Pair for helper-backed actions'}</h2></div>{paired ? <CheckCircle2 size={20} /> : <KeyRound size={20} />}</div>
    <p className="bf-project-workspace-note">{paired ? 'Supported browser-origin helper POST actions use a session-only token until you disconnect or close this browser.' : 'Pairing is optional for browser-only drafts and review. Create a one-time code from the local helper only when you need a supported local-engine action.'}</p>
    <div className={`bf-plugin-connection${diagnostic?.reachable ? ' is-ready' : diagnostic ? ' is-error' : ''}`} role="status">
      <PlugZap size={15} /><span>{diagnostic ? diagnostic.message : 'Checking whether the desktop helper is reachable…'}</span>
      <button type="button" onClick={() => void checkConnection()} disabled={busy}>Check connection</button>
    </div>
    {!paired && <div className="bf-plugin-pairing-controls">
      <button type="button" className="bf-panel-action" onClick={createCode} disabled={busy || diagnostic?.reachable === false}>{phase === 'creating' ? <LoaderCircle className="bf-spin" size={15} /> : <KeyRound size={15} />}{pairing ? 'Refresh code' : 'Get one-time code'}</button>
      {pairing && <>
        <label className="bf-plugin-pairing-code"><span>One-time code{pairing.expiresAt ? ` · expires ${new Date(pairing.expiresAt).toLocaleTimeString()}` : ''}</span><div><input aria-label="Local engine pairing code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} autoComplete="one-time-code" /><button type="button" aria-label="Copy pairing code" onClick={copyCode}><Copy size={15} /></button></div></label>
        <button type="button" className="bf-panel-action" onClick={verify} disabled={busy || !code.trim()}>{phase === 'verifying' ? <LoaderCircle className="bf-spin" size={15} /> : <CheckCircle2 size={15} />}Pair browser</button>
      </>}
    </div>}
    {diagnostic && !diagnostic.reachable && <section className="bf-plugin-recovery" aria-labelledby="helper-recovery-title">
      <div>
        <strong id="helper-recovery-title">Start the helper on this device</strong>
        <p>The website cannot start desktop software itself. In a terminal opened in your local BoardForge workspace, run this command. It starts the localhost-only helper at 127.0.0.1:38991.</p>
      </div>
      <div className="bf-plugin-recovery-command"><code>npm run boardforge:start</code><button type="button" onClick={copyLaunchCommand}><Copy size={15} />Copy command</button></div>
      <ol><li>Run the command from the BoardForge folder on this same computer.</li><li>Keep that terminal running while you use helper-backed actions.</li><li>Return here and select <b>Check connection</b>. Only then can you request a one-time code.</li></ol>
    </section>}
    {paired && <button type="button" className="bf-panel-action" onClick={disconnect}><Unplug size={15} />Disconnect this browser</button>}
    {message && <p className={phase === 'error' ? 'bf-plugin-pairing-message is-error' : 'bf-plugin-pairing-message'} role={phase === 'error' ? 'alert' : 'status'}>{message}</p>}
  </article>
}

function pairingFailureMessage(error: unknown, action: string) {
  const message = error instanceof Error ? error.message : ''
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return `BoardForge Desktop Helper is not reachable on this device. Start the helper, then retry to ${action}. Browser-only drafts and review remain available without pairing.`
  }
  return message || `The local engine could not ${action}.`
}

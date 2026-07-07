'use client'

import { useMemo, useState } from 'react'
import { ClipboardCopy, Download, Grid2X2, MousePointer2, Pencil, RotateCcw, Sparkles } from 'lucide-react'
import { outlinePresets } from '../../lib/outline-export'

type Point = { x: number; y: number }
type Hole = { ref: string; x: number; y: number; diameterMm: number }
const outlineArtifactSummary = 'Creates a board outline seed, mechanical constraints, and validation notes for the local KiCad engine.'

const presetPoints: Record<string, Point[]> = {
  'rounded-rectangle': [{ x: 4, y: 0 }, { x: 66, y: 0 }, { x: 70, y: 4 }, { x: 70, y: 41 }, { x: 66, y: 45 }, { x: 4, y: 45 }, { x: 0, y: 41 }, { x: 0, y: 4 }],
  'mounting-ears': [{ x: 8, y: 0 }, { x: 74, y: 0 }, { x: 82, y: 8 }, { x: 82, y: 19 }, { x: 78, y: 24 }, { x: 82, y: 29 }, { x: 82, y: 40 }, { x: 74, y: 48 }, { x: 8, y: 48 }, { x: 0, y: 40 }, { x: 0, y: 29 }, { x: 4, y: 24 }, { x: 0, y: 19 }, { x: 0, y: 8 }],
  'octagon-chamfered': [{ x: 8, y: 0 }, { x: 52, y: 0 }, { x: 60, y: 8 }, { x: 60, y: 34 }, { x: 52, y: 42 }, { x: 8, y: 42 }, { x: 0, y: 34 }, { x: 0, y: 8 }],
  'l-shape': [{ x: 0, y: 0 }, { x: 72, y: 0 }, { x: 72, y: 31 }, { x: 42, y: 31 }, { x: 42, y: 56 }, { x: 0, y: 56 }],
  'u-shape': [{ x: 0, y: 0 }, { x: 78, y: 0 }, { x: 78, y: 58 }, { x: 52, y: 58 }, { x: 52, y: 24 }, { x: 26, y: 24 }, { x: 26, y: 58 }, { x: 0, y: 58 }],
  notched: [{ x: 0, y: 0 }, { x: 68, y: 0 }, { x: 68, y: 42 }, { x: 0, y: 42 }, { x: 0, y: 26 }, { x: 8, y: 23 }, { x: 8, y: 18 }, { x: 0, y: 15 }],
  'drone-stack': [{ x: 4, y: 0 }, { x: 38, y: 0 }, { x: 42, y: 4 }, { x: 42, y: 38 }, { x: 38, y: 42 }, { x: 4, y: 42 }, { x: 0, y: 38 }, { x: 0, y: 4 }],
  'wearable-puck': Array.from({ length: 16 }, (_, i) => ({ x: 22 + Math.cos(-Math.PI / 2 + (Math.PI * 2 * i) / 16) * 22, y: 22 + Math.sin(-Math.PI / 2 + (Math.PI * 2 * i) / 16) * 22 })),
  'robotics-controller': [{ x: 5, y: 0 }, { x: 85, y: 0 }, { x: 90, y: 5 }, { x: 90, y: 47 }, { x: 85, y: 52 }, { x: 5, y: 52 }, { x: 0, y: 47 }, { x: 0, y: 5 }],
  'crazy-polygon-valid': [{ x: 6, y: 4 }, { x: 28, y: 0 }, { x: 68, y: 8 }, { x: 76, y: 24 }, { x: 62, y: 52 }, { x: 40, y: 58 }, { x: 32, y: 43 }, { x: 18, y: 55 }, { x: 0, y: 34 }, { x: 5, y: 21 }],
  'decorative-shield': [{ x: 32, y: 0 }, { x: 60, y: 5 }, { x: 64, y: 33 }, { x: 44, y: 54 }, { x: 32, y: 49 }, { x: 20, y: 54 }, { x: 0, y: 33 }, { x: 4, y: 5 }],
}

export function OutlineEditor() {
  const [preset, setPreset] = useState('mounting-ears')
  const [points, setPoints] = useState<Point[]>(presetPoints[preset])
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null)
  const [snap, setSnap] = useState(true)
  const [mode, setMode] = useState<'points' | 'draw'>('points')
  const [status, setStatus] = useState<string>('Ready')
  const [copied, setCopied] = useState(false)

  const holes = useMemo<Hole[]>(() => {
    const box = bounds(points)
    if (preset === 'drone-stack') return [
      { ref: 'H20-1', x: 11, y: 11, diameterMm: 2.2 }, { ref: 'H20-2', x: 31, y: 11, diameterMm: 2.2 }, { ref: 'H20-3', x: 31, y: 31, diameterMm: 2.2 }, { ref: 'H20-4', x: 11, y: 31, diameterMm: 2.2 },
      { ref: 'H30-1', x: 5.75, y: 5.75, diameterMm: 2.2 }, { ref: 'H30-2', x: 36.25, y: 5.75, diameterMm: 2.2 }, { ref: 'H30-3', x: 36.25, y: 36.25, diameterMm: 2.2 }, { ref: 'H30-4', x: 5.75, y: 36.25, diameterMm: 2.2 },
    ]
    return [
      { ref: 'H1', x: box.minX + 5, y: box.minY + 5, diameterMm: 2.4 },
      { ref: 'H2', x: box.maxX - 5, y: box.minY + 5, diameterMm: 2.4 },
      { ref: 'H3', x: box.maxX - 5, y: box.maxY - 5, diameterMm: 2.4 },
      { ref: 'H4', x: box.minX + 5, y: box.maxY - 5, diameterMm: 2.4 },
    ]
  }, [points, preset])

  const box = bounds(points)
  const viewBox = `${box.minX - 8} ${box.minY - 8} ${Math.max(30, box.width + 16)} ${Math.max(30, box.height + 16)}`
  const score = Math.max(0, Math.min(100, Math.round(94 - points.length * 1.6 - (box.width * box.height < 900 ? 18 : 0))))
  const prompt = `Use BoardForge custom_outline_generate_kicad with this exact outline. Preserve every Edge.Cuts point in millimeters: ${JSON.stringify(points)}. Mounting holes: ${JSON.stringify(holes)}. Connector intent: keep edge connectors accessible. Validate self-intersection, hole edge clearance, component fit, routeability, manufacturing risk, KiCad Edge.Cuts loadability, then generate an outline-only KiCad project if valid.`

  function choosePreset(nextPreset: string) {
    setPreset(nextPreset)
    setPoints(presetPoints[nextPreset] || presetPoints['rounded-rectangle'])
    setSelectedPoint(null)
    setStatus(`Loaded ${nextPreset}`)
  }

  function canvasPoint(event: React.PointerEvent<SVGSVGElement>) {
    const svg = event.currentTarget
    const rect = svg.getBoundingClientRect()
    const [vx, vy, vw, vh] = viewBox.split(' ').map(Number)
    const x = vx + ((event.clientX - rect.left) / rect.width) * vw
    const y = vy + ((event.clientY - rect.top) / rect.height) * vh
    return snap ? { x: Math.round(x), y: Math.round(y) } : { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) }
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    const p = canvasPoint(event)
    const hit = nearestPoint(points, p)
    if (hit.distance < 3) {
      setSelectedPoint(hit.index)
      return
    }
    if (mode === 'points') {
      setPoints((current) => [...current, p])
      setSelectedPoint(points.length)
    }
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (selectedPoint === null || event.buttons !== 1) return
    const p = canvasPoint(event)
    setPoints((current) => current.map((point, index) => (index === selectedPoint ? p : point)))
  }

  async function callLocal(action: 'validate' | 'generate') {
    const body = JSON.stringify({ preset, id: `BF-OUTLINE-WEB-${Date.now()}`, points, holes })
    const path = action === 'validate' ? '/outline/validate' : '/outline/generate-kicad'
    try {
      const response = await fetch(`http://127.0.0.1:38991${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
      const data = await response.json()
      setStatus(`${data.status}${data.data?.manifest?.projectDir ? ` - ${data.data.manifest.projectDir}` : ''}`)
    } catch {
      setStatus('Local engine not paired. Use the Codex prompt or start BoardForge Local Engine.')
    }
  }

  function downloadSeed() {
    const seed = { schema: 'boardforge.custom-outline-project-seed.web.v1', preset, outline: points, holes, prompt }
    const blob = new Blob([JSON.stringify(seed, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'BoardForge_Custom_Outline_Project_Seed.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <section className="bf-outline-workbench">
      <div className="bf-outline-toolbar">
        <label>
          <span>Preset</span>
          <select value={preset} onChange={(event) => choosePreset(event.target.value)}>
            {outlinePresets.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <button type="button" className={mode === 'points' ? 'active' : ''} onClick={() => setMode('points')}><MousePointer2 size={15} /> Points</button>
        <button type="button" className={mode === 'draw' ? 'active' : ''} onClick={() => setMode('draw')}><Pencil size={15} /> Draw</button>
        <button type="button" className={snap ? 'active' : ''} onClick={() => setSnap(!snap)}><Grid2X2 size={15} /> Snap</button>
        <button type="button" onClick={() => choosePreset(preset)}><RotateCcw size={15} /> Reset</button>
      </div>
      <div className="bf-outline-studio">
        <svg viewBox={viewBox} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={() => setSelectedPoint(null)} role="img" aria-label="Custom board outline editor">
          <defs>
            <pattern id="bf-outline-grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(124,245,208,.13)" strokeWidth=".18" /></pattern>
          </defs>
          <rect x={box.minX - 8} y={box.minY - 8} width={Math.max(30, box.width + 16)} height={Math.max(30, box.height + 16)} fill="url(#bf-outline-grid)" />
          <polygon points={points.map((point) => `${point.x},${point.y}`).join(' ')} fill="rgba(18,109,97,.82)" stroke="#7cf5d0" strokeWidth=".55" />
          {holes.map((hole) => <circle key={hole.ref} cx={hole.x} cy={hole.y} r={hole.diameterMm / 2} fill="none" stroke="#f8d24a" strokeWidth=".5" />)}
          {points.map((point, index) => <circle key={`${point.x}-${point.y}-${index}`} cx={point.x} cy={point.y} r={selectedPoint === index ? 1.6 : 1.05} fill={selectedPoint === index ? '#2f86ff' : '#f8d24a'} />)}
        </svg>
        <div className="bf-outline-side">
          <div><span>Dimensions</span><strong>{Math.round(box.width)} x {Math.round(box.height)} mm</strong></div>
          <div><span>Outline points</span><strong>{points.length}</strong></div>
          <div><span>Routeability</span><strong>{score}/100</strong></div>
          <div><span>Manufacturing risk</span><strong>{score > 75 ? 'Low' : score > 55 ? 'Medium' : 'High'}</strong></div>
          <button type="button" onClick={() => callLocal('validate')}><Sparkles size={16} /> Validate with local engine</button>
          <button type="button" onClick={() => callLocal('generate')}><Download size={16} /> Generate KiCad outline</button>
          <button type="button" onClick={downloadSeed}>Download seed JSON</button>
        </div>
      </div>
      <div className="bf-outline-status">
        <strong>{status}</strong>
        <span>{outlineArtifactSummary}</span>
        <div className="bf-outline-handoff">
          <div>
            <b>Codex handoff ready</b>
            <p>
              Exact outline points, mounting holes, connector intent, and validation requirements are packaged for the
              BoardForge plugin when you copy the prompt or download the seed.
            </p>
          </div>
          <button type="button" onClick={copyPrompt}>
            <ClipboardCopy size={15} /> {copied ? 'Copied' : 'Copy prompt'}
          </button>
        </div>
      </div>
    </section>
  )
}

function bounds(points: Point[]) {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY }
}

function nearestPoint(points: Point[], target: Point) {
  return points.reduce((best, point, index) => {
    const distance = Math.hypot(point.x - target.x, point.y - target.y)
    return distance < best.distance ? { index, distance } : best
  }, { index: -1, distance: Number.POSITIVE_INFINITY })
}

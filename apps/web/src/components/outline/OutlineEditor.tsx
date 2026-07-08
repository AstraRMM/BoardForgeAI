'use client'

import { useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { ClipboardCopy, Download, Grid2X2, MousePointer2, Pencil, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import { outlinePresets } from '../../lib/outline-export'

type Point = { x: number; y: number }
type Hole = { ref: string; x: number; y: number; diameterMm: number }
type Mode = 'points' | 'draw' | 'delete'
type ValidationResult = {
  valid: boolean
  routeability: number
  risk: 'Low' | 'Medium' | 'High' | 'Blocked'
  checks: Array<{ label: string; pass: boolean; reason: string }>
  blockers: string[]
}

const outlineArtifactSummary = 'Creates an exact Edge.Cuts seed, mechanical constraints, and validation notes for the local KiCad engine.'

const presetPoints: Record<string, Point[]> = {
  'rounded-rectangle': [{ x: 4, y: 0 }, { x: 66, y: 0 }, { x: 70, y: 4 }, { x: 70, y: 41 }, { x: 66, y: 45 }, { x: 4, y: 45 }, { x: 0, y: 41 }, { x: 0, y: 4 }],
  'mounting-ears': [{ x: 8, y: 0 }, { x: 74, y: 0 }, { x: 82, y: 8 }, { x: 82, y: 19 }, { x: 78, y: 24 }, { x: 82, y: 29 }, { x: 82, y: 40 }, { x: 74, y: 48 }, { x: 8, y: 48 }, { x: 0, y: 40 }, { x: 0, y: 29 }, { x: 4, y: 24 }, { x: 0, y: 19 }, { x: 0, y: 8 }],
  'octagon-chamfered': [{ x: 8, y: 0 }, { x: 52, y: 0 }, { x: 60, y: 8 }, { x: 60, y: 34 }, { x: 52, y: 42 }, { x: 8, y: 42 }, { x: 0, y: 34 }, { x: 0, y: 8 }],
  'l-shape': [{ x: 0, y: 0 }, { x: 72, y: 0 }, { x: 72, y: 31 }, { x: 42, y: 31 }, { x: 42, y: 56 }, { x: 0, y: 56 }],
  'u-shape': [{ x: 0, y: 0 }, { x: 78, y: 0 }, { x: 78, y: 58 }, { x: 52, y: 58 }, { x: 52, y: 24 }, { x: 26, y: 24 }, { x: 26, y: 58 }, { x: 0, y: 58 }],
  notched: [{ x: 0, y: 0 }, { x: 68, y: 0 }, { x: 68, y: 42 }, { x: 0, y: 42 }, { x: 0, y: 26 }, { x: 8, y: 23 }, { x: 8, y: 18 }, { x: 0, y: 15 }],
  'drone-stack': [{ x: 4, y: 0 }, { x: 38, y: 0 }, { x: 42, y: 4 }, { x: 42, y: 38 }, { x: 38, y: 42 }, { x: 4, y: 42 }, { x: 0, y: 38 }, { x: 0, y: 4 }],
  'wearable-puck': Array.from({ length: 18 }, (_, i) => ({ x: 24 + Math.cos(-Math.PI / 2 + (Math.PI * 2 * i) / 18) * 24, y: 24 + Math.sin(-Math.PI / 2 + (Math.PI * 2 * i) / 18) * 24 })),
  'robotics-controller': [{ x: 5, y: 0 }, { x: 85, y: 0 }, { x: 90, y: 5 }, { x: 90, y: 47 }, { x: 85, y: 52 }, { x: 5, y: 52 }, { x: 0, y: 47 }, { x: 0, y: 5 }],
  'crazy-polygon-valid': [{ x: 6, y: 4 }, { x: 28, y: 0 }, { x: 68, y: 8 }, { x: 76, y: 24 }, { x: 62, y: 52 }, { x: 40, y: 58 }, { x: 32, y: 43 }, { x: 18, y: 55 }, { x: 0, y: 34 }, { x: 5, y: 21 }],
  'decorative-shield': [{ x: 32, y: 0 }, { x: 60, y: 5 }, { x: 64, y: 33 }, { x: 44, y: 54 }, { x: 32, y: 49 }, { x: 20, y: 54 }, { x: 0, y: 33 }, { x: 4, y: 5 }],
}

export function OutlineEditor() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const drawingRef = useRef(false)
  const [preset, setPreset] = useState('mounting-ears')
  const [points, setPoints] = useState<Point[]>(clonePoints(presetPoints[preset]))
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null)
  const [snap, setSnap] = useState(true)
  const [mode, setMode] = useState<Mode>('points')
  const [holeCount, setHoleCount] = useState(4)
  const [status, setStatus] = useState<string>('Ready - choose a preset, edit points, or draw a custom outline.')
  const [copied, setCopied] = useState(false)

  const box = useMemo(() => bounds(points), [points])
  const viewBox = `${box.minX - 10} ${box.minY - 10} ${Math.max(36, box.width + 20)} ${Math.max(36, box.height + 20)}`
  const holes = useMemo(() => buildHoles(points, preset, holeCount), [points, preset, holeCount])
  const validation = useMemo(() => validateOutline(points, holes), [points, holes])
  const prompt = useMemo(() => buildCodexPrompt({ preset, points, holes, validation }), [preset, points, holes, validation])
  const statusTone = validation.valid ? 'valid' : 'blocked'

  function choosePreset(nextPreset: string) {
    setPreset(nextPreset)
    setPoints(clonePoints(presetPoints[nextPreset] || presetPoints['rounded-rectangle']))
    setSelectedPoint(null)
    setHoleCount(nextPreset === 'drone-stack' ? 8 : 4)
    setStatus(`Loaded ${labelForPreset(nextPreset)}. Outline is ready for edit and validation.`)
  }

  function canvasPoint(event: ReactPointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (!svg || !matrix) return { x: 0, y: 0 }
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    const normalized = { x: clamp(point.x, box.minX - 10, box.maxX + 10), y: clamp(point.y, box.minY - 10, box.maxY + 10) }
    if (!snap) return { x: Number(normalized.x.toFixed(2)), y: Number(normalized.y.toFixed(2)) }
    return { x: Math.round(normalized.x), y: Math.round(normalized.y) }
  }

  function startPointer(event: ReactPointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    const p = canvasPoint(event)
    const hit = nearestPoint(points, p)
    if (mode === 'delete' || event.altKey) {
      if (hit.distance < 3.5) deletePoint(hit.index)
      return
    }
    if (hit.distance < 3.5) {
      setSelectedPoint(hit.index)
      setStatus(`Selected point ${hit.index + 1}. Drag to move it, or use delete mode to remove it.`)
      return
    }
    if (mode === 'points') {
      setPoints((current) => insertPoint(current, p))
      setSelectedPoint(points.length)
      setStatus('Point added. Drag vertices to refine the outline.')
      return
    }
    drawingRef.current = true
    setSelectedPoint(null)
    setPoints((current) => appendDrawPoint(current, p, snap ? 2 : 1.2))
    setStatus('Drawing outline. Release anytime and continue from the same shape.')
  }

  function movePointer(event: ReactPointerEvent<SVGSVGElement>) {
    const p = canvasPoint(event)
    if (selectedPoint !== null && event.buttons === 1) {
      setPoints((current) => current.map((point, index) => (index === selectedPoint ? p : point)))
      return
    }
    if (mode === 'draw' && drawingRef.current && event.buttons === 1) {
      setPoints((current) => appendDrawPoint(current, p, snap ? 2 : 1.2))
    }
  }

  function endPointer(event: ReactPointerEvent<SVGSVGElement>) {
    drawingRef.current = false
    setSelectedPoint(null)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // Pointer may already be released by the browser.
    }
  }

  function deletePoint(index: number) {
    if (points.length <= 3) {
      setStatus('Blocked: keep at least three outline points.')
      return
    }
    setPoints((current) => current.filter((_, pointIndex) => pointIndex !== index))
    setSelectedPoint(null)
    setStatus(`Deleted point ${index + 1}.`)
  }

  async function callLocal(action: 'validate' | 'generate') {
    if (action === 'generate' && !validation.valid) {
      setStatus(`Blocked: ${validation.blockers[0] || 'outline validation failed'}`)
      return
    }
    const body = JSON.stringify({ preset, id: `BF-OUTLINE-WEB-${Date.now()}`, points, holes, validation })
    const path = action === 'validate' ? '/outline/validate' : '/outline/generate-kicad'
    try {
      const response = await fetch(`http://127.0.0.1:38991${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
      const data = await response.json()
      setStatus(`${data.status}${data.data?.manifest?.projectDir ? ` - ${data.data.manifest.projectDir}` : ''}`)
    } catch {
      setStatus(action === 'generate' ? 'Local engine not paired. Generation stayed blocked locally; copy the Codex prompt or start BoardForge Local Engine.' : 'Local engine not paired. Browser validation is shown; start BoardForge Local Engine for KiCad checks.')
    }
  }

  function downloadSeed() {
    const seed = { schema: 'boardforge.custom-outline-project-seed.web.v2', preset, outline: points, holes, validation, prompt }
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
        <button type="button" className={mode === 'delete' ? 'active danger' : ''} onClick={() => setMode('delete')}><Trash2 size={15} /> Delete</button>
        <button type="button" className={snap ? 'active' : ''} onClick={() => setSnap(!snap)}><Grid2X2 size={15} /> Snap</button>
        <button type="button" onClick={() => choosePreset(preset)}><RotateCcw size={15} /> Reset</button>
      </div>
      <div className="bf-outline-studio">
        <svg
          ref={svgRef}
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={startPointer}
          onPointerMove={movePointer}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onDoubleClick={(event) => {
            const p = canvasPoint(event as unknown as ReactPointerEvent<SVGSVGElement>)
            const hit = nearestPoint(points, p)
            if (hit.distance < 3.5) deletePoint(hit.index)
          }}
          role="img"
          aria-label="Custom board outline editor"
        >
          <defs>
            <pattern id="bf-outline-grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(124,245,208,.13)" strokeWidth=".18" /></pattern>
            <filter id="bf-outline-editor-shadow" x="-20%" y="-30%" width="140%" height="170%">
              <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000" floodOpacity=".4" />
            </filter>
          </defs>
          <rect x={box.minX - 10} y={box.minY - 10} width={Math.max(36, box.width + 20)} height={Math.max(36, box.height + 20)} fill="url(#bf-outline-grid)" />
          {points.length > 1 && <polyline className="bf-editor-open-path" points={toSvgPoints(points)} />}
          {points.length > 2 && <polygon className={validation.valid ? 'bf-editor-polygon valid' : 'bf-editor-polygon blocked'} points={toSvgPoints(points)} filter="url(#bf-outline-editor-shadow)" />}
          {holes.map((hole) => (
            <g key={hole.ref} className={pointInPolygon(hole, points) ? 'bf-editor-hole' : 'bf-editor-hole invalid'}>
              <circle cx={hole.x} cy={hole.y} r={hole.diameterMm * 1.6} />
              <circle cx={hole.x} cy={hole.y} r={hole.diameterMm / 2} />
            </g>
          ))}
          {points.map((point, index) => (
            <g key={`${point.x}-${point.y}-${index}`} className={selectedPoint === index ? 'bf-editor-point selected' : 'bf-editor-point'}>
              <circle cx={point.x} cy={point.y} r={selectedPoint === index ? 2.35 : 1.65} />
              <text x={point.x + 2.4} y={point.y - 2.2}>{index + 1}</text>
            </g>
          ))}
        </svg>
        <aside className="bf-outline-side">
          <div><span>Dimensions</span><strong>{box.width.toFixed(1)} x {box.height.toFixed(1)} mm</strong></div>
          <div><span>Outline points</span><strong>{points.length}</strong></div>
          <div><span>Routeability</span><strong>{validation.routeability}/100</strong></div>
          <div><span>Manufacturing risk</span><strong className={`risk-${validation.risk.toLowerCase()}`}>{validation.risk}</strong></div>
          <div className="bf-outline-hole-control">
            <span>Mounting holes</span>
            <strong>{holes.length}</strong>
            <button type="button" onClick={() => setHoleCount((value) => clamp(value - 1, 0, 8))}>-</button>
            <button type="button" onClick={() => setHoleCount((value) => clamp(value + 1, 0, 8))}><Plus size={14} /></button>
          </div>
          <button type="button" onClick={() => callLocal('validate')}><Sparkles size={16} /> Validate with local engine</button>
          <button type="button" className={!validation.valid ? 'blocked' : ''} onClick={() => callLocal('generate')} aria-disabled={!validation.valid}><Download size={16} /> Generate KiCad outline</button>
          <button type="button" onClick={downloadSeed}>Download seed JSON</button>
        </aside>
      </div>
      <div className="bf-outline-status">
        <strong className={`bf-outline-state ${statusTone}`}>{validation.valid ? 'Valid outline' : 'Outline blocked'}</strong>
        <span>{status}</span>
        <span>{outlineArtifactSummary}</span>
        <div className="bf-outline-validation-chips">
          {validation.checks.map((check) => (
            <span key={check.label} className={check.pass ? 'pass' : 'fail'} title={check.reason}>{check.label}</span>
          ))}
        </div>
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

function buildCodexPrompt({ preset, points, holes, validation }: { preset: string; points: Point[]; holes: Hole[]; validation: ValidationResult }) {
  return `Use the BoardForge Codex Plugin to create an outline-only KiCad project from this custom board outline.

Requirements:
- Preserve every Edge.Cuts point exactly in millimeters.
- Generate an empty schematic and a .kicad_pcb containing only the board outline, mounting holes, labels, and review notes.
- Do not place components, route copper, or claim manufacturing readiness.
- Validate self-intersection, hole edge clearance, component fit, routeability, and KiCad Edge.Cuts loadability.
- If validation fails, stop and report exact blockers.

Outline preset: ${preset}
Browser validation: ${validation.valid ? 'valid' : `blocked - ${validation.blockers.join('; ')}`}

JSON payload:
\`\`\`json
${JSON.stringify({ preset, outlinePointsMm: points, mountingHolesMm: holes, browserValidation: validation }, null, 2)}
\`\`\``
}

function buildHoles(points: Point[], preset: string, count: number): Hole[] {
  if (!points.length || count <= 0) return []
  if (preset === 'drone-stack') {
    const stack = [
      { ref: 'H20-1', x: 11, y: 11, diameterMm: 2.2 }, { ref: 'H20-2', x: 31, y: 11, diameterMm: 2.2 }, { ref: 'H20-3', x: 31, y: 31, diameterMm: 2.2 }, { ref: 'H20-4', x: 11, y: 31, diameterMm: 2.2 },
      { ref: 'H30-1', x: 5.75, y: 5.75, diameterMm: 2.2 }, { ref: 'H30-2', x: 36.25, y: 5.75, diameterMm: 2.2 }, { ref: 'H30-3', x: 36.25, y: 36.25, diameterMm: 2.2 }, { ref: 'H30-4', x: 5.75, y: 36.25, diameterMm: 2.2 },
    ]
    return stack.slice(0, count)
  }
  const box = bounds(points)
  const inset = Math.min(6, Math.max(3.2, Math.min(box.width, box.height) * 0.12))
  const candidates: Point[] = [
    { x: box.minX + inset, y: box.minY + inset },
    { x: box.maxX - inset, y: box.minY + inset },
    { x: box.maxX - inset, y: box.maxY - inset },
    { x: box.minX + inset, y: box.maxY - inset },
    { x: (box.minX + box.maxX) / 2, y: box.minY + inset },
    { x: box.maxX - inset, y: (box.minY + box.maxY) / 2 },
    { x: (box.minX + box.maxX) / 2, y: box.maxY - inset },
    { x: box.minX + inset, y: (box.minY + box.maxY) / 2 },
  ]
  return candidates.slice(0, count).map((point, index) => ({ ref: `H${index + 1}`, ...point, diameterMm: 2.4 }))
}

function validateOutline(points: Point[], holes: Hole[]): ValidationResult {
  const box = bounds(points)
  const area = Math.abs(polygonArea(points))
  const intersections = countIntersections(points)
  const minEdge = points.length > 1 ? Math.min(...points.map((point, index) => distance(point, points[(index + 1) % points.length]))) : 0
  const holesInside = holes.every((hole) => pointInPolygon(hole, points))
  const holesClear = holes.every((hole) => distanceToPolygonEdges(hole, points) >= Math.max(2.2, hole.diameterMm * 0.9))
  const checks = [
    { label: 'Closed outline', pass: points.length >= 3, reason: points.length >= 3 ? 'Three or more Edge.Cuts vertices are present.' : 'Add at least three outline points.' },
    { label: 'No self-intersections', pass: intersections === 0, reason: intersections === 0 ? 'No crossing outline segments detected.' : `${intersections} crossing segment pair(s) detected.` },
    { label: 'Minimum edge length', pass: minEdge >= 2, reason: minEdge >= 2 ? 'No tiny zero-length or near-zero Edge.Cuts segments.' : 'One or more outline edges are too short for reliable fabrication.' },
    { label: 'Board area', pass: area >= 280, reason: area >= 280 ? 'Mechanical area is large enough for a real outline seed.' : 'Board area is too small for reliable connector, hole, and route planning.' },
    { label: 'Hole clearance OK', pass: holesInside && holesClear, reason: holesInside && holesClear ? 'Mounting holes are inside the outline with edge clearance.' : 'One or more mounting holes are outside the board or too close to Edge.Cuts.' },
    { label: 'Aspect ratio OK', pass: box.width / Math.max(1, box.height) < 5 && box.height / Math.max(1, box.width) < 5, reason: 'Outline aspect ratio is checked for routeability.' },
  ]
  const blockers = checks.filter((check) => !check.pass).map((check) => check.reason)
  const narrowPenalty = Math.min(18, Math.max(0, 16 - Math.min(box.width, box.height)))
  const complexityPenalty = Math.max(0, points.length - 8) * 1.4
  const routeability = blockers.length ? Math.max(0, Math.round(58 - blockers.length * 12 - complexityPenalty)) : Math.max(45, Math.min(100, Math.round(96 - complexityPenalty - narrowPenalty)))
  const risk = blockers.length ? 'Blocked' : routeability > 78 ? 'Low' : routeability > 60 ? 'Medium' : 'High'
  return { valid: blockers.length === 0, routeability, risk, checks, blockers }
}

function bounds(points: Point[]) {
  if (!points.length) return { minX: 0, maxX: 60, minY: 0, maxY: 42, width: 60, height: 42 }
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
    const pointDistance = distance(point, target)
    return pointDistance < best.distance ? { index, distance: pointDistance } : best
  }, { index: -1, distance: Number.POSITIVE_INFINITY })
}

function insertPoint(points: Point[], point: Point) {
  if (points.length < 3) return [...points, point]
  let bestIndex = points.length
  let bestDistance = Number.POSITIVE_INFINITY
  points.forEach((start, index) => {
    const end = points[(index + 1) % points.length]
    const segmentDistance = distanceToSegment(point, start, end)
    if (segmentDistance < bestDistance) {
      bestDistance = segmentDistance
      bestIndex = index + 1
    }
  })
  const next = [...points]
  next.splice(bestIndex, 0, point)
  return next
}

function appendDrawPoint(points: Point[], point: Point, threshold: number) {
  const last = points[points.length - 1]
  if (last && distance(last, point) < threshold) return points
  return [...points, point]
}

function countIntersections(points: Point[]) {
  if (points.length < 4) return 0
  let intersections = 0
  for (let i = 0; i < points.length; i += 1) {
    const a1 = points[i]
    const a2 = points[(i + 1) % points.length]
    for (let j = i + 1; j < points.length; j += 1) {
      const adjacent = Math.abs(i - j) <= 1 || (i === 0 && j === points.length - 1)
      if (adjacent) continue
      const b1 = points[j]
      const b2 = points[(j + 1) % points.length]
      if (segmentsIntersect(a1, a2, b1, b2)) intersections += 1
    }
  }
  return intersections
}

function pointInPolygon(point: Point, polygon: Point[]) {
  if (polygon.length < 3) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 1e-9) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function distanceToPolygonEdges(point: Point, polygon: Point[]) {
  if (polygon.length < 2) return 0
  return Math.min(...polygon.map((start, index) => distanceToSegment(point, start, polygon[(index + 1) % polygon.length])))
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  const o1 = orientation(a, b, c)
  const o2 = orientation(a, b, d)
  const o3 = orientation(c, d, a)
  const o4 = orientation(c, d, b)
  return o1 !== o2 && o3 !== o4
}

function orientation(a: Point, b: Point, c: Point) {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)
  return value > 0 ? 1 : value < 0 ? 2 : 0
}

function polygonArea(points: Point[]) {
  return points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]
    return sum + point.x * next.y - next.x * point.y
  }, 0) / 2
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (dx === 0 && dy === 0) return distance(point, start)
  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy), 0, 1)
  return distance(point, { x: start.x + t * dx, y: start.y + t * dy })
}

function toSvgPoints(points: Point[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

function clonePoints(points: Point[]) {
  return points.map((point) => ({ ...point }))
}

function labelForPreset(id: string) {
  return outlinePresets.find((preset) => preset.id === id)?.label || id
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

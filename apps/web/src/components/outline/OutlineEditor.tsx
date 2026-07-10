'use client'

import { useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { CheckCircle2, ClipboardCopy, Copy, Cpu, Download, Grid2X2, Layers3, MousePointer2, Pencil, Plus, RotateCcw, Ruler, ShieldCheck, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { outlinePresets } from '../../lib/outline-export'

type Point = { x: number; y: number }
type Hole = { ref: string; x: number; y: number; diameterMm: number; keepoutMm?: number; plating?: 'plated' | 'non-plated'; locked?: boolean }
type Mode = 'select' | 'add-point' | 'draw'
type SelectedObject = { type: 'point'; index: number } | { type: 'hole'; ref: string } | null
type AutoFixProposal = {
  points: Point[]
  holes: Hole[]
  changes: string[]
  before: ValidationResult
  after: ValidationResult
}
type BoardMetrics = {
  dimensionsMm: { width: number; height: number }
  boundingBoxMm: { minX: number; minY: number; maxX: number; maxY: number }
  areaMm2: number
  areaCm2: number
  perimeterMm: number
  outlinePointCount: number
  mountingHoleCount: number
  holesInsideOutline: number
}
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
  const [holes, setHoles] = useState<Hole[]>(() => buildHoles(presetPoints[preset], preset, 4))
  const [selectedObject, setSelectedObject] = useState<SelectedObject>(null)
  const [multiSelect, setMultiSelect] = useState(false)
  const [snap, setSnap] = useState(true)
  const [mode, setMode] = useState<Mode>('select')
  const [status, setStatus] = useState<string>('Ready - choose a preset, edit points, or draw a custom outline.')
  const [copied, setCopied] = useState(false)
  const [showPromptPanel, setShowPromptPanel] = useState(false)
  const [autoFixProposal, setAutoFixProposal] = useState<AutoFixProposal | null>(null)

  const box = useMemo(() => bounds(points), [points])
  const viewBox = `${box.minX - 10} ${box.minY - 10} ${Math.max(36, box.width + 20)} ${Math.max(36, box.height + 20)}`
  const validation = useMemo(() => validateOutline(points, holes), [points, holes])
  const metrics = useMemo(() => buildBoardMetrics(points, holes), [points, holes])
  const prompt = useMemo(() => buildCodexPrompt({ preset, points, holes, validation, metrics }), [preset, points, holes, validation, metrics])
  const statusTone = validation.valid ? 'valid' : 'blocked'
  const areaMm2 = useMemo(() => Math.abs(polygonArea(points)), [points])
  const edgeLength = useMemo(() => totalEdgeLength(points), [points])
  const holesInside = useMemo(() => holes.filter((hole) => pointInPolygon(hole, points)).length, [holes, points])
  const areaText = validation.valid ? `${(areaMm2 / 100).toFixed(1)} cm2` : 'Unavailable until valid'
  const selectedPoint = selectedObject?.type === 'point' ? selectedObject.index : null
  const selectedHole = selectedObject?.type === 'hole' ? holes.find((hole) => hole.ref === selectedObject.ref) || null : null
  const selectedAnchor = selectedObject?.type === 'point' ? points[selectedObject.index] : selectedHole

  function choosePreset(nextPreset: string) {
    setPreset(nextPreset)
    const nextPoints = clonePoints(presetPoints[nextPreset] || presetPoints['rounded-rectangle'])
    setPoints(nextPoints)
    setHoles(buildHoles(nextPoints, nextPreset, nextPreset === 'drone-stack' ? 8 : 4))
    setSelectedObject(null)
    setAutoFixProposal(null)
    setMode('select')
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
    const holeHit = nearestHole(holes, p)

    if (event.shiftKey) setMultiSelect(true)

    if (holeHit && holeHit.distance < Math.max(3.8, holeHit.hole.diameterMm * 1.9)) {
      setSelectedObject({ type: 'hole', ref: holeHit.hole.ref })
      setStatus(`Selected ${holeHit.hole.ref}. Drag to move it or edit diameter/keepout in the object menu.`)
      return
    }

    if (hit.distance < 3.5) {
      setSelectedObject({ type: 'point', index: hit.index })
      setStatus(`Selected point ${hit.index + 1}. Drag to move it or use the object menu for exact edits.`)
      return
    }

    if (mode === 'select') {
      setSelectedObject(null)
      setStatus('Selection cleared. Click an outline point or mounting hole to edit it.')
      return
    }

    if (mode === 'add-point') {
      const nextPoints = insertPoint(points, p)
      const selectedIndex = nearestPoint(nextPoints, p).index
      setPoints(nextPoints)
      setSelectedObject({ type: 'point', index: selectedIndex })
      setAutoFixProposal(null)
      setStatus('Point added. Use Select to move, duplicate, delete, or set exact coordinates.')
      return
    }

    if (mode === 'draw') {
      drawingRef.current = true
      setSelectedObject(null)
      setPoints((current) => insertPoint(current, p))
      setStatus('Drawing outline. Release anytime and continue from the same shape.')
    }
  }

  function movePointer(event: ReactPointerEvent<SVGSVGElement>) {
    const p = canvasPoint(event)
    if (selectedObject && event.buttons === 1) {
      if (selectedObject.type === 'point') {
        setPoints((current) => current.map((point, index) => (index === selectedObject.index ? p : point)))
      } else {
        setHoles((current) => current.map((hole) => (hole.ref === selectedObject.ref ? { ...hole, ...p } : hole)))
      }
      setAutoFixProposal(null)
      return
    }
    if (mode === 'draw' && drawingRef.current && event.buttons === 1) {
      setPoints((current) => appendDrawPoint(current, p, snap ? 2 : 1.2))
      setAutoFixProposal(null)
    }
  }

  function endPointer(event: ReactPointerEvent<SVGSVGElement>) {
    drawingRef.current = false
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
    setSelectedObject(null)
    setAutoFixProposal(null)
    setStatus(`Deleted point ${index + 1}.`)
  }

  function updatePoint(index: number, patch: Partial<Point>) {
    setPoints((current) => current.map((point, pointIndex) => (pointIndex === index ? { ...point, ...patch } : point)))
    setAutoFixProposal(null)
  }

  function duplicatePoint(index: number) {
    const point = points[index]
    if (!point) return
    const duplicate = { x: point.x + 3, y: point.y + 3 }
    setPoints((current) => {
      const next = [...current]
      next.splice(index + 1, 0, duplicate)
      return next
    })
    setSelectedObject({ type: 'point', index: index + 1 })
    setAutoFixProposal(null)
    setStatus(`Duplicated point ${index + 1}.`)
  }

  function smoothPoint(index: number) {
    const previous = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]
    if (!previous || !next) return
    updatePoint(index, { x: Number(((previous.x + next.x) / 2).toFixed(2)), y: Number(((previous.y + next.y) / 2).toFixed(2)) })
    setStatus(`Smoothed point ${index + 1} between adjacent outline vertices.`)
  }

  function snapPoint(index: number) {
    const point = points[index]
    if (!point) return
    updatePoint(index, { x: Math.round(point.x), y: Math.round(point.y) })
    setStatus(`Snapped point ${index + 1} to the millimeter grid.`)
  }

  function addHole() {
    const nextRef = `H${holes.length + 1}`
    const candidate = chooseNewHolePosition(points, holes)
    setHoles((current) => [...current, { ref: nextRef, ...candidate, diameterMm: 2.4, keepoutMm: 1, plating: 'plated' }])
    setSelectedObject({ type: 'hole', ref: nextRef })
    setAutoFixProposal(null)
    setStatus(`${nextRef} added inside the current outline.`)
  }

  function deleteHole(ref: string) {
    setHoles((current) => current.filter((hole) => hole.ref !== ref))
    setSelectedObject(null)
    setAutoFixProposal(null)
    setStatus(`${ref} deleted.`)
  }

  function duplicateHole(ref: string) {
    const source = holes.find((hole) => hole.ref === ref)
    if (!source) return
    const nextRef = `H${holes.length + 1}`
    const duplicate = { ...source, ref: nextRef, x: source.x + 4, y: source.y + 4 }
    setHoles((current) => [...current, duplicate])
    setSelectedObject({ type: 'hole', ref: nextRef })
    setAutoFixProposal(null)
    setStatus(`${ref} duplicated as ${nextRef}.`)
  }

  function updateHole(ref: string, patch: Partial<Hole>) {
    setHoles((current) => current.map((hole) => (hole.ref === ref ? { ...hole, ...patch } : hole)))
    setAutoFixProposal(null)
  }

  function snapHole(ref: string) {
    const hole = holes.find((item) => item.ref === ref)
    if (!hole) return
    updateHole(ref, { x: Math.round(hole.x), y: Math.round(hole.y) })
    setStatus(`${ref} snapped to the millimeter grid.`)
  }

  function runAutoFixGeometry() {
    const proposal = buildAutoFixProposal(points, holes, validation)
    setAutoFixProposal(proposal)
    setStatus(proposal.changes.length ? `Auto-Fix proposal ready: ${proposal.changes[0]}` : 'Auto-Fix found no safe geometry changes to propose.')
  }

  function acceptAutoFixGeometry() {
    if (!autoFixProposal) return
    setPoints(autoFixProposal.points)
    setHoles(autoFixProposal.holes)
    setSelectedObject(null)
    setAutoFixProposal(null)
    setStatus(`Auto-Fix accepted. ${autoFixProposal.changes.join(' ') || 'No geometry changes were needed.'}`)
  }

  function downloadAutoFixReport() {
    if (!autoFixProposal) return
    const report = {
      schema: 'boardforge.geometry-autofix-report.web.v1',
      generatedAt: new Date().toISOString(),
      changes: autoFixProposal.changes,
      before: autoFixProposal.before,
      after: autoFixProposal.after,
      repairedOutlinePointsMm: autoFixProposal.points,
      repairedMountingHolesMm: autoFixProposal.holes,
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'BoardForge_Geometry_AutoFix_Report.json'
    link.click()
    URL.revokeObjectURL(url)
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

  async function downloadSeed() {
    const { default: JSZip } = await import('jszip')
    const outlinePackage = buildOutlinePackage({ preset, points, holes, validation, metrics, prompt })
    const zip = new JSZip()
    zip.file('manifest.json', JSON.stringify({
      schema: 'boardforge.custom-outline.package-manifest.v1',
      packageId: outlinePackage.packageId,
      createdAt: outlinePackage.createdAt,
      preset,
      validationStatus: validation.valid ? 'valid_browser_outline' : 'blocked_browser_outline',
      files: [
        'boardforge-outline-package.json',
        'codex-prompt.txt',
        'edge-cuts-outline.json',
        'validation-report.json',
        'README.txt',
      ],
    }, null, 2))
    zip.file('boardforge-outline-package.json', JSON.stringify(outlinePackage, null, 2))
    zip.file('codex-prompt.txt', prompt)
    zip.file('edge-cuts-outline.json', JSON.stringify({
      schema: 'boardforge.edge-cuts-outline.v1',
      units: 'mm',
      outlinePointsMm: points,
      mountingHolesMm: holes,
      boardDimensionsMm: metrics.dimensionsMm,
      boundingBoxMm: metrics.boundingBoxMm,
    }, null, 2))
    zip.file('validation-report.json', JSON.stringify({
      schema: 'boardforge.browser-outline-validation.v1',
      validation,
      metrics,
      note: validation.valid
        ? 'Browser geometry checks passed. KiCad DRC/ERC still require the local BoardForge engine.'
        : 'Browser geometry checks are blocked. Run Auto-Fix Geometry or edit the selected points/holes before KiCad handoff.',
    }, null, 2))
    zip.file('README.txt', [
      'BoardForge Custom Outline Package',
      '',
      'This ZIP was generated in-browser from the custom board generator.',
      'It contains exact outline points in millimeters, mounting hole definitions, browser validation evidence, and the Codex prompt.',
      '',
      'Important:',
      '- This is an outline handoff package, not a fake manufacturing-ready package.',
      '- KiCad DRC/ERC and real Edge.Cuts project generation require the BoardForge local engine or Codex plugin.',
      '- If validationStatus is blocked_browser_outline, repair the geometry before generating KiCad files.',
    ].join('\n'))
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${outlinePackage.packageId}.zip`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    window.setTimeout(() => {
      URL.revokeObjectURL(url)
      link.remove()
    }, 3000)
    setStatus(`Downloaded ${outlinePackage.packageId}.zip with exact outline, validation report, and Codex prompt.`)
  }

  async function copyPrompt() {
    setShowPromptPanel(true)
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setStatus('Copied exact BoardForge Codex prompt with dimensions, points, holes, and validation blockers.')
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      const copiedWithFallback = copyTextFallback(prompt)
      if (copiedWithFallback) {
        setCopied(true)
        setStatus('Copied exact BoardForge Codex prompt with dimensions, points, holes, and validation blockers.')
        window.setTimeout(() => setCopied(false), 1400)
        return
      }
      setStatus('Clipboard access was blocked by the browser, so the exact Codex prompt is open below and included in codex-prompt.txt inside the ZIP.')
    }
  }

  return (
    <section className="bf-outline-workbench premium">
      <div className="bf-outline-premium-head">
        <div>
          <span className="bf-kicker">Custom board generator</span>
          <h2>Draw. Validate. Build with confidence.</h2>
          <p>
            This studio only validates the mechanical outline in-browser. KiCad DRC/ERC and real manufacturing export
            stay pending until the local BoardForge engine is paired.
          </p>
        </div>
        <div className="bf-outline-truth-gates" aria-label="Outline validation truth gates">
          <div className={validation.valid ? 'pass' : 'blocked'}><CheckCircle2 size={22} /><span>Geometry</span><strong>{validation.valid ? 'Browser checks pass' : 'Blocked'}</strong></div>
          <div className="pending"><Cpu size={22} /><span>Local KiCad</span><strong>DRC/ERC pending</strong></div>
          <div className={validation.valid ? 'pass' : 'blocked'}><ShieldCheck size={22} /><span>Edge.Cuts seed</span><strong>{validation.valid ? 'Ready to hand off' : 'Needs repair'}</strong></div>
        </div>
      </div>
      <div className="bf-outline-generator-shell">
        <aside className="bf-outline-tool-rail" aria-label="Outline tools">
          <button type="button" className={mode === 'select' ? 'active' : ''} onClick={() => setMode('select')}><MousePointer2 size={16} /> Select</button>
          <button type="button" className={mode === 'add-point' ? 'active' : ''} onClick={() => setMode('add-point')}><Plus size={16} /> Add point</button>
          <button type="button" className={mode === 'draw' ? 'active' : ''} onClick={() => setMode('draw')}><Pencil size={16} /> Draw</button>
          <button type="button" className={snap ? 'active' : ''} onClick={() => setSnap(!snap)}><Grid2X2 size={16} /> Snap</button>
          <button type="button" onClick={addHole}><ShieldCheck size={16} /> Add hole</button>
          <button type="button" onClick={runAutoFixGeometry}><Wand2 size={16} /> Auto-Fix Geometry</button>
          <button type="button" onClick={() => choosePreset(preset)}><RotateCcw size={16} /> Reset</button>
          <span>Units: mm</span>
        </aside>
        <div className="bf-outline-canvas-panel">
          <div className="bf-outline-toolbar compact">
            <label>
              <span>Preset</span>
              <select value={preset} onChange={(event) => choosePreset(event.target.value)}>
                {outlinePresets.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => callLocal('validate')}><Sparkles size={16} /> Validate Board</button>
            <button type="button" className={!validation.valid ? 'blocked' : ''} onClick={() => callLocal('generate')} aria-disabled={!validation.valid}><Download size={16} /> Generate KiCad outline</button>
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
          {points.length > 2 && (
            <g className="bf-editor-annotations">
              <line x1={box.minX + box.width * 0.22} y1={box.minY - 2} x2={box.minX + box.width * 0.17} y2={box.minY - 8} />
              <text x={box.minX + box.width * 0.02} y={box.minY - 9}>EDGE KEEP-OUT CHECKED</text>
              <line x1={box.maxX - box.width * 0.2} y1={box.maxY + 1.5} x2={box.maxX - box.width * 0.12} y2={box.maxY + 8} />
              <text x={box.maxX - box.width * 0.36} y={box.maxY + 11}>HOLES INSIDE OUTLINE</text>
            </g>
          )}
          {holes.map((hole) => (
            <g key={hole.ref} className={`${pointInPolygon(hole, points) ? 'bf-editor-hole' : 'bf-editor-hole invalid'} ${selectedObject?.type === 'hole' && selectedObject.ref === hole.ref ? 'selected' : ''}`}>
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
          <div className="bf-outline-floating-toolbar">
            <button type="button" className={mode === 'select' ? 'active' : ''} onClick={() => setMode('select')}><MousePointer2 size={15} /> Select</button>
            <button type="button" className={mode === 'draw' ? 'active' : ''} onClick={() => setMode('draw')}><Pencil size={15} /> Draw</button>
            <button type="button" className={mode === 'add-point' ? 'active' : ''} onClick={() => setMode('add-point')}><Plus size={15} /> Add point</button>
            <button type="button" onClick={runAutoFixGeometry}><Wand2 size={15} /> Auto-Fix</button>
          </div>
          {selectedAnchor && (
            <SelectionMenu
              selectedObject={selectedObject}
              point={selectedObject?.type === 'point' ? points[selectedObject.index] : null}
              hole={selectedHole}
              multiSelect={multiSelect}
              setMultiSelect={setMultiSelect}
              onClose={() => setSelectedObject(null)}
              onDeletePoint={deletePoint}
              onDuplicatePoint={duplicatePoint}
              onSmoothPoint={smoothPoint}
              onSnapPoint={snapPoint}
              onUpdatePoint={updatePoint}
              onDeleteHole={deleteHole}
              onDuplicateHole={duplicateHole}
              onSnapHole={snapHole}
              onUpdateHole={updateHole}
            />
          )}
          {autoFixProposal && (
            <div className="bf-autofix-proposal">
              <span>Auto-Fix Geometry proposal</span>
              <strong>{autoFixProposal.before.routeability}% to {autoFixProposal.after.routeability}% geometry score</strong>
              <ul>
                {(autoFixProposal.changes.length ? autoFixProposal.changes : ['No safe changes are needed for this outline.']).map((change) => <li key={change}>{change}</li>)}
              </ul>
              <div>
                <button type="button" onClick={acceptAutoFixGeometry}>Accept repair</button>
                <button type="button" onClick={() => setAutoFixProposal(null)}>Reject</button>
                <button type="button" onClick={downloadAutoFixReport}>Download report</button>
              </div>
            </div>
          )}
          </div>
        </div>
        <aside className="bf-outline-score-card">
          <span>Geometry score</span>
          <strong>{validation.routeability}%</strong>
          <p>{validation.valid ? 'Outline browser checks passed' : 'Repair blockers before KiCad handoff'}</p>
          <div className="bf-score-ring" style={{ '--score': `${validation.routeability * 3.6}deg` } as CSSProperties} />
          <ul>
            {validation.checks.map((check) => (
              <li key={check.label} className={check.pass ? 'pass' : 'fail'}>
                <span>{check.label}</span>
                <strong>{check.pass ? 'Passed' : 'Blocked'}</strong>
              </li>
            ))}
          </ul>
        </aside>
      </div>
      <div className="bf-outline-metrics">
        <div><Ruler size={20} /><span>Board area</span><strong>{areaText}</strong></div>
        <div><Layers3 size={20} /><span>Outline points</span><strong>{points.length}</strong></div>
        <div><ShieldCheck size={20} /><span>Holes verified</span><strong>{holesInside} / {holes.length}</strong></div>
        <div><Ruler size={20} /><span>Dimensions</span><strong>{box.width.toFixed(1)} x {box.height.toFixed(1)} mm</strong></div>
        <div><Grid2X2 size={20} /><span>Edge length</span><strong>{edgeLength.toFixed(1)} mm</strong></div>
        <div><Cpu size={20} /><span>Local KiCad</span><strong>Pending helper</strong></div>
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
              BoardForge plugin when you copy the prompt or download the outline package.
            </p>
          </div>
          <button type="button" onClick={copyPrompt}>
            <ClipboardCopy size={15} /> {copied ? 'Copied' : 'Copy prompt'}
          </button>
          <button type="button" onClick={downloadSeed}>Download outline package</button>
        </div>
        {showPromptPanel && (
          <div className="bf-prompt-panel">
            <div className="bf-prompt-panel-head">
              <b>Exact Codex prompt</b>
              <button type="button" onClick={() => setShowPromptPanel(false)}>Close</button>
            </div>
            <textarea
              readOnly
              value={prompt}
              onFocus={(event) => event.currentTarget.select()}
              aria-label="Exact BoardForge Codex prompt"
            />
          </div>
        )}
      </div>
    </section>
  )
}

function SelectionMenu({
  selectedObject,
  point,
  hole,
  multiSelect,
  setMultiSelect,
  onClose,
  onDeletePoint,
  onDuplicatePoint,
  onSmoothPoint,
  onSnapPoint,
  onUpdatePoint,
  onDeleteHole,
  onDuplicateHole,
  onSnapHole,
  onUpdateHole,
}: {
  selectedObject: SelectedObject
  point: Point | null
  hole: Hole | null
  multiSelect: boolean
  setMultiSelect: (value: boolean) => void
  onClose: () => void
  onDeletePoint: (index: number) => void
  onDuplicatePoint: (index: number) => void
  onSmoothPoint: (index: number) => void
  onSnapPoint: (index: number) => void
  onUpdatePoint: (index: number, patch: Partial<Point>) => void
  onDeleteHole: (ref: string) => void
  onDuplicateHole: (ref: string) => void
  onSnapHole: (ref: string) => void
  onUpdateHole: (ref: string, patch: Partial<Hole>) => void
}) {
  if (!selectedObject) return null

  if (selectedObject.type === 'point' && point) {
    return (
      <div className="bf-selection-menu" onPointerDown={(event) => event.stopPropagation()}>
        <div className="bf-selection-menu-head">
          <span>Selected point {selectedObject.index + 1}</span>
          <button type="button" onClick={onClose}>Clear</button>
        </div>
        <div className="bf-selection-fields">
          <label>X mm<input type="number" step="0.1" value={point.x} onChange={(event) => onUpdatePoint(selectedObject.index, { x: Number(event.target.value) })} /></label>
          <label>Y mm<input type="number" step="0.1" value={point.y} onChange={(event) => onUpdatePoint(selectedObject.index, { y: Number(event.target.value) })} /></label>
        </div>
        <div className="bf-selection-actions">
          <button type="button" onClick={() => onSnapPoint(selectedObject.index)}>Snap to grid</button>
          <button type="button" onClick={() => onDuplicatePoint(selectedObject.index)}><Copy size={14} /> Duplicate</button>
          <button type="button" onClick={() => onSmoothPoint(selectedObject.index)}>Smooth corner</button>
          <button type="button" onClick={() => setMultiSelect(!multiSelect)}>{multiSelect ? 'Stop select more' : 'Select more'}</button>
          <button type="button" className="danger" onClick={() => onDeletePoint(selectedObject.index)}><Trash2 size={14} /> Delete point</button>
        </div>
      </div>
    )
  }

  if (selectedObject.type === 'hole' && hole) {
    return (
      <div className="bf-selection-menu" onPointerDown={(event) => event.stopPropagation()}>
        <div className="bf-selection-menu-head">
          <span>Selected hole {hole.ref}</span>
          <button type="button" onClick={onClose}>Clear</button>
        </div>
        <div className="bf-selection-fields">
          <label>X mm<input type="number" step="0.1" value={hole.x} onChange={(event) => onUpdateHole(hole.ref, { x: Number(event.target.value) })} /></label>
          <label>Y mm<input type="number" step="0.1" value={hole.y} onChange={(event) => onUpdateHole(hole.ref, { y: Number(event.target.value) })} /></label>
          <label>Diameter<input type="number" min="0.8" max="8" step="0.1" value={hole.diameterMm} onChange={(event) => onUpdateHole(hole.ref, { diameterMm: clamp(Number(event.target.value), 0.8, 8) })} /></label>
          <label>Keepout<input type="number" min="0.2" max="8" step="0.1" value={hole.keepoutMm ?? 1} onChange={(event) => onUpdateHole(hole.ref, { keepoutMm: clamp(Number(event.target.value), 0.2, 8) })} /></label>
          <label>Plating<select value={hole.plating || 'plated'} onChange={(event) => onUpdateHole(hole.ref, { plating: event.target.value as Hole['plating'] })}><option value="plated">Plated</option><option value="non-plated">Non-plated</option></select></label>
        </div>
        <div className="bf-selection-actions">
          <button type="button" onClick={() => onSnapHole(hole.ref)}>Snap to grid</button>
          <button type="button" onClick={() => onDuplicateHole(hole.ref)}><Copy size={14} /> Duplicate</button>
          <button type="button" onClick={() => onUpdateHole(hole.ref, { locked: !hole.locked })}>{hole.locked ? 'Unlock hole' : 'Lock hole'}</button>
          <button type="button" onClick={() => setMultiSelect(!multiSelect)}>{multiSelect ? 'Stop select more' : 'Select more'}</button>
          <button type="button" className="danger" onClick={() => onDeleteHole(hole.ref)}><Trash2 size={14} /> Delete hole</button>
        </div>
      </div>
    )
  }

  return null
}

function buildCodexPrompt({
  preset,
  points,
  holes,
  validation,
  metrics,
}: {
  preset: string
  points: Point[]
  holes: Hole[]
  validation: ValidationResult
  metrics: BoardMetrics
}) {
  const payload = buildOutlinePayload({ preset, points, holes, validation, metrics })
  return `Use the BoardForge Codex Plugin to create an outline-only KiCad project from this custom board outline.

Critical rules:
- Preserve every Edge.Cuts point exactly in millimeters.
- Use the dimensions, area, perimeter, and mounting holes from the JSON payload exactly.
- Generate an empty schematic and a .kicad_pcb containing only the Edge.Cuts outline, mounting holes, optional mechanical labels, and review notes.
- Do not place components, route copper, or claim DRC/ERC/manufacturing readiness from this browser package.
- If browserValidation.status is blocked, stop before generating KiCad files and report the listed blockers.
- If KiCad is available locally, load the generated board and validate Edge.Cuts geometry before export.

Outline preset: ${preset}
Dimensions: ${metrics.dimensionsMm.width} mm x ${metrics.dimensionsMm.height} mm
Area: ${metrics.areaMm2} mm^2 (${metrics.areaCm2} cm^2)
Perimeter: ${metrics.perimeterMm} mm
Mounting holes: ${metrics.holesInsideOutline}/${metrics.mountingHoleCount} inside outline
Browser validation: ${validation.valid ? 'valid' : `blocked - ${validation.blockers.join('; ')}`}

JSON payload:
\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\``
}

function copyTextFallback(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(textarea)
  }
}

function buildOutlinePackage({
  preset,
  points,
  holes,
  validation,
  metrics,
  prompt,
}: {
  preset: string
  points: Point[]
  holes: Hole[]
  validation: ValidationResult
  metrics: BoardMetrics
  prompt: string
}) {
  const createdAt = new Date().toISOString()
  const packageId = `BoardForge_Custom_Outline_${createdAt.replace(/[:.]/g, '-').replace('T', '_').replace('Z', 'Z')}`
  return {
    schema: 'boardforge.custom-outline-package.web.v1',
    packageId,
    createdAt,
    source: 'BoardForge web custom board generator',
    units: 'mm',
    exactPromptFile: 'codex-prompt.txt',
    contents: [
      'manifest.json',
      'boardforge-outline-package.json',
      'codex-prompt.txt',
      'edge-cuts-outline.json',
      'validation-report.json',
      'README.txt',
    ],
    payload: buildOutlinePayload({ preset, points, holes, validation, metrics }),
    codexPrompt: prompt,
  }
}

function buildOutlinePayload({
  preset,
  points,
  holes,
  validation,
  metrics,
}: {
  preset: string
  points: Point[]
  holes: Hole[]
  validation: ValidationResult
  metrics: BoardMetrics
}) {
  return {
    schema: 'boardforge.custom-outline.payload.v1',
    units: 'mm',
    preset,
    board: {
      dimensionsMm: metrics.dimensionsMm,
      boundingBoxMm: metrics.boundingBoxMm,
      areaMm2: metrics.areaMm2,
      areaCm2: metrics.areaCm2,
      perimeterMm: metrics.perimeterMm,
      outlinePointCount: metrics.outlinePointCount,
      mountingHoleCount: metrics.mountingHoleCount,
      holesInsideOutline: metrics.holesInsideOutline,
    },
    outlinePointsMm: points.map((point, index) => ({ index: index + 1, x: roundMetric(point.x), y: roundMetric(point.y) })),
    mountingHolesMm: holes.map((hole) => ({
      ref: hole.ref,
      x: roundMetric(hole.x),
      y: roundMetric(hole.y),
      diameterMm: roundMetric(hole.diameterMm),
      keepoutMm: roundMetric(hole.keepoutMm ?? 1),
      plating: hole.plating ?? 'plated',
      locked: Boolean(hole.locked),
      insideOutline: pointInPolygon(hole, points),
      edgeClearanceMm: roundMetric(distanceToPolygonEdges(hole, points) - hole.diameterMm / 2),
    })),
    browserValidation: {
      status: validation.valid ? 'valid' : 'blocked',
      routeabilityScore: validation.routeability,
      risk: validation.risk,
      checks: validation.checks,
      blockers: validation.blockers,
    },
  }
}

function buildBoardMetrics(points: Point[], holes: Hole[]): BoardMetrics {
  const box = bounds(points)
  const areaMm2 = roundMetric(Math.abs(polygonArea(points)))
  return {
    dimensionsMm: { width: roundMetric(box.width), height: roundMetric(box.height) },
    boundingBoxMm: {
      minX: roundMetric(box.minX),
      minY: roundMetric(box.minY),
      maxX: roundMetric(box.maxX),
      maxY: roundMetric(box.maxY),
    },
    areaMm2,
    areaCm2: roundMetric(areaMm2 / 100),
    perimeterMm: roundMetric(totalEdgeLength(points)),
    outlinePointCount: points.length,
    mountingHoleCount: holes.length,
    holesInsideOutline: holes.filter((hole) => pointInPolygon(hole, points)).length,
  }
}

function roundMetric(value: number) {
  return Number(value.toFixed(2))
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
  return candidates.slice(0, count).map((point, index) => ({ ref: `H${index + 1}`, ...point, diameterMm: 2.4, keepoutMm: 1, plating: 'plated' as const }))
}

function validateOutline(points: Point[], holes: Hole[]): ValidationResult {
  const box = bounds(points)
  const area = Math.abs(polygonArea(points))
  const intersections = countIntersections(points)
  const minEdge = points.length > 1 ? Math.min(...points.map((point, index) => distance(point, points[(index + 1) % points.length]))) : 0
  const duplicateCount = countDuplicatePoints(points)
  const holesInside = holes.every((hole) => pointInPolygon(hole, points))
  const closestHoleClearance = holes.length ? Math.min(...holes.map((hole) => distanceToPolygonEdges(hole, points) - hole.diameterMm / 2)) : Number.POSITIVE_INFINITY
  const holesClear = holes.every((hole) => distanceToPolygonEdges(hole, points) >= Math.max(2.2, hole.diameterMm / 2 + (hole.keepoutMm ?? 1)))
  const checks = [
    { label: 'Closed outline', pass: points.length >= 3, reason: points.length >= 3 ? 'Three or more Edge.Cuts vertices are present.' : 'Add at least three outline points.' },
    { label: 'No self-intersections', pass: intersections === 0, reason: intersections === 0 ? 'No crossing outline segments detected.' : `${intersections} crossing segment pair(s) detected.` },
    { label: 'No duplicate points', pass: duplicateCount === 0, reason: duplicateCount === 0 ? 'No duplicate or stacked outline points detected.' : `${duplicateCount} duplicate or stacked point(s) detected.` },
    { label: 'Minimum edge length', pass: minEdge >= 2, reason: minEdge >= 2 ? 'No tiny zero-length or near-zero Edge.Cuts segments.' : 'One or more outline edges are too short for reliable fabrication.' },
    { label: 'Board area', pass: area >= 280, reason: area >= 280 ? 'Mechanical area is large enough for a real outline seed.' : 'Board area is too small for reliable connector, hole, and route planning.' },
    { label: 'Hole clearance OK', pass: holesInside && holesClear, reason: holesInside && holesClear ? `Closest finished hole-to-edge clearance is ${Number.isFinite(closestHoleClearance) ? closestHoleClearance.toFixed(2) : 'n/a'} mm.` : 'One or more mounting holes are outside the board or too close to Edge.Cuts.' },
    { label: 'Aspect ratio OK', pass: box.width / Math.max(1, box.height) < 5 && box.height / Math.max(1, box.width) < 5, reason: 'Outline aspect ratio is checked for routeability.' },
  ]
  const blockers = checks.filter((check) => !check.pass).map((check) => check.reason)
  const narrowPenalty = Math.min(18, Math.max(0, 16 - Math.min(box.width, box.height)))
  const complexityPenalty = Math.max(0, points.length - 8) * 1.4
  const routeability = blockers.length ? Math.max(0, Math.round(58 - blockers.length * 12 - complexityPenalty)) : Math.max(45, Math.min(100, Math.round(96 - complexityPenalty - narrowPenalty)))
  const risk = blockers.length ? 'Blocked' : routeability > 78 ? 'Low' : routeability > 60 ? 'Medium' : 'High'
  return { valid: blockers.length === 0, routeability, risk, checks, blockers }
}

function buildAutoFixProposal(points: Point[], holes: Hole[], before: ValidationResult): AutoFixProposal {
  const changes: string[] = []
  let nextPoints = removeDuplicateAndTinyEdges(points, changes)

  if (countIntersections(nextPoints) > 0) {
    nextPoints = sortOutlineByAngle(nextPoints)
    changes.push('Reordered crossing outline vertices around the board centroid to remove self-intersections.')
  }

  if (nextPoints.length >= 3 && Math.abs(polygonArea(nextPoints)) < 280) {
    nextPoints = scaleAroundCentroid(nextPoints, 1.18)
    changes.push('Scaled the outline outward because the drawn area was below the useful minimum.')
  }

  const centroid = polygonCentroid(nextPoints)
  const nextHoles = holes.map((hole) => {
    let repaired = { ...hole }
    const minClearance = Math.max(2.2, repaired.diameterMm / 2 + (repaired.keepoutMm ?? 1))
    let attempts = 0
    while ((!pointInPolygon(repaired, nextPoints) || distanceToPolygonEdges(repaired, nextPoints) < minClearance) && attempts < 18) {
      repaired = {
        ...repaired,
        x: Number((repaired.x + (centroid.x - repaired.x) * 0.18).toFixed(2)),
        y: Number((repaired.y + (centroid.y - repaired.y) * 0.18).toFixed(2)),
      }
      attempts += 1
    }
    if (repaired.x !== hole.x || repaired.y !== hole.y) changes.push(`Moved ${hole.ref} inward to satisfy board outline and edge-clearance checks.`)
    return repaired
  })

  const after = validateOutline(nextPoints, nextHoles)
  return { points: nextPoints, holes: nextHoles, changes, before, after }
}

function removeDuplicateAndTinyEdges(points: Point[], changes: string[]) {
  const cleaned: Point[] = []
  points.forEach((point) => {
    const previous = cleaned[cleaned.length - 1]
    if (previous && distance(previous, point) < 1.2) {
      changes.push('Removed a duplicate or near-zero-length outline point.')
      return
    }
    cleaned.push({ x: Number(point.x.toFixed(2)), y: Number(point.y.toFixed(2)) })
  })
  if (cleaned.length > 2 && distance(cleaned[0], cleaned[cleaned.length - 1]) < 1.2) {
    cleaned.pop()
    changes.push('Removed a closing duplicate point stacked on the first vertex.')
  }
  return cleaned.length >= 3 ? cleaned : points
}

function sortOutlineByAngle(points: Point[]) {
  const center = polygonCentroid(points)
  return [...points].sort((a, b) => Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x))
}

function scaleAroundCentroid(points: Point[], scale: number) {
  const center = polygonCentroid(points)
  return points.map((point) => ({
    x: Number((center.x + (point.x - center.x) * scale).toFixed(2)),
    y: Number((center.y + (point.y - center.y) * scale).toFixed(2)),
  }))
}

function polygonCentroid(points: Point[]) {
  if (!points.length) return { x: 0, y: 0 }
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  }
}

function countDuplicatePoints(points: Point[]) {
  let count = 0
  for (let index = 0; index < points.length; index += 1) {
    for (let compare = index + 1; compare < points.length; compare += 1) {
      if (distance(points[index], points[compare]) < 0.8) count += 1
    }
  }
  return count
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

function nearestHole(holes: Hole[], target: Point) {
  if (!holes.length) return null
  return holes.reduce<{ hole: Hole; distance: number } | null>((best, hole) => {
    const holeDistance = distance(hole, target)
    return !best || holeDistance < best.distance ? { hole, distance: holeDistance } : best
  }, null)
}

function chooseNewHolePosition(points: Point[], holes: Hole[]) {
  const box = bounds(points)
  const centroid = polygonCentroid(points)
  const candidates = [
    { x: box.minX + Math.max(4, box.width * 0.14), y: box.minY + Math.max(4, box.height * 0.14) },
    { x: box.maxX - Math.max(4, box.width * 0.14), y: box.minY + Math.max(4, box.height * 0.14) },
    { x: box.maxX - Math.max(4, box.width * 0.14), y: box.maxY - Math.max(4, box.height * 0.14) },
    { x: box.minX + Math.max(4, box.width * 0.14), y: box.maxY - Math.max(4, box.height * 0.14) },
    centroid,
  ]
  return candidates.find((candidate) => pointInPolygon(candidate, points) && holes.every((hole) => distance(hole, candidate) > 6)) || centroid
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

function totalEdgeLength(points: Point[]) {
  if (points.length < 2) return 0
  return points.reduce((sum, point, index) => sum + distance(point, points[(index + 1) % points.length]), 0)
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

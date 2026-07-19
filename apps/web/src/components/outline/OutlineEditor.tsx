'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { CheckCircle2, ClipboardCopy, Copy, Cpu, Download, Grid2X2, Hand, Layers3, MousePointer2, Pencil, Plus, Redo2, RotateCcw, Ruler, ShieldCheck, Sparkles, Trash2, Undo2, Wand2, ZoomIn, ZoomOut } from 'lucide-react'
import { outlinePresets } from '../../lib/outline-export'
import { callBoardForgeLocalEngine } from '../../lib/boardforge-local-artifact-client'
import { createBrowserProject, saveBrowserProject } from '../../lib/browser-project-registry'
import styles from './OutlineEditor.module.css'
import { createDrawDraft } from '../../lib/custom-editor/draw'
import { proposeFillSection, type FillSectionProposal, type FillSectionStyle } from '../../lib/custom-editor/geometry'
import { rustPolygonMetrics } from '../../lib/custom-editor/geometry-wasm'

type Point = { id?: string; x: number; y: number }
type Hole = { ref: string; x: number; y: number; diameterMm: number; keepoutMm?: number; plating?: 'plated' | 'non-plated'; locked?: boolean }
type Mode = 'select' | 'add-point' | 'draw' | 'pan' | 'fill'
type Viewport = { zoom: number; panX: number; panY: number; minZoom: number; maxZoom: number }
type GeometrySnapshot = { points: Point[]; holes: Hole[]; preset: string; closed: boolean }
type SelectedObject = { type: 'point'; id: string } | { type: 'hole'; ref: string } | { type: 'edge'; startId: string; endId: string } | null
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
  'blank-custom': [],
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
  const panRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const spacePressedRef = useRef(false)
  const [preset, setPreset] = useState('blank-custom')
  const [points, setPoints] = useState<Point[]>([])
  const [holes, setHoles] = useState<Hole[]>([])
  const [selectedObject, setSelectedObject] = useState<SelectedObject>(null)
  const [multiSelect, setMultiSelect] = useState(false)
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([])
  const [snap, setSnap] = useState(true)
  const [mode, setMode] = useState<Mode>('select')
  const [closed, setClosed] = useState(false)
  const [viewport, setViewport] = useState<Viewport>({ zoom: 1, panX: -10, panY: -10, minZoom: 0.25, maxZoom: 8 })
  const [history, setHistory] = useState<GeometrySnapshot[]>([])
  const [future, setFuture] = useState<GeometrySnapshot[]>([])
  const [drawRaw, setDrawRaw] = useState<Point[]>([])
  const [drawTolerance, setDrawTolerance] = useState(.5)
  const [drawSmoothing, setDrawSmoothing] = useState(0)
  const [drawCloseRequested, setDrawCloseRequested] = useState(false)
  const [fillProposal, setFillProposal] = useState<FillSectionProposal | null>(null)
  const [fillStyle, setFillStyle] = useState<FillSectionStyle>('straight')
  const [rustMetrics, setRustMetrics] = useState<{ area: number; perimeter: number } | null>(null)
  const [rustGeometryStatus, setRustGeometryStatus] = useState<'loading' | 'active' | 'fallback'>('loading')
  const [status, setStatus] = useState<string>('Ready - choose a preset, edit points, or draw a custom outline.')
  const [copied, setCopied] = useState(false)
  const [showPromptPanel, setShowPromptPanel] = useState(false)
  const [autoFixProposal, setAutoFixProposal] = useState<AutoFixProposal | null>(null)
  const [browserDraftSaved, setBrowserDraftSaved] = useState(false)
  const browserDraftId = useRef<string | null>(null)

  const box = useMemo(() => bounds(points), [points])
  const viewBox = `${viewport.panX} ${viewport.panY} ${100 / viewport.zoom} ${70 / viewport.zoom}`
  const validation = useMemo(() => {
    const result = validateOutline(points, holes)
    if (closed || points.length < 3) return result
    const checks = result.checks.map((check) => check.label === 'Closed outline' ? { ...check, pass: false, reason: 'The path is open. Use Fill Whole Board or Auto-Fix Geometry.' } : check)
    return { ...result, valid: false, risk: 'Blocked' as const, routeability: Math.min(result.routeability, 45), checks, blockers: ['Geometry incomplete - use Fill or Auto-Fix Geometry.', ...result.blockers] }
  }, [points, holes, closed])
  const metrics = useMemo(() => buildBoardMetrics(points, holes), [points, holes])
  const prompt = useMemo(() => buildCodexPrompt({ preset, points, holes, validation, metrics }), [preset, points, holes, validation, metrics])
  const statusTone = validation.valid ? 'valid' : 'blocked'
  const areaMm2 = useMemo(() => Math.abs(polygonArea(points)), [points])
  const edgeLength = rustMetrics?.perimeter ?? totalEdgeLength(points)
  const holesInside = useMemo(() => holes.filter((hole) => pointInPolygon(hole, points)).length, [holes, points])
  const areaText = closed && points.length >= 3 ? `${((rustMetrics?.area ?? areaMm2) / 100).toFixed(1)} cm2` : 'Area unavailable - close or fill the outline.'
  const selectedPoint = selectedObject?.type === 'point' ? points.findIndex((point) => point.id === selectedObject.id) : null
  const selectedHole = selectedObject?.type === 'hole' ? holes.find((hole) => hole.ref === selectedObject.ref) || null : null
  const selectedEdge = selectedObject?.type === 'edge' ? {
    start: points.find((point) => point.id === selectedObject.startId), end: points.find((point) => point.id === selectedObject.endId),
  } : null
  const selectedAnchor = selectedObject?.type === 'point' ? points.find((point) => point.id === selectedObject.id) : selectedObject?.type === 'edge' && selectedEdge?.start && selectedEdge.end ? { x: (selectedEdge.start.x + selectedEdge.end.x) / 2, y: (selectedEdge.start.y + selectedEdge.end.y) / 2 } : selectedHole
  const drawDraft = useMemo(() => drawRaw.length ? createDrawDraft(drawRaw, { simplificationTolerance: drawTolerance, smoothingIterations: drawSmoothing, closeRequested: drawCloseRequested }) : null, [drawRaw, drawTolerance, drawSmoothing, drawCloseRequested])

  useEffect(() => {
    let current = true
    if (!closed || points.length < 3) return () => { current = false }
    void Promise.resolve().then(() => {
      if (current) setRustGeometryStatus('loading')
      return rustPolygonMetrics(points)
    }).then((value) => { if (current) { setRustMetrics(value); setRustGeometryStatus('active') } }).catch(() => { if (current) { setRustMetrics(null); setRustGeometryStatus('fallback') } })
    return () => { current = false }
  }, [points, closed])

  function snapshot(): GeometrySnapshot {
    return { points: clonePoints(points), holes: holes.map((hole) => ({ ...hole })), preset, closed }
  }

  function checkpoint() {
    setHistory((current) => [...current.slice(-99), snapshot()])
    setFuture([])
  }

  function restoreSnapshot(value: GeometrySnapshot) {
    setPoints(clonePoints(value.points)); setHoles(value.holes.map((hole) => ({ ...hole })))
    setPreset(value.preset); setClosed(value.closed); setSelectedObject(null); setAutoFixProposal(null)
  }

  function undo() {
    const previous = history[history.length - 1]
    if (!previous) return
    setFuture((current) => [snapshot(), ...current]); setHistory((current) => current.slice(0, -1)); restoreSnapshot(previous)
    setStatus('Undid geometry edit. Viewport preserved.')
  }

  function redo() {
    const next = future[0]
    if (!next) return
    setHistory((current) => [...current, snapshot()]); setFuture((current) => current.slice(1)); restoreSnapshot(next)
    setStatus('Redid geometry edit. Viewport preserved.')
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT' || target?.isContentEditable
      if (isTyping) return

      const key = event.key.toLowerCase()
      if (event.code === 'Space') spacePressedRef.current = true
      if ((event.ctrlKey || event.metaKey) && key === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return }
      if ((event.ctrlKey || event.metaKey) && key === 'y') { event.preventDefault(); redo(); return }
      if (key === 'escape') {
        setSelectedObject(null)
        setStatus('Selection cleared.')
        return
      }
      if (key === 'a') {
        event.preventDefault()
        setMode('add-point')
        setStatus('Add point mode active. Click an edge to insert a precise outline vertex.')
        return
      }
      if (key === 'p') {
        event.preventDefault()
        setMode('add-point')
        setStatus('Add point mode active. Click an edge to insert a precise outline vertex.')
        return
      }
      if (key === 'm') {
        event.preventDefault()
        setMode('select')
        setStatus(selectedObject ? 'Move mode active. Drag the selected point or hole.' : 'Move mode active. Select a point or hole, then drag it.')
        return
      }
      if (key === 'd' && selectedObject) {
        event.preventDefault()
        duplicateSelected()
        return
      }
      if ((key === 'delete' || key === 'backspace') && selectedObject) {
        event.preventDefault()
        deleteSelected()
        return
      }
      if (key === 's' && selectedObject) {
        event.preventDefault()
        snapSelected()
        return
      }
      if (key === 'h') {
        event.preventDefault()
        addHole()
        return
      }
      if (key === 'f') {
        event.preventDefault()
        runAutoFixGeometry()
        return
      }
      if (key === 'r') {
        event.preventDefault()
        resetCanvas()
        return
      }
      if (key === 'c' && (event.ctrlKey || event.metaKey)) {
        return
      }
      if (key === 'c') {
        event.preventDefault()
        void copyPrompt()
        return
      }
      if (key === 'v') {
        event.preventDefault()
        void callLocal('validate')
        return
      }
      if (key === 'g') {
        event.preventDefault()
        void downloadSeed()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    const onKeyUp = (event: KeyboardEvent) => { if (event.code === 'Space') spacePressedRef.current = false }
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
  })

  function choosePreset(nextPreset: string) {
    checkpoint()
    setPreset(nextPreset)
    const nextPoints = clonePoints(presetPoints[nextPreset] || [])
    setPoints(nextPoints)
    setHoles(nextPreset === 'blank-custom' ? [] : buildHoles(nextPoints, nextPreset, 4))
    setSelectedObject(null)
    setAutoFixProposal(null)
    setMode('select')
    setClosed(nextPreset !== 'blank-custom')
    setStatus(nextPreset === 'blank-custom' ? 'Blank canvas ready. Add points or draw a custom outline.' : `Loaded ${labelForPreset(nextPreset)}. Outline is ready for edit and validation.`)
  }

  function resetCanvas() {
    choosePreset(preset)
  }

  function resetView() { setViewport((current) => ({ ...current, zoom: 1, panX: -10, panY: -10 })); setStatus('View reset. Geometry unchanged.') }
  function fitBoard() {
    const padding = 10
    const zoom = clamp(Math.min(100 / Math.max(36, box.width + padding * 2), 70 / Math.max(30, box.height + padding * 2)), viewport.minZoom, viewport.maxZoom)
    setViewport((current) => ({ ...current, zoom, panX: box.minX - padding, panY: box.minY - padding }))
    setStatus('Fit Board applied by user. Geometry unchanged.')
  }
  function zoomAt(factor: number, clientX?: number, clientY?: number) {
    const svg = svgRef.current
    setViewport((current) => {
      const nextZoom = clamp(current.zoom * factor, current.minZoom, current.maxZoom)
      if (nextZoom === current.zoom) return current
      const rect = svg?.getBoundingClientRect()
      const rx = rect && clientX !== undefined ? clamp((clientX - rect.left) / rect.width, 0, 1) : .5
      const ry = rect && clientY !== undefined ? clamp((clientY - rect.top) / rect.height, 0, 1) : .5
      const worldX = current.panX + rx * 100 / current.zoom
      const worldY = current.panY + ry * 70 / current.zoom
      return { ...current, zoom: nextZoom, panX: worldX - rx * 100 / nextZoom, panY: worldY - ry * 70 / nextZoom }
    })
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
    if (mode === 'pan' || spacePressedRef.current || event.button === 1) {
      panRef.current = { x: event.clientX, y: event.clientY, panX: viewport.panX, panY: viewport.panY }
      return
    }
    if (mode === 'add-point') {
      if (points.some((point) => distance(point, p) < .25)) { setStatus('Point not added: duplicate or zero-length edge.'); return }
      checkpoint()
      const nextPoints = insertPoint(points, p)
      setPoints(nextPoints); setSelectedObject(null); setAutoFixProposal(null)
      setStatus('Point added without changing zoom or pan.'); return
    }
    if (mode === 'draw') {
      drawingRef.current = true; setSelectedObject(null); setDrawRaw([{ ...p, id: newGeometryId('point') }]); setDrawCloseRequested(false)
      setStatus('Drawing outline. Release to preview and simplify.'); return
    }
    if (mode === 'fill') { setStatus('Choose Fill Whole Board or select endpoints for Fill Section.'); return }
    const hit = nearestPoint(points, p)
    const holeHit = nearestHole(holes, p)

    if (event.shiftKey) setMultiSelect(true)

    const tolerance = 12 / Math.max(1, svgRef.current?.getBoundingClientRect().width || 1) * (100 / viewport.zoom)
    if (hit.distance < tolerance) {
      const id = points[hit.index].id!
      if (event.shiftKey || multiSelect) setSelectedPointIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id].slice(-2))
      else setSelectedPointIds([id])
      setSelectedObject({ type: 'point', id })
      setStatus(`Selected point ${hit.index + 1}. Drag to move it or use the object menu for exact edits.`)
      return
    }
    if (holeHit && holeHit.distance < Math.max(tolerance, holeHit.hole.diameterMm / 2)) {
      setSelectedObject({ type: 'hole', ref: holeHit.hole.ref })
      setStatus(`Selected ${holeHit.hole.ref}. Drag to move it or edit diameter/keepout in the object menu.`)
      return
    }
    const edgeHit = nearestEdge(points, p, closed)
    if (edgeHit && edgeHit.distance < tolerance) {
      setSelectedObject({ type: 'edge', startId: edgeHit.start.id!, endId: edgeHit.end.id! })
      setStatus(`Selected edge ${edgeHit.index + 1}. Use the edge inspector to straighten, split, or add a midpoint.`)
      return
    }

    if (mode === 'select') {
      setSelectedObject(null)
      setSelectedPointIds([])
      setStatus('Selection cleared. Click an outline point or mounting hole to edit it.')
      return
    }

  }

  function movePointer(event: ReactPointerEvent<SVGSVGElement>) {
    const p = canvasPoint(event)
    if (panRef.current) {
      const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return
      const dx = (event.clientX - panRef.current.x) / rect.width * (100 / viewport.zoom)
      const dy = (event.clientY - panRef.current.y) / rect.height * (70 / viewport.zoom)
      setViewport((current) => ({ ...current, panX: panRef.current!.panX - dx, panY: panRef.current!.panY - dy })); return
    }
    if (mode === 'select' && selectedObject && event.buttons === 1) {
      if (selectedObject.type === 'point') {
        setPoints((current) => current.map((point) => (point.id === selectedObject.id ? { ...point, ...p } : point)))
      } else if (selectedObject.type === 'hole') {
        setHoles((current) => current.map((hole) => (hole.ref === selectedObject.ref ? { ...hole, ...p } : hole)))
      }
      setAutoFixProposal(null)
      return
    }
    if (mode === 'draw' && drawingRef.current && event.buttons === 1) {
      setDrawRaw((current) => appendDrawPoint(current, p, snap ? 2 : 1.2)); setAutoFixProposal(null)
    }
  }

  function acceptDrawDraft() {
    if (!drawDraft?.acceptReady) { setStatus(drawDraft?.preview.warnings[0] || 'Draw preview is not ready.'); return }
    checkpoint(); setPoints(drawDraft.points.map((point) => ({ ...point }))); setClosed(drawDraft.preview.closed); setDrawRaw([]); setMode('select')
    setStatus(`Draw accepted: ${drawDraft.preview.rawPointCount} samples simplified to ${drawDraft.preview.previewPointCount} points.`)
  }

  function cancelDrawDraft() { setDrawRaw([]); setDrawCloseRequested(false); setStatus('Draw preview canceled. Geometry unchanged.') }

  function endPointer(event: ReactPointerEvent<SVGSVGElement>) {
    panRef.current = null
    drawingRef.current = false
    if (mode === 'draw' && drawRaw.length) setStatus('Draw preview ready. Close, simplify, smooth, accept, or cancel.')
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // Pointer may already be released by the browser.
    }
  }

  function onWheel(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault(); zoomAt(Math.exp(-event.deltaY * .0015), event.clientX, event.clientY)
  }

  function fillWholeBoard() {
    if (points.length < 3) { setStatus('Fill blocked: add at least three boundary points.'); return }
    setMode('fill'); setAutoFixProposal({ points: clonePoints(points), holes: holes.map((hole) => ({ ...hole })), changes: ['Close the open path with the minimal edge from the last endpoint to the first. Existing concavity and holes are preserved.'], before: validation, after: validateOutline(points, holes) })
    setStatus('Fill Whole Board preview ready. Accept repair to apply the proposed closure.')
  }

  function fillSection(requestedStyle: FillSectionStyle = fillStyle) {
    setMode('fill')
    if (selectedPointIds.length !== 2) { setStatus('Select two endpoints or a connected open section to fill.'); return }
    const identified = points.filter((point): point is Point & { id: string } => Boolean(point.id))
    const proposal = proposeFillSection(identified as never, selectedPointIds as [string, string], { style: requestedStyle, holes: holes.map((hole) => ({ id: hole.ref, x: hole.x, y: hole.y, radius: hole.diameterMm / 2 + (hole.keepoutMm || 0) })) })
    setFillStyle(requestedStyle); setFillProposal(proposal); setStatus(proposal.safe ? 'Fill Section preview ready. Unrelated geometry is preserved.' : `Fill Section blocked: ${proposal.warnings[0]}`)
  }

  function acceptFillSection() {
    if (!fillProposal?.safe) return
    checkpoint(); setPoints(fillProposal.points.map((point) => ({ ...point }))); setFillProposal(null); setSelectedPointIds([]); setSelectedObject(null); setClosed(true)
    setStatus('Fill Section accepted as one undoable geometry transaction.')
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
    const duplicate = { id: newGeometryId('point'), x: point.x + 3, y: point.y + 3 }
    setPoints((current) => {
      const next = [...current]
      next.splice(index + 1, 0, duplicate)
      return next
    })
    setSelectedObject({ type: 'point', id: duplicate.id })
    setAutoFixProposal(null)
    setStatus(`Duplicated point ${index + 1}.`)
  }

  function addEdgeMidpoint(startId: string, endId: string) {
    const startIndex = points.findIndex((point) => point.id === startId)
    const end = points.find((point) => point.id === endId)
    if (startIndex < 0 || !end) return
    const start = points[startIndex]
    const midpoint: Point = { id: newGeometryId('point'), x: Number(((start.x + end.x) / 2).toFixed(2)), y: Number(((start.y + end.y) / 2).toFixed(2)) }
    checkpoint(); setPoints((current) => { const next = [...current]; next.splice(startIndex + 1, 0, midpoint); return next })
    setSelectedObject({ type: 'point', id: midpoint.id! }); setStatus('Midpoint inserted into the selected edge without changing the viewport.')
  }

  function straightenEdge(startId: string, endId: string) {
    const start = points.find((point) => point.id === startId); const end = points.find((point) => point.id === endId)
    if (!start || !end) return
    checkpoint(); const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)
    setPoints((current) => current.map((point) => point.id === endId ? { ...point, ...(horizontal ? { y: start.y } : { x: start.x }) } : point))
    setStatus('Selected edge straightened. Geometry validation updated.')
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
    if (points.length < 3) {
      setStatus('Add at least three outline points before adding mounting holes.')
      return
    }
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

  function deleteSelected() {
    if (!selectedObject) return
    if (selectedObject.type === 'point') {
      deletePoint(points.findIndex((point) => point.id === selectedObject.id))
    } else if (selectedObject.type === 'edge') {
      setStatus('Delete edge is blocked because it would open the outline. Use Fill Section to replace it.')
    } else {
      deleteHole(selectedObject.ref)
    }
  }

  function duplicateSelected() {
    if (!selectedObject) return
    if (selectedObject.type === 'point') {
      duplicatePoint(points.findIndex((point) => point.id === selectedObject.id))
    } else if (selectedObject.type === 'edge') {
      addEdgeMidpoint(selectedObject.startId, selectedObject.endId)
    } else {
      duplicateHole(selectedObject.ref)
    }
  }

  function snapSelected() {
    if (!selectedObject) return
    if (selectedObject.type === 'point') {
      snapPoint(points.findIndex((point) => point.id === selectedObject.id))
    } else if (selectedObject.type === 'edge') {
      setStatus('Snap applies to points and holes; select an edge endpoint to snap it.')
    } else {
      snapHole(selectedObject.ref)
    }
  }

  function runAutoFixGeometry() {
    const proposal = buildAutoFixProposal(points, holes, validation)
    setAutoFixProposal(proposal)
    setStatus(proposal.changes.length ? `Auto-Fix proposal ready: ${proposal.changes[0]}` : 'Auto-Fix found no safe geometry changes to propose.')
  }

  function acceptAutoFixGeometry() {
    if (!autoFixProposal) return
    checkpoint()
    setPoints(autoFixProposal.points)
    setHoles(autoFixProposal.holes)
    if (autoFixProposal.changes.some((change) => change.startsWith('Close the open path'))) setClosed(true)
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
      const data = await callBoardForgeLocalEngine(path, { method: 'POST', body }) as { ok?: boolean; errors?: Array<{ message?: string }> }
      if (!data.ok) throw new Error(data.errors?.[0]?.message || 'The local engine did not accept the outline request.')
      setStatus(action === 'generate' ? 'Local KiCad outline candidate created. Open Projects to inspect its recorded evidence.' : 'Local engine validation request completed. Browser geometry results remain separate from KiCad evidence.')
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setStatus(action === 'generate' ? `Local KiCad creation was not started. ${message || 'Pair a desktop helper before creating a candidate.'}` : `Browser geometry checks remain available. ${message || 'Pair a desktop helper to request local KiCad validation.'}`)
    }
  }

  function saveBrowserOutlineDraft() {
    const projectId = browserDraftId.current || `browser-outline-${Date.now().toString(36)}`
    browserDraftId.current = projectId
    const outline = buildOutlinePayload({ preset, points, holes, validation, metrics })
    const project = createBrowserProject({
      projectId,
      projectName: `${labelForPreset(preset)} outline`,
      prompt,
      kind: 'browser_outline',
      browserDraft: {
        schema: 'boardforge.browser-draft.v1',
        kind: 'outline',
        updatedAt: new Date().toISOString(),
        summary: `${outline.outlinePointsMm.length} outline vertices and ${outline.mountingHolesMm.length} mounting holes saved from the browser editor.`,
        outline: {
          preset,
          closed,
          pointsMm: outline.outlinePointsMm.map(({ x, y }) => ({ x, y })),
          mountingHolesMm: outline.mountingHolesMm.map((hole) => ({
            ref: hole.ref,
            x: hole.x,
            y: hole.y,
            diameterMm: hole.diameterMm,
            keepoutMm: hole.keepoutMm,
            plating: hole.plating,
            locked: hole.locked,
          })),
          browserValidation: {
            status: validation.valid ? 'valid' : 'blocked',
            routeabilityScore: outline.browserValidation.routeabilityScore,
            risk: outline.browserValidation.risk,
            blockers: outline.browserValidation.blockers,
          },
        },
      },
    })
    saveBrowserProject(project)
    setBrowserDraftSaved(true)
    setStatus(`Browser outline draft saved with ${outline.outlinePointsMm.length} vertices and ${outline.mountingHolesMm.length} holes. It retains no KiCad files and has no local DRC/ERC or manufacturing evidence.`)
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
            Shape editing, dimensions, and mechanical checks run in this browser. Save the outline as a browser draft,
            then optionally pair the desktop helper when you are ready to create and validate KiCad artifacts.
          </p>
        </div>
        <div className="bf-outline-truth-gates" aria-label="Outline validation truth gates">
          <div className={validation.valid ? 'pass' : 'blocked'}><CheckCircle2 size={22} /><span>Geometry</span><strong>{validation.valid ? 'Browser checks pass' : 'Blocked'}</strong></div>
          <div className="pending"><Cpu size={22} /><span>Local KiCad</span><strong>Not requested</strong></div>
          <div className={validation.valid ? 'pass' : 'blocked'}><ShieldCheck size={22} /><span>Edge.Cuts seed</span><strong>{validation.valid ? 'Ready to hand off' : 'Needs repair'}</strong></div>
        </div>
      </div>
      <div className="bf-outline-generator-shell">
        <aside className="bf-outline-tool-rail" aria-label="Outline tools">
          <button title="Select and edit points, holes, and edges." type="button" className={mode === 'select' ? 'active' : ''} onClick={() => setMode('select')}><MousePointer2 size={16} /> Select</button>
          <button title="Insert one point without changing the view." type="button" className={mode === 'add-point' ? 'active' : ''} onClick={() => setMode('add-point')}><Plus size={16} /> Add point</button>
          <button title="Draw a freehand outline. Release to preview and simplify." type="button" className={mode === 'draw' ? 'active' : ''} onClick={() => setMode('draw')}><Pencil size={16} /> Draw</button>
          <button title="Move the view without changing geometry." type="button" className={mode === 'pan' ? 'active' : ''} onClick={() => setMode('pan')}><Hand size={16} /> Pan</button>
          <button title="Snap edits to the board grid." type="button" className={snap ? 'active' : ''} onClick={() => setSnap(!snap)}><Grid2X2 size={16} /> Snap</button>
          <button title="Close the entire outline." type="button" onClick={fillWholeBoard}><Wand2 size={16} /> Fill Whole Board</button>
          <button title="Close only a selected section." type="button" onClick={() => fillSection()}><Wand2 size={16} /> Fill Section</button>
          <button type="button" onClick={addHole}><ShieldCheck size={16} /> Add hole</button>
          <button type="button" onClick={runAutoFixGeometry}><Wand2 size={16} /> Auto-Fix Geometry</button>
          <button type="button" onClick={resetCanvas}><RotateCcw size={16} /> Reset</button>
          <button type="button" disabled={!history.length} onClick={undo}><Undo2 size={16} /> Undo</button>
          <button type="button" disabled={!future.length} onClick={redo}><Redo2 size={16} /> Redo</button>
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
            <button type="button" onClick={() => callLocal('validate')}><Sparkles size={16} /> Run local KiCad check</button>
            <button type="button" className={!validation.valid ? 'blocked' : ''} onClick={() => callLocal('generate')} disabled={!validation.valid}><Download size={16} /> Create local KiCad outline</button>
          </div>
          <div className="bf-outline-studio">
        <div className={styles.viewportControls} aria-label="Viewport controls">
          <button title="Zoom Out" type="button" onClick={() => zoomAt(1 / 1.25)}><ZoomOut size={15} /></button>
          <output aria-label="Zoom percentage">{Math.round(viewport.zoom * 100)}%</output>
          <button title="Zoom In" type="button" onClick={() => zoomAt(1.25)}><ZoomIn size={15} /></button>
          <button title="Fit the current outline into the viewport." type="button" onClick={fitBoard}>Fit Board</button>
          <button title="Reset the view without changing geometry." type="button" onClick={resetView}>Reset View</button>
        </div>
        <svg
          ref={svgRef}
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={startPointer}
          onPointerMove={movePointer}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onWheel={onWheel}
          role="img"
          aria-label="Custom board outline editor"
        >
          <defs>
            <pattern id="bf-outline-grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(124,245,208,.13)" strokeWidth=".18" /></pattern>
            <filter id="bf-outline-editor-shadow" x="-20%" y="-30%" width="140%" height="170%">
              <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000" floodOpacity=".4" />
            </filter>
          </defs>
          <rect x={viewport.panX - 200} y={viewport.panY - 200} width={500} height={500} fill="url(#bf-outline-grid)" />
          {points.length > 1 && <polyline className="bf-editor-open-path" points={toSvgPoints(points)} />}
          {points.slice(0, closed ? points.length : -1).map((point, index) => { const end = points[(index + 1) % points.length]; return <line key={`edge-${point.id}-${end.id}`} className={`${styles.editorEdge} bf-editor-edge`} x1={point.x} y1={point.y} x2={end.x} y2={end.y} /> })}
          {drawDraft && drawDraft.points.length > 1 && <polyline className={styles.drawPreview} points={toSvgPoints(drawDraft.points)} />}
          {fillProposal && <polyline className={styles.fillPreview} points={toSvgPoints(fillProposal.points)} />}
          {selectedObject?.type === 'edge' && selectedEdge?.start && selectedEdge.end && <line className={styles.selectedEdge} x1={selectedEdge.start.x} y1={selectedEdge.start.y} x2={selectedEdge.end.x} y2={selectedEdge.end.y} />}
          {closed && points.length > 2 && <polygon className={validation.valid ? 'bf-editor-polygon valid' : 'bf-editor-polygon blocked'} points={toSvgPoints(points)} filter="url(#bf-outline-editor-shadow)" />}
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
            <g key={point.id} data-point-id={point.id} className={selectedPoint === index ? 'bf-editor-point selected' : 'bf-editor-point'}>
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
              point={selectedObject?.type === 'point' ? points.find((point) => point.id === selectedObject.id) || null : null}
              pointIndex={selectedPoint ?? -1}
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
              onAddEdgeMidpoint={addEdgeMidpoint}
              onStraightenEdge={straightenEdge}
              edgeLength={selectedEdge?.start && selectedEdge.end ? distance(selectedEdge.start, selectedEdge.end) : null}
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
          {drawDraft && !drawingRef.current && <div className={styles.drawPanel}>
            <strong>Draw preview</strong>
            <span>{drawDraft.preview.rawPointCount} points simplified to {drawDraft.preview.previewPointCount} points · {drawDraft.preview.closed ? 'Closed' : 'Open'}</span>
            {drawDraft.preview.warnings.map((warning) => <span key={warning} className={styles.warning}>{warning}</span>)}
            <div>
              <button type="button" disabled={!drawDraft.acceptReady} onClick={acceptDrawDraft}>Accept</button>
              <button type="button" onClick={() => setDrawTolerance((value) => Math.min(5, value + .35))}>Simplify More</button>
              <button type="button" onClick={() => setDrawSmoothing((value) => Math.min(3, value + 1))}>Smooth</button>
              <button type="button" onClick={() => setDrawCloseRequested(true)}>Close Shape</button>
              <button type="button" onClick={cancelDrawDraft}>Cancel</button>
            </div>
          </div>}
          {fillProposal && <div className={styles.drawPanel}>
            <strong>Fill Section preview</strong><span>{fillProposal.removedPointIds.length} replaced · {fillProposal.addedPoints.length} added</span>
            {fillProposal.warnings.map((warning) => <span key={warning} className={styles.warning}>{warning}</span>)}
            <div>{(['straight','rounded','smooth','minimum-distance'] as FillSectionStyle[]).map((style) => <button type="button" key={style} onClick={() => fillSection(style)}>{style === 'straight' ? 'Straight Fill' : style}</button>)}</div>
            <div><button type="button" disabled={!fillProposal.safe} onClick={acceptFillSection}>Accept Fill</button><button type="button" onClick={() => setFillProposal(null)}>Reject</button></div>
          </div>}
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
        <div><Cpu size={20} /><span>Geometry engine</span><strong>{rustGeometryStatus === 'active' ? 'Rust/WASM' : rustGeometryStatus === 'loading' ? 'Loading WASM' : 'TypeScript fallback'}</strong></div>
        <div><Ruler size={20} /><span>Board area</span><strong>{areaText}</strong></div>
        <div><Layers3 size={20} /><span>Outline points</span><strong>{points.length}</strong></div>
        <div><ShieldCheck size={20} /><span>Holes verified</span><strong>{holesInside} / {holes.length}</strong></div>
        <div><Ruler size={20} /><span>Dimensions</span><strong>{box.width.toFixed(1)} x {box.height.toFixed(1)} mm</strong></div>
        <div><Grid2X2 size={20} /><span>Edge length</span><strong>{edgeLength.toFixed(1)} mm</strong></div>
        <div><Cpu size={20} /><span>Local KiCad</span><strong>Not requested</strong></div>
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
            <b>Browser outline handoff</b>
            <p>
              Save the exact browser geometry for the project library, or package points, mounting holes, and geometry notes
              for a paired local engine or external review.
            </p>
          </div>
          <button type="button" onClick={saveBrowserOutlineDraft}>{browserDraftSaved ? 'Update browser draft' : 'Save browser outline draft'}</button>
          <button type="button" onClick={copyPrompt}>
            <ClipboardCopy size={15} /> {copied ? 'Copied' : 'Copy prompt'}
          </button>
          <button type="button" onClick={downloadSeed}>Download outline handoff</button>
        </div>
        <div className="bf-outline-hotkeys" aria-label="Custom board generator keyboard shortcuts">
          <b>Keyboard shortcuts</b>
          <span><kbd>M</kbd> move selected</span>
          <span><kbd>D</kbd> duplicate selected</span>
          <span><kbd>Del</kbd> delete selected</span>
          <span><kbd>S</kbd> snap selected</span>
          <span><kbd>A</kbd>/<kbd>P</kbd> add point</span>
          <span><kbd>H</kbd> add hole</span>
          <span><kbd>F</kbd> auto-fix</span>
          <span><kbd>R</kbd> reset preset/canvas</span>
          <span><kbd>C</kbd> copy prompt</span>
          <span><kbd>V</kbd> validate local</span>
          <span><kbd>G</kbd> download package</span>
          <span><kbd>Esc</kbd> clear selection</span>
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
  pointIndex,
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
  onAddEdgeMidpoint,
  onStraightenEdge,
  edgeLength,
}: {
  selectedObject: SelectedObject
  point: Point | null
  pointIndex: number
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
  onAddEdgeMidpoint: (startId: string, endId: string) => void
  onStraightenEdge: (startId: string, endId: string) => void
  edgeLength: number | null
}) {
  if (!selectedObject) return null

  if (selectedObject.type === 'point' && point) {
    return (
      <div className="bf-selection-menu" onPointerDown={(event) => event.stopPropagation()}>
        <div className="bf-selection-menu-head">
          <span>Selected point {pointIndex + 1}</span>
          <button type="button" onClick={onClose}>Clear</button>
        </div>
        <div className="bf-selection-fields">
          <label>X mm<input type="number" step="0.1" value={point.x} onChange={(event) => onUpdatePoint(pointIndex, { x: Number(event.target.value) })} /></label>
          <label>Y mm<input type="number" step="0.1" value={point.y} onChange={(event) => onUpdatePoint(pointIndex, { y: Number(event.target.value) })} /></label>
        </div>
        <div className="bf-selection-actions">
          <button type="button" onClick={() => onSnapPoint(pointIndex)}>Snap to grid</button>
          <button type="button" onClick={() => onDuplicatePoint(pointIndex)}><Copy size={14} /> Duplicate</button>
          <button type="button" onClick={() => onSmoothPoint(pointIndex)}>Smooth corner</button>
          <button type="button" onClick={() => setMultiSelect(!multiSelect)}>{multiSelect ? 'Stop select more' : 'Select more'}</button>
          <button type="button" className="danger" onClick={() => onDeletePoint(pointIndex)}><Trash2 size={14} /> Delete point</button>
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

  if (selectedObject.type === 'edge') {
    return <div className="bf-selection-menu" onPointerDown={(event) => event.stopPropagation()}>
      <div className="bf-selection-menu-head"><span>Selected edge</span><button type="button" onClick={onClose}>Clear</button></div>
      <span>Length: {edgeLength?.toFixed(2)} mm</span>
      <div className="bf-selection-actions">
        <button type="button" onClick={() => onStraightenEdge(selectedObject.startId, selectedObject.endId)}>Straighten</button>
        <button type="button" onClick={() => onAddEdgeMidpoint(selectedObject.startId, selectedObject.endId)}>Add midpoint</button>
        <button type="button" onClick={() => onAddEdgeMidpoint(selectedObject.startId, selectedObject.endId)}>Split edge</button>
        <button type="button" disabled title="Connector intent metadata is not supported by the current export schema.">Connector edge</button>
      </div>
    </div>
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

Outline preset: ${labelForPreset(preset)} (${preset})
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
    presetLabel: labelForPreset(preset),
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
    const box = bounds(points)
    const center = { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 }
    const spacing = 30.5
    const half = spacing / 2
    const stack = [
      { ref: 'M3-1', x: center.x - half, y: center.y - half, diameterMm: 3.05, keepoutMm: 1.1 },
      { ref: 'M3-2', x: center.x + half, y: center.y - half, diameterMm: 3.05, keepoutMm: 1.1 },
      { ref: 'M3-3', x: center.x + half, y: center.y + half, diameterMm: 3.05, keepoutMm: 1.1 },
      { ref: 'M3-4', x: center.x - half, y: center.y + half, diameterMm: 3.05, keepoutMm: 1.1 },
    ]
    return stack.slice(0, Math.min(count, 4)).map((hole) => ({ ...hole, plating: 'plated' as const, locked: true }))
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
  const redundantPointCount = countRedundantPoints(points)
  const minUsefulDimension = Math.min(box.width, box.height)
  const aspectRatio = Math.max(box.width / Math.max(1, box.height), box.height / Math.max(1, box.width))
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
    { label: 'Redundant points OK', pass: redundantPointCount === 0, reason: redundantPointCount === 0 ? 'No unnecessary collinear or clustered outline vertices detected.' : `${redundantPointCount} redundant point(s) should be removed or smoothed.` },
    { label: 'Aspect ratio OK', pass: aspectRatio < 5, reason: 'Outline aspect ratio is checked for routeability.' },
  ]
  const blockers = checks.filter((check) => !check.pass).map((check) => check.reason)
  if (points.length < 3) {
    return { valid: false, routeability: 0, risk: 'Blocked', checks, blockers }
  }
  const narrowPenalty = minUsefulDimension < 24 ? Math.min(20, (24 - minUsefulDimension) * 1.4) : 0
  const aspectPenalty = aspectRatio > 3.2 ? Math.min(12, (aspectRatio - 3.2) * 5) : 0
  const holePenalty = holes.length ? Math.max(0, 4 - holes.length) * 1.5 : 0
  const routeability = blockers.length
    ? Math.max(0, Math.round(68 - blockers.length * 10 - redundantPointCount * 3 - narrowPenalty - aspectPenalty))
    : Math.max(60, Math.min(100, Math.round(100 - redundantPointCount * 4 - narrowPenalty - aspectPenalty - holePenalty)))
  const risk = blockers.length ? 'Blocked' : routeability > 78 ? 'Low' : routeability > 60 ? 'Medium' : 'High'
  return { valid: blockers.length === 0, routeability, risk, checks, blockers }
}

function buildAutoFixProposal(points: Point[], holes: Hole[], before: ValidationResult): AutoFixProposal {
  const changes: string[] = []
  let nextPoints = removeDuplicateTinyAndRedundantEdges(points, changes)

  if (countIntersections(nextPoints) > 0) {
    nextPoints = sortOutlineByAngle(nextPoints)
    changes.push('Reordered crossing outline vertices around the board centroid to remove self-intersections.')
    nextPoints = removeDuplicateTinyAndRedundantEdges(nextPoints, changes)
  }

  if (nextPoints.length >= 3 && Math.abs(polygonArea(nextPoints)) < 280) {
    nextPoints = scaleAroundCentroid(nextPoints, 1.18)
    changes.push('Scaled the outline outward because the drawn area was below the useful minimum.')
  }

  const centroid = polygonCentroid(nextPoints)
  const repairedHoles = holes.map((hole) => {
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
  let nextHoles = repairedHoles.filter((hole) => {
    const minClearance = Math.max(2.2, hole.diameterMm / 2 + (hole.keepoutMm ?? 1))
    const safe = pointInPolygon(hole, nextPoints) && distanceToPolygonEdges(hole, nextPoints) >= minClearance
    if (!safe) changes.push(`Removed ${hole.ref} because it could not be repaired inside the outline with required edge clearance.`)
    return safe
  })

  if (holes.length > 0 && nextHoles.length === 0 && nextPoints.length >= 3) {
    const replacement = chooseNewHolePosition(nextPoints, [])
    nextHoles = [{ ref: 'H1', ...replacement, diameterMm: 2.4, keepoutMm: 1, plating: 'plated' }]
    changes.push('Created one safe replacement mounting hole because every original hole was outside the usable board area.')
  }

  const after = validateOutline(nextPoints, nextHoles)
  return { points: nextPoints, holes: nextHoles, changes, before, after }
}

function removeDuplicateTinyAndRedundantEdges(points: Point[], changes: string[]) {
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
  if (cleaned.length < 3) return points
  const simplified = cleaned.filter((point, index) => {
    const previous = cleaned[(index - 1 + cleaned.length) % cleaned.length]
    const next = cleaned[(index + 1) % cleaned.length]
    const nearlyCollinear = distanceToSegment(point, previous, next) < 0.55
    const tinyAngle = cornerAngle(previous, point, next) > 172
    if (nearlyCollinear || tinyAngle) {
      changes.push(`Removed redundant point ${index + 1} that did not materially define the board outline.`)
      return false
    }
    return true
  })
  return simplified.length >= 3 ? simplified : cleaned
}

function countRedundantPoints(points: Point[]) {
  if (points.length < 4) return 0
  let count = 0
  points.forEach((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]
    if (distanceToSegment(point, previous, next) < 0.55 || cornerAngle(previous, point, next) > 172) count += 1
  })
  return count
}

function cornerAngle(previous: Point, current: Point, next: Point) {
  const ax = previous.x - current.x
  const ay = previous.y - current.y
  const bx = next.x - current.x
  const by = next.y - current.y
  const magnitude = Math.hypot(ax, ay) * Math.hypot(bx, by)
  if (!magnitude) return 180
  const cosine = clamp((ax * bx + ay * by) / magnitude, -1, 1)
  return (Math.acos(cosine) * 180) / Math.PI
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

function nearestEdge(points: Point[], target: Point, closed: boolean) {
  const count = closed ? points.length : Math.max(0, points.length - 1)
  let best: { index: number; start: Point; end: Point; distance: number } | null = null
  for (let index = 0; index < count; index += 1) {
    const start = points[index]; const end = points[(index + 1) % points.length]
    const edgeDistance = distanceToSegment(target, start, end)
    if (!best || edgeDistance < best.distance) best = { index, start, end, distance: edgeDistance }
  }
  return best
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
  const identified = { ...point, id: point.id || newGeometryId('point') }
  if (points.length < 3) return [...points, identified]
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
  next.splice(bestIndex, 0, identified)
  return next
}

function appendDrawPoint(points: Point[], point: Point, threshold: number) {
  const last = points[points.length - 1]
  if (last && distance(last, point) < threshold) return points
  return [...points, { ...point, id: point.id || newGeometryId('point') }]
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

function toSvgPoints(points: readonly Point[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

function clonePoints(points: Point[]) {
  return points.map((point) => ({ ...point, id: point.id || newGeometryId('point') }))
}

function newGeometryId(kind: 'point' | 'hole') {
  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${kind}-${token}`
}

function labelForPreset(id: string) {
  return outlinePresets.find((preset) => preset.id === id)?.label || id
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

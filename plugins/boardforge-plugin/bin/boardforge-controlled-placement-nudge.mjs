#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  buildControlledNudgeExecutionPlan,
  runControlledComponentNudge,
} from '../lib/routing/controlled-component-nudge.mjs'

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : fallback
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

function numberArg(name, fallback) {
  const value = arg(name)
  return value == null ? fallback : Number(value)
}

function findDefaultKicadPython() {
  const candidates = [
    'C:\\Program Files\\KiCad\\10.0\\bin\\python.exe',
    'C:\\Program Files\\KiCad\\9.0\\bin\\python.exe',
  ]
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? 'python'
}

function findDefaultKicadCli() {
  const candidates = [
    'C:\\Program Files\\KiCad\\10.0\\bin\\kicad-cli.exe',
    'C:\\Program Files\\KiCad\\9.0\\bin\\kicad-cli.exe',
  ]
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? 'kicad-cli'
}

function loadRegion(regionPath, refsArg) {
  if (regionPath && fs.existsSync(regionPath)) {
    const data = JSON.parse(fs.readFileSync(regionPath, 'utf8'))
    return data.hardestRegion || data.region || data
  }
  const refs = refsArg ? refsArg.split(',').map((ref) => ref.trim()).filter(Boolean) : []
  return { refs }
}

function countsFromDrc(data = {}) {
  const violations = data.violations || []
  const unconnected = data.unconnected_items || []
  const shorts = violations.filter((violation) => ['shorting_items', 'shorting'].includes(String(violation.type || '').toLowerCase()))
  const forbiddenVias = violations.filter((violation) => /forbidden/i.test(JSON.stringify(violation)) && /via/i.test(JSON.stringify(violation)))
  return {
    violations: violations.length,
    unconnected: unconnected.length,
    shorts: shorts.length,
    forbiddenVias: forbiddenVias.length,
  }
}

function runDrc(kicadCli, boardPath, reportPath) {
  const proc = spawnSync(kicadCli, ['pcb', 'drc', '--format', 'json', '--output', reportPath, boardPath], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
  })
  const data = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : {}
  return {
    exitCode: proc.status,
    stdout: proc.stdout,
    stderr: proc.stderr,
    reportPath,
    counts: countsFromDrc(data),
  }
}

const nudgeHelper = String.raw`
import argparse
import json
import os
import pcbnew

NM_PER_MM = 1000000

def mm(value):
    return int(round(float(value) * NM_PER_MM))

def to_mm(value):
    return float(value) / NM_PER_MM

def move_candidate(board_path, out_path, candidate):
    board = pcbnew.LoadBoard(board_path)
    if board is None:
        raise RuntimeError('board_load_failed')
    fp = board.FindFootprintByReference(candidate['ref'])
    if fp is None:
        return {'written': False, 'reason': 'footprint_not_found', 'candidate': candidate}
    if candidate['ref'].upper().startswith('H'):
        return {'written': False, 'reason': 'mounting_hole_ref_locked', 'candidate': candidate}
    before = fp.GetPosition()
    pad_positions = []
    for pad in fp.Pads():
        pos = pad.GetPosition()
        pad_positions.append({
            'x': pos.x,
            'y': pos.y,
            'netCode': pad.GetNetCode(),
        })
    if candidate.get('action') == 'move':
        delta = pcbnew.VECTOR2I(mm(candidate.get('dx', 0)), mm(candidate.get('dy', 0)))
        fp.Move(delta)
    elif candidate.get('action') == 'rotate':
        delta = pcbnew.VECTOR2I(0, 0)
        fp.Rotate(before, pcbnew.EDA_ANGLE(float(candidate.get('degrees', 90)), pcbnew.DEGREES_T))
    else:
        return {'written': False, 'reason': 'unsupported_action', 'candidate': candidate}
    endpoints_moved = 0
    if candidate.get('action') == 'move':
        tolerance = mm(0.03)
        for track in board.GetTracks():
            if type(track).__name__ != 'PCB_TRACK':
                continue
            for pad_pos in pad_positions:
                if track.GetNetCode() != pad_pos['netCode']:
                    continue
                start = track.GetStart()
                end = track.GetEnd()
                if abs(start.x - pad_pos['x']) <= tolerance and abs(start.y - pad_pos['y']) <= tolerance:
                    track.SetStart(pcbnew.VECTOR2I(start.x + delta.x, start.y + delta.y))
                    endpoints_moved += 1
                if abs(end.x - pad_pos['x']) <= tolerance and abs(end.y - pad_pos['y']) <= tolerance:
                    track.SetEnd(pcbnew.VECTOR2I(end.x + delta.x, end.y + delta.y))
                    endpoints_moved += 1
    try:
        pcbnew.ZONE_FILLER(board).Fill(board.Zones())
    except Exception:
        pass
    board.Save(out_path)
    after = fp.GetPosition()
    return {
        'written': True,
        'candidate': candidate,
        'from': {'x': to_mm(before.x), 'y': to_mm(before.y)},
        'to': {'x': to_mm(after.x), 'y': to_mm(after.y)},
        'attachedTrackEndpointsMoved': endpoints_moved,
    }

parser = argparse.ArgumentParser()
parser.add_argument('--board', required=True)
parser.add_argument('--out', required=True)
parser.add_argument('--candidate-json', required=True)
parser.add_argument('--result', required=True)
args = parser.parse_args()

candidate = json.loads(args.candidate_json)
os.makedirs(os.path.dirname(args.out), exist_ok=True)
result = move_candidate(args.board, args.out, candidate)
with open(args.result, 'w', encoding='utf-8') as f:
    json.dump(result, f, indent=2)
print(json.dumps(result, indent=2))
`

function writeNudgeCandidate({ board, outDir, candidate, helperPath, kicadPython }) {
  const base = `boardforge-nudge-${candidate.candidateId}`
  const out = path.join(outDir, `${base}.kicad_pcb`)
  const resultPath = path.join(outDir, `${base}.json`)
  const proc = spawnSync(kicadPython, [
    helperPath,
    '--board', board,
    '--out', out,
    '--candidate-json', JSON.stringify(candidate),
    '--result', resultPath,
  ], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 })
  if (proc.status !== 0) {
    return { candidate, written: false, reason: 'python_helper_failed', stderr: proc.stderr, stdout: proc.stdout }
  }
  const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'))
  return { ...result, boardPath: out, resultPath }
}

function runExactAfterNudge({ board, outDir, out, maxItems, maxMinutes, maxDrcCalls }) {
  const report = path.join(outDir, `${path.basename(out, '.kicad_pcb')}-exact-report.json`)
  const routeFinish = path.join(import.meta.dirname, 'boardforge-route-finish.mjs')
  const proc = spawnSync(process.execPath, [
    routeFinish,
    '--board', board,
    '--mode', 'clearance-aware-exact-finish',
    '--out', out,
    '--out-dir', outDir,
    '--report', report,
    '--max-items', String(maxItems),
    '--max-candidates-per-item', '16',
    '--max-drc-calls', String(maxDrcCalls),
    '--max-minutes', String(maxMinutes),
  ], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 40 })
  if (proc.status !== 0 || !fs.existsSync(report)) {
    return {
      ran: false,
      exitCode: proc.status,
      stdout: proc.stdout,
      stderr: proc.stderr,
    }
  }
  return {
    ran: true,
    exitCode: proc.status,
    reportPath: report,
    result: JSON.parse(fs.readFileSync(report, 'utf8')),
  }
}

function runPhysicalControlledNudge(board, region, options) {
  const outDir = options.outDir
  fs.mkdirSync(outDir, { recursive: true })
  const out = options.out
  const kicadPython = options.kicadPython
  const kicadCli = options.kicadCli
  const helperPath = path.join(os.tmpdir(), `boardforge-controlled-placement-nudge-${process.pid}.py`)
  fs.writeFileSync(helperPath, nudgeHelper)
  const plan = buildControlledNudgeExecutionPlan(board, region, {
    deltasMm: options.deltasMm,
    fixedRefs: options.fixedRefs,
    maxCandidates: options.maxCandidates,
    routeAfterNudge: options.routeAfterNudge,
  })
  const baselineDrc = runDrc(kicadCli, board, path.join(outDir, 'boardforge-controlled-nudge-baseline-drc.json'))
  const attempts = []
  let promoted = null
  let latestBoard = board
  for (const candidate of plan.candidates.slice(0, options.maxCandidates)) {
    const nudge = writeNudgeCandidate({ board, outDir, candidate, helperPath, kicadPython })
    const attempt = { candidate, nudge }
    attempts.push(attempt)
    if (!nudge.written) {
      attempt.decision = 'rolled_back_no_candidate'
      continue
    }
    const candidateDrc = runDrc(kicadCli, nudge.boardPath, path.join(outDir, `boardforge-nudge-${candidate.candidateId}-drc.json`))
    attempt.nudgeDrc = candidateDrc.counts
    if (candidateDrc.counts.violations > 0 || candidateDrc.counts.shorts > 0 || candidateDrc.counts.forbiddenVias > 0) {
      attempt.decision = 'rolled_back_drc_after_nudge'
      continue
    }
    let routed = null
    if (options.routeAfterNudge) {
      const routedOut = path.join(outDir, `boardforge-nudge-${candidate.candidateId}-exact.kicad_pcb`)
      routed = runExactAfterNudge({
        board: nudge.boardPath,
        outDir,
        out: routedOut,
        maxItems: options.exactMaxItems,
        maxMinutes: options.exactMaxMinutes,
        maxDrcCalls: options.exactMaxDrcCalls,
      })
      attempt.exactRoute = routed.ran ? {
        reportPath: routed.reportPath,
        baseline: routed.result.baseline,
        final: routed.result.final,
        commits: routed.result.commits,
        attempts: routed.result.attempts,
      } : routed
    }
    const finalCounts = routed?.ran ? routed.result.final : candidateDrc.counts
    const finalBoard = routed?.ran ? routed.result.latestBoard : nudge.boardPath
    const improvesConnectivity = finalCounts.unconnected < baselineDrc.counts.unconnected
    const safe = finalCounts.violations === 0 && finalCounts.shorts === 0 && finalCounts.forbiddenVias === 0
    if (safe && improvesConnectivity) {
      fs.copyFileSync(finalBoard, out)
      promoted = {
        candidate,
        boardPath: out,
        sourceBoard: finalBoard,
        final: finalCounts,
        reason: 'drc_clean_and_unconnected_decreased_after_nudge_exact_finish',
      }
      attempt.decision = 'committed_improved'
      latestBoard = out
      break
    }
    attempt.decision = safe ? 'rolled_back_no_connectivity_improvement' : 'rolled_back_unsafe_after_exact_route'
  }
  const finalDrc = promoted
    ? runDrc(kicadCli, out, path.join(outDir, 'boardforge-controlled-nudge-final-drc.json'))
    : baselineDrc
  return {
    mode: 'controlled_component_nudge_transaction',
    startingBoard: board,
    latestBoard,
    outputBoard: out,
    baseline: baselineDrc.counts,
    final: finalDrc.counts,
    plan,
    candidatesAttempted: attempts.length,
    committed: Boolean(promoted),
    promoted,
    attempts,
    rollbacks: attempts.filter((attempt) => attempt.decision && attempt.decision.startsWith('rolled_back')).length,
    hardLocks: {
      boardOutlineChanged: false,
      mountingHolesMoved: false,
      partsFootprintsPackagesChanged: false,
    },
  }
}

const board = arg('board')
if (!board) throw new Error('--board is required')
const outDir = arg('out-dir', path.dirname(board))
const region = loadRegion(arg('region'), arg('refs'))
const execute = hasFlag('execute') || arg('mode') === 'execute'
const result = execute
  ? runPhysicalControlledNudge(board, region, {
    outDir,
    out: arg('out', path.join(outDir, `${path.basename(board, '.kicad_pcb')}_controlled_nudge.kicad_pcb`)),
    kicadPython: arg('kicad-python', findDefaultKicadPython()),
    kicadCli: arg('kicad-cli', findDefaultKicadCli()),
    deltasMm: (arg('deltas', '0.25,0.5') || '').split(',').map(Number).filter((value) => Number.isFinite(value) && value > 0),
    fixedRefs: (arg('fixed-refs', '') || '').split(',').map((ref) => ref.trim()).filter(Boolean),
    maxCandidates: numberArg('max-candidates', 12),
    routeAfterNudge: !hasFlag('no-route-after-nudge'),
    exactMaxItems: numberArg('exact-max-items', 13),
    exactMaxMinutes: numberArg('exact-max-minutes', 4),
    exactMaxDrcCalls: numberArg('exact-max-drc-calls', 24),
  })
  : runControlledComponentNudge(board, region)
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'boardforge-controlled-component-nudge.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))

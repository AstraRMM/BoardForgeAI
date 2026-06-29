#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  buildClearanceAwareExactFinisherPlan,
  buildExactRatsnestFinisherPlan,
  classifyExactFinisherRun,
} from '../lib/routing/exact-ratsnest-finisher.mjs'

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

const clearanceAwareHelper = String.raw`
import argparse
import copy
import json
import math
import os
import shutil
import subprocess
import sys
import time

import pcbnew

NM_PER_MM = 1000000

def mm(value):
    return int(round(float(value) * NM_PER_MM))

def to_mm(value):
    return float(value) / NM_PER_MM

def point(obj):
    return (to_mm(obj.x), to_mm(obj.y))

def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def run_drc(kicad_cli, board_path, out_path):
    cmd = [kicad_cli, 'pcb', 'drc', '--format', 'json', '--output', out_path, board_path]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    data = {}
    if os.path.exists(out_path):
        data = load_json(out_path)
    return {
        'exitCode': proc.returncode,
        'stdout': proc.stdout,
        'stderr': proc.stderr,
        'reportPath': out_path,
        'data': data,
    }

def drc_counts(data):
    violations = data.get('violations') or []
    unconnected = data.get('unconnected_items') or []
    shorts = [v for v in violations if str(v.get('type', '')).lower() in ('shorting_items', 'shorting')]
    forbidden = [v for v in violations if 'forbidden' in str(v.get('type', '')).lower() and 'via' in str(v).lower()]
    return {
        'violations': len(violations),
        'unconnected': len(unconnected),
        'shorts': len(shorts),
        'forbiddenVias': len(forbidden),
    }

def layer_id(board, name):
    target = name.strip()
    for idx in range(64):
        try:
            if board.GetLayerName(idx) == target:
                return idx
        except Exception:
            pass
    if target == 'F.Cu':
        return 0
    if target == 'In1.Cu':
        return 1
    if target == 'In2.Cu':
        return 2
    if target == 'B.Cu':
        return 3
    return 0

def uuid_string(item):
    try:
        return item.m_Uuid.AsString()
    except Exception:
        return ''

def parse_pad_desc(desc):
    # Example: Pad 6 [I2C1_SCL] of U1 on F.Cu
    parts = desc.split()
    if len(parts) < 5 or parts[0] != 'Pad':
        return None
    pad = parts[1]
    ref = None
    for index, token in enumerate(parts):
        if token == 'of' and index + 1 < len(parts):
            ref = parts[index + 1]
            break
    layer = 'F.Cu'
    if ' on ' in desc:
        layer = desc.rsplit(' on ', 1)[1].strip()
    return {'ref': ref, 'pad': pad, 'layer': layer}

def parse_track_desc(desc):
    # Example: Track [I2C1_SCL] on F.Cu, length 0.8000 mm
    if not desc.startswith('Track '):
        return None
    net = ''
    if '[' in desc and ']' in desc:
        net = desc.split('[', 1)[1].split(']', 1)[0]
    layer = 'F.Cu'
    if ' on ' in desc:
        layer = desc.split(' on ', 1)[1].split(',', 1)[0].strip()
    return {'net': net, 'layer': layer}

def find_pad(board, ref, pad_number):
    for fp in board.GetFootprints():
        if fp.GetReference() != ref:
            continue
        for pad in fp.Pads():
            if pad.GetNumber() == pad_number:
                return pad
    return None

def endpoint_for_item(board, item, other_pos=None):
    desc = item.get('description', '')
    reported = item.get('pos') or {}
    reported_pos = (float(reported.get('x', 0)), float(reported.get('y', 0)))
    pad_info = parse_pad_desc(desc)
    if pad_info:
        pad = find_pad(board, pad_info['ref'], pad_info['pad'])
        if pad:
            return {
                'kind': 'pad',
                'description': desc,
                'net': pad.GetNetname(),
                'netCode': pad.GetNetCode(),
                'pos': point(pad.GetPosition()),
                'layer': layer_id(board, pad_info['layer']),
                'ref': pad_info['ref'],
                'pad': pad_info['pad'],
            }
    track_info = parse_track_desc(desc)
    if track_info:
        wanted_layer = layer_id(board, track_info['layer'])
        best = None
        for track in board.GetTracks():
            if type(track).__name__ != 'PCB_TRACK':
                continue
            if track.GetNetname() != track_info['net'] or track.GetLayer() != wanted_layer:
                continue
            start = point(track.GetStart())
            end = point(track.GetEnd())
            midpoint = ((start[0] + end[0]) / 2, (start[1] + end[1]) / 2)
            score = dist(reported_pos, midpoint)
            if best is None or score < best[0]:
                best = (score, track, start, end)
        if best:
            _, track, start, end = best
            chosen = start
            if other_pos is not None:
                chosen = start if dist(start, other_pos) <= dist(end, other_pos) else end
            return {
                'kind': 'track',
                'description': desc,
                'net': track.GetNetname(),
                'netCode': track.GetNetCode(),
                'pos': chosen,
                'layer': wanted_layer,
                'uuid': uuid_string(track),
            }
    return {
        'kind': 'reported',
        'description': desc,
        'net': '',
        'netCode': 0,
        'pos': reported_pos,
        'layer': 0,
    }

def resolve_unconnected(board, unconnected):
    items = unconnected.get('items') or []
    if len(items) < 2:
        return None
    first_pos = items[0].get('pos') or {}
    second_pos = items[1].get('pos') or {}
    a_reported = (float(first_pos.get('x', 0)), float(first_pos.get('y', 0)))
    b_reported = (float(second_pos.get('x', 0)), float(second_pos.get('y', 0)))
    a = endpoint_for_item(board, items[0], b_reported)
    b = endpoint_for_item(board, items[1], a_reported)
    if not a or not b or a['netCode'] == 0 or a['netCode'] != b['netCode']:
        return None
    return {'raw': unconnected, 'a': a, 'b': b, 'netCode': a['netCode'], 'net': a['net']}

def add_track(board, net_code, layer, a, b, width_mm):
    if dist(a, b) < 0.05:
        return None
    t = pcbnew.PCB_TRACK(board)
    t.SetStart(pcbnew.VECTOR2I(mm(a[0]), mm(a[1])))
    t.SetEnd(pcbnew.VECTOR2I(mm(b[0]), mm(b[1])))
    t.SetWidth(mm(width_mm))
    t.SetLayer(layer)
    t.SetNetCode(int(net_code))
    board.Add(t)
    return t

def add_via(board, net_code, at, width_mm, drill_mm, top_layer, bottom_layer):
    via = pcbnew.PCB_VIA(board)
    via.SetPosition(pcbnew.VECTOR2I(mm(at[0]), mm(at[1])))
    via.SetWidth(mm(width_mm))
    via.SetDrill(mm(drill_mm))
    try:
        via.SetViaType(pcbnew.VIATYPE_THROUGH)
    except Exception:
        pass
    try:
        via.SetLayerPair(top_layer, bottom_layer)
    except Exception:
        pass
    via.SetNetCode(int(net_code))
    board.Add(via)
    return via

def candidate_paths(a, b):
    ax, ay = a['pos']
    bx, by = b['pos']
    midx = (ax + bx) / 2
    midy = (ay + by) / 2
    candidates = []
    candidates.append({'name': 'direct', 'layers': [a['layer']], 'points': [(ax, ay), (bx, by)]})
    candidates.append({'name': 'xy', 'layers': [a['layer']], 'points': [(ax, ay), (bx, ay), (bx, by)]})
    candidates.append({'name': 'yx', 'layers': [a['layer']], 'points': [(ax, ay), (ax, by), (bx, by)]})
    for off in [0.6, -0.6, 1.2, -1.2, 2.0, -2.0, 3.0, -3.0]:
        candidates.append({'name': f'mid-x-{off}', 'layers': [a['layer']], 'points': [(ax, ay), (midx + off, ay), (midx + off, by), (bx, by)]})
        candidates.append({'name': f'mid-y-{off}', 'layers': [a['layer']], 'points': [(ax, ay), (ax, midy + off), (bx, midy + off), (bx, by)]})
    if a['layer'] != b['layer']:
        for off in [0.6, -0.6, 1.2, -1.2, 2.0, -2.0]:
            via = (bx + off, by)
            candidates.append({'name': f'via-near-target-x-{off}', 'via': via, 'layers': [a['layer'], b['layer']], 'points': [(ax, ay), (via[0], ay), via, (bx, by)]})
            via = (bx, by + off)
            candidates.append({'name': f'via-near-target-y-{off}', 'via': via, 'layers': [a['layer'], b['layer']], 'points': [(ax, ay), (ax, via[1]), via, (bx, by)]})
    for route_layer in [1, 2, 3, 0]:
        if route_layer in (a['layer'], b['layer']):
            continue
        for sx, sy, tx, ty, label in [
            (0.8, 0.0, -0.8, 0.0, 'horizontal'),
            (-0.8, 0.0, 0.8, 0.0, 'horizontal-reverse'),
            (0.0, 0.8, 0.0, -0.8, 'vertical'),
            (0.0, -0.8, 0.0, 0.8, 'vertical-reverse'),
            (1.2, 0.6, -1.2, -0.6, 'diag-a'),
            (-1.2, 0.6, 1.2, -0.6, 'diag-b'),
        ]:
            sv = (ax + sx, ay + sy)
            tv = (bx + tx, by + ty)
            candidates.append({
                'name': f'two-via-dogbone-{route_layer}-{label}',
                'vias': [sv, tv],
                'segments': [
                    {'layer': a['layer'], 'points': [(ax, ay), sv]},
                    {'layer': route_layer, 'points': [sv, (sv[0], tv[1]), tv]},
                    {'layer': b['layer'], 'points': [tv, (bx, by)]},
                ],
            })
    return candidates

def apply_candidate(board, endpoint, candidate, width, via_width, via_drill):
    if 'segments' in candidate:
        via_layers = set()
        for segment in candidate['segments']:
            layer = segment['layer']
            pts = segment['points']
            for idx in range(len(pts) - 1):
                add_track(board, endpoint['netCode'], layer, pts[idx], pts[idx + 1], width)
            for pt in pts:
                for via_pt in candidate.get('vias', []):
                    if dist(pt, via_pt) < 0.01:
                        via_layers.add((via_pt, layer))
        for via_pt in candidate.get('vias', []):
            add_via(board, endpoint['netCode'], via_pt, via_width, via_drill, 0, 3)
        return
    points = candidate['points']
    if 'via' in candidate and len(candidate.get('layers', [])) >= 2:
        via = candidate['via']
        via_index = min(range(len(points)), key=lambda idx: dist(points[idx], via))
        first_layer, second_layer = candidate['layers'][0], candidate['layers'][1]
        for idx in range(0, via_index):
            add_track(board, endpoint['netCode'], first_layer, points[idx], points[idx + 1], width)
        add_via(board, endpoint['netCode'], via, via_width, via_drill, min(first_layer, second_layer), max(first_layer, second_layer))
        for idx in range(via_index, len(points) - 1):
            add_track(board, endpoint['netCode'], second_layer, points[idx], points[idx + 1], width)
        return
    layer = candidate['layers'][0]
    for idx in range(len(points) - 1):
        add_track(board, endpoint['netCode'], layer, points[idx], points[idx + 1], width)

def board_bounds(board):
    xs, ys = [], []
    for drawing in board.GetDrawings():
        if drawing.GetLayerName() != 'Edge.Cuts':
            continue
        try:
            for pos in [drawing.GetStart(), drawing.GetEnd()]:
                xs.append(to_mm(pos.x)); ys.append(to_mm(pos.y))
        except Exception:
            pass
    if not xs:
        return None
    return (min(xs), min(ys), max(xs), max(ys))

def inside_bounds(points, bounds, margin=0.35):
    if not bounds:
        return True
    x0, y0, x1, y1 = bounds
    for x, y in points:
        if x < x0 + margin or x > x1 - margin or y < y0 + margin or y > y1 - margin:
            return False
    return True

def candidate_all_points(candidate):
    points = list(candidate.get('points') or [])
    for segment in candidate.get('segments') or []:
        points.extend(segment.get('points') or [])
    points.extend(candidate.get('vias') or [])
    if 'via' in candidate:
        points.append(candidate['via'])
    return points

def run(args):
    started = time.time()
    os.makedirs(args.out_dir, exist_ok=True)
    current = args.board
    latest = args.out
    shutil.copyfile(current, latest)
    baseline_report = os.path.join(args.out_dir, 'boardforge-route-finish-baseline-drc.json')
    baseline = run_drc(args.kicad_cli, latest, baseline_report)
    before_counts = drc_counts(baseline['data'])
    commits = 0
    attempts = 0
    rollbacks = 0
    candidate_failures = {}
    committed_items = []
    rejected_items = []
    def write_progress(runtime_limit=False):
        final_report = run_drc(args.kicad_cli, latest, os.path.join(args.out_dir, 'boardforge-route-finish-progress-drc.json'))
        after_counts = drc_counts(final_report['data'])
        result = {
            'mode': 'clearance_aware_exact_finish',
            'startingBoard': args.board,
            'latestBoard': latest,
            'baseline': before_counts,
            'final': after_counts,
            'attempts': attempts,
            'commits': commits,
            'rollbacks': rollbacks,
            'committedItems': committed_items,
            'candidateFailures': candidate_failures,
            'rejectedItems': rejected_items[:25],
            'elapsedMs': int((time.time() - started) * 1000),
            'runtimeLimitReached': runtime_limit,
            'checkpoint': True,
        }
        with open(args.report, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2)
        return result
    while attempts < args.max_drc_calls and (time.time() - started) < args.max_minutes * 60:
        board = pcbnew.LoadBoard(latest)
        report = run_drc(args.kicad_cli, latest, os.path.join(args.out_dir, 'boardforge-route-finish-current-drc.json'))
        counts = drc_counts(report['data'])
        unconnected = report['data'].get('unconnected_items') or []
        if counts['unconnected'] == 0 or counts['violations'] != 0:
            break
        progress_this_scan = False
        bounds = board_bounds(board)
        resolved = []
        for item_index, item in enumerate(unconnected):
            endpoint = resolve_unconnected(board, item)
            if not endpoint:
                rejected_items.append({'index': item_index, 'reason': 'endpoint_resolution_failed'})
                continue
            endpoint['index'] = item_index
            endpoint['distance'] = dist(endpoint['a']['pos'], endpoint['b']['pos'])
            resolved.append(endpoint)
        selected = sorted(resolved, key=lambda endpoint: endpoint['distance'])[:args.max_items]
        for endpoint in selected:
            if attempts >= args.max_drc_calls or (time.time() - started) >= args.max_minutes * 60:
                break
            board = pcbnew.LoadBoard(latest)
            tried_for_item = 0
            candidates = candidate_paths(endpoint['a'], endpoint['b'])
            if endpoint['distance'] > 4.0:
                candidates = sorted(candidates, key=lambda candidate: 0 if str(candidate.get('name', '')).startswith('two-via') else 1)
            for candidate in candidates[:args.max_candidates_per_item]:
                if attempts >= args.max_drc_calls or (time.time() - started) >= args.max_minutes * 60:
                    break
                if not inside_bounds(candidate_all_points(candidate), bounds):
                    candidate_failures['outside_outline_bounds'] = candidate_failures.get('outside_outline_bounds', 0) + 1
                    continue
                cand_board = pcbnew.LoadBoard(latest)
                apply_candidate(cand_board, endpoint, candidate, args.width, args.via_width, args.via_drill)
                candidate_path = os.path.join(args.out_dir, f'boardforge-route-finish-candidate-{attempts + 1}.kicad_pcb')
                pcbnew.SaveBoard(candidate_path, cand_board)
                cand_report_path = os.path.join(args.out_dir, f'boardforge-route-finish-candidate-{attempts + 1}-drc.json')
                cand_drc = run_drc(args.kicad_cli, candidate_path, cand_report_path)
                cand_counts = drc_counts(cand_drc['data'])
                attempts += 1
                tried_for_item += 1
                if cand_counts['violations'] == 0 and cand_counts['shorts'] == 0 and cand_counts['forbiddenVias'] == 0 and cand_counts['unconnected'] < counts['unconnected']:
                    shutil.copyfile(candidate_path, latest)
                    commits += 1
                    progress_this_scan = True
                    committed_items.append({
                        'net': endpoint['net'],
                        'candidate': candidate['name'],
                        'unconnectedBefore': counts['unconnected'],
                        'unconnectedAfter': cand_counts['unconnected'],
                        'drcReport': cand_report_path,
                    })
                    write_progress(False)
                    break
                reason = 'drc_regression'
                if cand_counts['shorts'] > 0:
                    reason = 'shorts'
                elif cand_counts['forbiddenVias'] > 0:
                    reason = 'forbidden_via'
                elif cand_counts['violations'] > 0:
                    reason = 'non_connectivity_drc'
                elif cand_counts['unconnected'] >= counts['unconnected']:
                    reason = 'connectivity_not_reduced'
                candidate_failures[reason] = candidate_failures.get(reason, 0) + 1
                rollbacks += 1
                write_progress(False)
            if progress_this_scan:
                break
            if tried_for_item == 0:
                rejected_items.append({'index': endpoint['index'], 'net': endpoint['net'], 'reason': 'no_candidate_after_prescore'})
        if not progress_this_scan:
            break
    final_report = run_drc(args.kicad_cli, latest, os.path.join(args.out_dir, 'boardforge-route-finish-final-drc.json'))
    after_counts = drc_counts(final_report['data'])
    result = {
        'mode': 'clearance_aware_exact_finish',
        'startingBoard': args.board,
        'latestBoard': latest,
        'baseline': before_counts,
        'final': after_counts,
        'attempts': attempts,
        'commits': commits,
        'rollbacks': rollbacks,
        'committedItems': committed_items,
        'candidateFailures': candidate_failures,
        'rejectedItems': rejected_items[:25],
        'elapsedMs': int((time.time() - started) * 1000),
        'runtimeLimitReached': (time.time() - started) >= args.max_minutes * 60,
    }
    with open(args.report, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)
    print(json.dumps(result, indent=2))

parser = argparse.ArgumentParser()
parser.add_argument('--board', required=True)
parser.add_argument('--out', required=True)
parser.add_argument('--out-dir', required=True)
parser.add_argument('--report', required=True)
parser.add_argument('--kicad-cli', required=True)
parser.add_argument('--max-items', type=int, default=18)
parser.add_argument('--max-candidates-per-item', type=int, default=24)
parser.add_argument('--max-drc-calls', type=int, default=64)
parser.add_argument('--max-minutes', type=float, default=20)
parser.add_argument('--width', type=float, default=0.2)
parser.add_argument('--via-width', type=float, default=0.6)
parser.add_argument('--via-drill', type=float, default=0.3)
args = parser.parse_args()
run(args)
`

const groundZoneHelper = String.raw`
import argparse
import json
import os
import shutil
import subprocess
import time

import pcbnew

NM_PER_MM = 1000000

def mm(value):
    return int(round(float(value) * NM_PER_MM))

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def run_drc(kicad_cli, board_path, out_path):
    proc = subprocess.run([kicad_cli, 'pcb', 'drc', '--format', 'json', '--output', out_path, board_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    data = load_json(out_path) if os.path.exists(out_path) else {}
    return {'exitCode': proc.returncode, 'stdout': proc.stdout, 'stderr': proc.stderr, 'data': data}

def counts(data):
    violations = data.get('violations') or []
    unconnected = data.get('unconnected_items') or []
    shorts = [v for v in violations if str(v.get('type', '')).lower() in ('shorting_items', 'shorting')]
    forbidden = [v for v in violations if 'forbidden' in str(v.get('type', '')).lower() and 'via' in str(v).lower()]
    return {'violations': len(violations), 'unconnected': len(unconnected), 'shorts': len(shorts), 'forbiddenVias': len(forbidden)}

def edge_bounds(board):
    xs, ys = [], []
    for drawing in board.GetDrawings():
        try:
            if drawing.GetLayerName() != 'Edge.Cuts':
                continue
            for pos in [drawing.GetStart(), drawing.GetEnd()]:
                xs.append(pos.x / NM_PER_MM)
                ys.append(pos.y / NM_PER_MM)
        except Exception:
            pass
    if not xs:
        return None
    return min(xs), min(ys), max(xs), max(ys)

def add_ground_zone(board, layer, margin):
    net = board.FindNet('GND')
    if not net:
        raise RuntimeError('GND net not found')
    bounds = edge_bounds(board)
    if not bounds:
        raise RuntimeError('Edge.Cuts bounds not found')
    x0, y0, x1, y1 = bounds
    zone = pcbnew.ZONE(board)
    zone.SetLayer(layer)
    zone.SetNetCode(net.GetNetCode())
    zone.SetPadConnection(pcbnew.ZONE_CONNECTION_FULL)
    try:
        zone.SetLocalClearance(mm(0.2))
    except Exception:
        pass
    for x, y in [(x0 + margin, y0 + margin), (x1 - margin, y0 + margin), (x1 - margin, y1 - margin), (x0 + margin, y1 - margin)]:
        zone.AppendCorner(pcbnew.VECTOR2I(mm(x), mm(y)), -1)
    board.Add(zone)
    pcbnew.ZONE_FILLER(board).Fill(board.Zones())

parser = argparse.ArgumentParser()
parser.add_argument('--board', required=True)
parser.add_argument('--out', required=True)
parser.add_argument('--out-dir', required=True)
parser.add_argument('--report', required=True)
parser.add_argument('--kicad-cli', required=True)
parser.add_argument('--layer', type=int, default=0)
parser.add_argument('--margin', type=float, default=0.8)
args = parser.parse_args()
started = time.time()
os.makedirs(args.out_dir, exist_ok=True)
baseline_report = os.path.join(args.out_dir, 'boardforge-ground-zone-baseline-drc.json')
baseline = run_drc(args.kicad_cli, args.board, baseline_report)
before = counts(baseline['data'])
candidate = os.path.join(args.out_dir, 'boardforge-ground-zone-candidate.kicad_pcb')
board = pcbnew.LoadBoard(args.board)
add_ground_zone(board, args.layer, args.margin)
pcbnew.SaveBoard(candidate, board)
candidate_report = os.path.join(args.out_dir, 'boardforge-ground-zone-candidate-drc.json')
candidate_drc = run_drc(args.kicad_cli, candidate, candidate_report)
after = counts(candidate_drc['data'])
committed = after['violations'] == 0 and after['shorts'] == 0 and after['forbiddenVias'] == 0 and after['unconnected'] < before['unconnected']
if committed:
    shutil.copyfile(candidate, args.out)
else:
    shutil.copyfile(args.board, args.out)
result = {
    'mode': 'ground_zone_connectivity_repair',
    'startingBoard': args.board,
    'latestBoard': args.out,
    'baseline': before,
    'final': after if committed else before,
    'candidate': after,
    'committed': committed,
    'layer': args.layer,
    'marginMm': args.margin,
    'elapsedMs': int((time.time() - started) * 1000),
}
with open(args.report, 'w', encoding='utf-8') as f:
    json.dump(result, f, indent=2)
print(json.dumps(result, indent=2))
`

function runClearanceAwareFinish(board, outDir) {
  fs.mkdirSync(outDir, { recursive: true })
  const out = arg('out', path.join(outDir, `${path.basename(board, '.kicad_pcb')}_boardforge_exact_finished.kicad_pcb`))
  const report = arg('report', path.join(outDir, 'boardforge-clearance-aware-exact-finisher-report.json'))
  const helperPath = path.join(os.tmpdir(), `boardforge-clearance-aware-route-finish-${process.pid}.py`)
  fs.writeFileSync(helperPath, clearanceAwareHelper)
  const plan = buildClearanceAwareExactFinisherPlan(board, {
    maxWallClockMinutes: numberArg('max-minutes', 20),
    maxDrcCallsThisInvocation: numberArg('max-drc-calls', 64),
  })
  fs.writeFileSync(path.join(outDir, 'boardforge-clearance-aware-exact-finisher-plan.json'), JSON.stringify(plan, null, 2))
  const kicadPython = arg('kicad-python', findDefaultKicadPython())
  const kicadCli = arg('kicad-cli', findDefaultKicadCli())
  const args = [
    helperPath,
    '--board', board,
    '--out', out,
    '--out-dir', outDir,
    '--report', report,
    '--kicad-cli', kicadCli,
    '--max-items', String(numberArg('max-items', 18)),
    '--max-candidates-per-item', String(numberArg('max-candidates-per-item', 24)),
    '--max-drc-calls', String(numberArg('max-drc-calls', 64)),
    '--max-minutes', String(numberArg('max-minutes', 20)),
    '--width', String(numberArg('width', 0.2)),
    '--via-width', String(numberArg('via-width', 0.6)),
    '--via-drill', String(numberArg('via-drill', 0.3)),
  ]
  const proc = spawnSync(kicadPython, args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 })
  if (proc.stdout) process.stdout.write(proc.stdout)
  if (proc.stderr) process.stderr.write(proc.stderr)
  if (proc.status !== 0) {
    throw new Error(`clearance-aware exact finisher failed with exit ${proc.status}`)
  }
  const result = JSON.parse(fs.readFileSync(report, 'utf8'))
  result.finalState = classifyExactFinisherRun(
    { unconnected: result.baseline.unconnected },
    { unconnected: result.final.unconnected, drcViolations: result.final.violations },
    { commits: result.commits, drcCalls: result.attempts },
  )
  fs.writeFileSync(report, JSON.stringify(result, null, 2))
  return result
}

function runGroundZoneConnectivityRepair(board, outDir) {
  fs.mkdirSync(outDir, { recursive: true })
  const out = arg('out', path.join(outDir, `${path.basename(board, '.kicad_pcb')}_boardforge_gnd_zone_finished.kicad_pcb`))
  const report = arg('report', path.join(outDir, 'boardforge-ground-zone-connectivity-repair-report.json'))
  const helperPath = path.join(os.tmpdir(), `boardforge-ground-zone-repair-${process.pid}.py`)
  fs.writeFileSync(helperPath, groundZoneHelper)
  const kicadPython = arg('kicad-python', findDefaultKicadPython())
  const kicadCli = arg('kicad-cli', findDefaultKicadCli())
  const proc = spawnSync(kicadPython, [
    helperPath,
    '--board', board,
    '--out', out,
    '--out-dir', outDir,
    '--report', report,
    '--kicad-cli', kicadCli,
    '--layer', String(numberArg('layer', 0)),
    '--margin', String(numberArg('margin', 0.8)),
  ], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 })
  if (proc.stdout) process.stdout.write(proc.stdout)
  if (proc.stderr) process.stderr.write(proc.stderr)
  if (proc.status !== 0) {
    throw new Error(`ground-zone connectivity repair failed with exit ${proc.status}`)
  }
  return JSON.parse(fs.readFileSync(report, 'utf8'))
}

const board = arg('board')
if (!board) throw new Error('--board is required')
const outDir = arg('out-dir', path.dirname(board))
const mode = arg('mode', hasFlag('clearance-aware') ? 'clearance-aware-exact-finish' : 'plan')
const result = mode === 'clearance-aware-exact-finish'
  ? runClearanceAwareFinish(board, outDir)
  : mode === 'ground-zone-connectivity-repair'
    ? runGroundZoneConnectivityRepair(board, outDir)
  : buildExactRatsnestFinisherPlan(board)
if (!['clearance-aware-exact-finish', 'ground-zone-connectivity-repair'].includes(mode)) {
  fs.writeFileSync(path.join(outDir, 'boardforge-exact-ratsnest-finisher-plan.json'), JSON.stringify(result, null, 2))
}
console.log(JSON.stringify(result, null, 2))

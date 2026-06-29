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
import heapq
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
    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=75)
    except subprocess.TimeoutExpired as exc:
        return {
            'exitCode': 124,
            'stdout': exc.stdout or '',
            'stderr': exc.stderr or 'KiCad DRC timed out for candidate',
            'reportPath': out_path,
            'timedOut': True,
            'data': {'violations': [{'type': 'drc_timeout', 'description': 'KiCad DRC timed out for this candidate'}], 'unconnected_items': []},
        }
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
    if target == 'F.Cu':
        return pcbnew.F_Cu
    if target == 'B.Cu':
        return pcbnew.B_Cu
    try:
        layer = board.GetLayerID(target)
        if layer >= 0:
            return layer
    except Exception:
        pass
    for idx in range(64):
        try:
            if board.GetLayerName(idx) == target:
                return idx
        except Exception:
            pass
    return pcbnew.F_Cu

def enabled_copper_layers(board):
    layers = []
    for idx in range(64):
        try:
            if board.IsLayerEnabled(idx) and board.IsCopperLayer(idx):
                layers.append(idx)
                continue
        except Exception:
            pass
        try:
            if idx in (pcbnew.F_Cu, pcbnew.B_Cu) and board.GetLayerName(idx).endswith('.Cu'):
                layers.append(idx)
        except Exception:
            pass
    if pcbnew.F_Cu not in layers:
        layers.insert(0, pcbnew.F_Cu)
    if pcbnew.B_Cu not in layers:
        layers.append(pcbnew.B_Cu)
    return list(dict.fromkeys(layers))

def uuid_string(item):
    try:
        return item.m_Uuid.AsString()
    except Exception:
        return ''

def parse_pad_desc(desc):
    # Example: Pad 6 [I2C1_SCL] of U1 on F.Cu
    parts = desc.split()
    if len(parts) >= 6 and parts[0] == 'PTH' and parts[1] == 'pad':
        parts = ['Pad', parts[2], *parts[3:]]
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
    if layer == 'B.Mask' or layer == 'B.Silkscreen':
        layer = 'B.Cu'
    elif layer == 'F.Mask' or layer == 'F.Silkscreen':
        layer = 'F.Cu'
    elif not layer.endswith('.Cu'):
        layer = 'F.Cu'
    return {'ref': ref, 'pad': pad, 'layer': layer}

def parse_via_desc(desc):
    # Example: Via [I2C1_SDA] on F.Cu - In2.Cu
    if not desc.startswith('Via '):
        return None
    net = ''
    if '[' in desc and ']' in desc:
        net = desc.split('[', 1)[1].split(']', 1)[0]
    layers = ['F.Cu']
    if ' on ' in desc:
        layers = [part.strip() for part in desc.split(' on ', 1)[1].split('-')]
    return {'net': net, 'layer': layers[0]}

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
    via_info = parse_via_desc(desc)
    if via_info:
        best = None
        for via in board.GetTracks():
            if type(via).__name__ != 'PCB_VIA':
                continue
            if via.GetNetname() != via_info['net']:
                continue
            pos = point(via.GetPosition())
            score = dist(reported_pos, pos)
            if best is None or score < best[0]:
                best = (score, via, pos)
        if best:
            _, via, pos = best
            return {
                'kind': 'via',
                'description': desc,
                'net': via.GetNetname(),
                'netCode': via.GetNetCode(),
                'pos': pos,
                'layer': layer_id(board, via_info['layer']),
                'uuid': uuid_string(via),
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

def candidate_paths(a, b, copper_layers=None):
    ax, ay = a['pos']
    bx, by = b['pos']
    midx = (ax + bx) / 2
    midy = (ay + by) / 2
    endpoint_distance = dist((ax, ay), (bx, by))
    candidates = []
    local_repair_candidates = []
    obstacle_detour_candidates = []
    copper_layers = copper_layers or [pcbnew.F_Cu, pcbnew.B_Cu]
    for margin in [2.5, -2.5, 4.0, -4.0, 6.0, -6.0, 9.0, -9.0, 12.0, -12.0]:
        obstacle_detour_candidates.append({
            'name': f'obstacle-wide-channel-y-{margin}',
            'layers': [a['layer']],
            'points': [(ax, ay), (ax, ay + margin), (bx, by + margin), (bx, by)],
            'repairIntent': 'route_around_dense_local_obstacles',
        })
        obstacle_detour_candidates.append({
            'name': f'obstacle-wide-channel-x-{margin}',
            'layers': [a['layer']],
            'points': [(ax, ay), (ax + margin, ay), (bx + margin, by), (bx, by)],
            'repairIntent': 'route_around_dense_local_obstacles',
        })
    for route_layer in copper_layers:
        if route_layer == a['layer'] and route_layer == b['layer']:
            continue
        for margin in [1.5, -1.5, 2.5, -2.5, 4.0, -4.0, 6.0, -6.0]:
            sv = (ax, ay + margin)
            tv = (bx, by + margin)
            obstacle_detour_candidates.append({
                'name': f'obstacle-layer-channel-y-{route_layer}-{margin}',
                'vias': [sv, tv],
                'segments': [
                    {'layer': a['layer'], 'points': [(ax, ay), sv]},
                    {'layer': route_layer, 'points': [sv, tv]},
                    {'layer': b['layer'], 'points': [tv, (bx, by)]},
                ],
                'repairIntent': 'escape_to_less_congested_layer',
            })
            sv = (ax + margin, ay)
            tv = (bx + margin, by)
            obstacle_detour_candidates.append({
                'name': f'obstacle-layer-channel-x-{route_layer}-{margin}',
                'vias': [sv, tv],
                'segments': [
                    {'layer': a['layer'], 'points': [(ax, ay), sv]},
                    {'layer': route_layer, 'points': [sv, tv]},
                    {'layer': b['layer'], 'points': [tv, (bx, by)]},
                ],
                'repairIntent': 'escape_to_less_congested_layer',
            })
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
    for route_layer in copper_layers:
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
    if endpoint_distance <= 6.0:
        # Short local leftovers often fail because a direct top-layer stitch crosses adjacent pads.
        # Escape both pads away from the local row, bridge on another copper layer, and return.
        for route_layer in copper_layers:
            if route_layer in (a['layer'], b['layer']):
                continue
            for escape in [0.65, -0.65, 0.9, -0.9, 1.25, -1.25, 1.75, -1.75]:
                sv = (ax, ay + escape)
                tv = (bx, by + escape)
                local_repair_candidates.append({
                    'name': f'local-drc-repair-bridge-y-{route_layer}-{escape}',
                    'vias': [sv, tv],
                    'segments': [
                        {'layer': a['layer'], 'points': [(ax, ay), sv]},
                        {'layer': route_layer, 'points': [sv, tv]},
                        {'layer': b['layer'], 'points': [tv, (bx, by)]},
                    ],
                    'repairIntent': 'avoid_same_layer_pad_crossing',
                })
                sv = (ax + escape, ay)
                tv = (bx + escape, by)
                local_repair_candidates.append({
                    'name': f'local-drc-repair-bridge-x-{route_layer}-{escape}',
                    'vias': [sv, tv],
                    'segments': [
                        {'layer': a['layer'], 'points': [(ax, ay), sv]},
                        {'layer': route_layer, 'points': [sv, tv]},
                        {'layer': b['layer'], 'points': [tv, (bx, by)]},
                    ],
                    'repairIntent': 'avoid_same_layer_pad_crossing',
                })
    return obstacle_detour_candidates + local_repair_candidates + candidates

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
            add_via(board, endpoint['netCode'], via_pt, via_width, via_drill, pcbnew.F_Cu, pcbnew.B_Cu)
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

def point_segment_distance(p, a, b):
    ax, ay = a
    bx, by = b
    px, py = p
    dx = bx - ax
    dy = by - ay
    if abs(dx) < 1e-9 and abs(dy) < 1e-9:
        return dist(p, a)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return dist(p, (ax + t * dx, ay + t * dy))

def orientation(a, b, c):
    value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1])
    if abs(value) < 1e-9:
        return 0
    return 1 if value > 0 else 2

def on_segment(a, b, c):
    return min(a[0], c[0]) <= b[0] <= max(a[0], c[0]) and min(a[1], c[1]) <= b[1] <= max(a[1], c[1])

def segments_intersect(a, b, c, d):
    o1 = orientation(a, b, c)
    o2 = orientation(a, b, d)
    o3 = orientation(c, d, a)
    o4 = orientation(c, d, b)
    if o1 != o2 and o3 != o4:
        return True
    if o1 == 0 and on_segment(a, c, b):
        return True
    if o2 == 0 and on_segment(a, d, b):
        return True
    if o3 == 0 and on_segment(c, a, d):
        return True
    if o4 == 0 and on_segment(c, b, d):
        return True
    return False

def segment_distance(a, b, c, d):
    if segments_intersect(a, b, c, d):
        return 0.0
    return min(
        point_segment_distance(a, c, d),
        point_segment_distance(b, c, d),
        point_segment_distance(c, a, b),
        point_segment_distance(d, a, b),
    )

def candidate_segments(candidate):
    segments = []
    if 'segments' in candidate:
        for segment in candidate['segments']:
            layer = segment['layer']
            points = segment['points']
            for idx in range(len(points) - 1):
                segments.append({'layer': layer, 'a': points[idx], 'b': points[idx + 1]})
        return segments
    points = candidate.get('points') or []
    if 'via' in candidate and len(candidate.get('layers', [])) >= 2:
        via = candidate['via']
        via_index = min(range(len(points)), key=lambda idx: dist(points[idx], via))
        first_layer, second_layer = candidate['layers'][0], candidate['layers'][1]
        for idx in range(0, via_index):
            segments.append({'layer': first_layer, 'a': points[idx], 'b': points[idx + 1]})
        for idx in range(via_index, len(points) - 1):
            segments.append({'layer': second_layer, 'a': points[idx], 'b': points[idx + 1]})
        return segments
    layer = (candidate.get('layers') or [pcbnew.F_Cu])[0]
    for idx in range(len(points) - 1):
        segments.append({'layer': layer, 'a': points[idx], 'b': points[idx + 1]})
    return segments

def pad_on_layer(pad, layer):
    try:
        return pad.GetLayerSet().Contains(layer)
    except Exception:
        return True

def estimate_candidate_short_risk(board, endpoint, candidate, width_mm, via_width_mm=0.6):
    candidate_net = int(endpoint['netCode'])
    threshold = max(0.18, float(width_mm) / 2.0 + 0.10)
    via_threshold = max(0.28, float(via_width_mm) / 2.0 + 0.16)
    cand_segments = candidate_segments(candidate)
    for via_pos in candidate.get('vias') or ([candidate['via']] if 'via' in candidate else []):
        for track in board.GetTracks():
            if int(track.GetNetCode()) == candidate_net:
                continue
            if type(track).__name__ == 'PCB_TRACK':
                d = point_segment_distance(via_pos, point(track.GetStart()), point(track.GetEnd()))
                if d <= via_threshold:
                    return {
                        'risk': True,
                        'reason': 'predicted_short_risk_via_site_track',
                        'distance': d,
                        'obstacleNet': track.GetNetname(),
                    }
            elif type(track).__name__ == 'PCB_VIA':
                d = dist(via_pos, point(track.GetPosition()))
                if d <= via_threshold:
                    return {
                        'risk': True,
                        'reason': 'predicted_short_risk_via_site_via',
                        'distance': d,
                        'obstacleNet': track.GetNetname(),
                    }
        for fp in board.GetFootprints():
            for pad in fp.Pads():
                if int(pad.GetNetCode()) == candidate_net:
                    continue
                d = dist(via_pos, point(pad.GetPosition()))
                if d <= via_threshold:
                    return {
                        'risk': True,
                        'reason': 'predicted_short_risk_via_site_pad',
                        'distance': d,
                        'obstacleNet': pad.GetNetname(),
                        'obstaclePad': f"{fp.GetReference()}:{pad.GetNumber()}",
                    }
    for cand in cand_segments:
        layer = cand['layer']
        for track in board.GetTracks():
            if int(track.GetNetCode()) == candidate_net:
                continue
            if type(track).__name__ == 'PCB_TRACK':
                try:
                    if track.GetLayer() != layer:
                        continue
                except Exception:
                    continue
                d = segment_distance(cand['a'], cand['b'], point(track.GetStart()), point(track.GetEnd()))
                if d <= threshold:
                    return {
                        'risk': True,
                        'reason': 'predicted_short_risk_track',
                        'distance': d,
                        'obstacleNet': track.GetNetname(),
                        'layer': str(layer),
                    }
            elif type(track).__name__ == 'PCB_VIA':
                via_pos = point(track.GetPosition())
                d = point_segment_distance(via_pos, cand['a'], cand['b'])
                if d <= threshold:
                    return {
                        'risk': True,
                        'reason': 'predicted_short_risk_via',
                        'distance': d,
                        'obstacleNet': track.GetNetname(),
                        'layer': str(layer),
                    }
        for fp in board.GetFootprints():
            for pad in fp.Pads():
                if int(pad.GetNetCode()) == candidate_net:
                    continue
                if not pad_on_layer(pad, layer):
                    continue
                d = point_segment_distance(point(pad.GetPosition()), cand['a'], cand['b'])
                if d <= threshold:
                    return {
                        'risk': True,
                        'reason': 'predicted_short_risk_pad',
                        'distance': d,
                        'obstacleNet': pad.GetNetname(),
                        'obstaclePad': f"{fp.GetReference()}:{pad.GetNumber()}",
                        'layer': str(layer),
                    }
    return {'risk': False}

def grid_key(p, step):
    return (round(p[0] / step), round(p[1] / step))

def grid_point(key, step):
    return (key[0] * step, key[1] * step)

def point_is_route_safe(board, endpoint, layer, p, width_mm, via_width_mm=0.0):
    candidate_net = int(endpoint['netCode'])
    threshold = max(0.22, float(width_mm) / 2.0 + 0.14, float(via_width_mm) / 2.0 + 0.10)
    for track in board.GetTracks():
        if int(track.GetNetCode()) == candidate_net:
            continue
        if type(track).__name__ == 'PCB_TRACK':
            try:
                if track.GetLayer() != layer:
                    continue
            except Exception:
                continue
            if point_segment_distance(p, point(track.GetStart()), point(track.GetEnd())) <= threshold:
                return False
        elif type(track).__name__ == 'PCB_VIA':
            if dist(p, point(track.GetPosition())) <= threshold:
                return False
    for fp in board.GetFootprints():
        for pad in fp.Pads():
            if int(pad.GetNetCode()) == candidate_net:
                continue
            if not pad_on_layer(pad, layer):
                continue
            if dist(p, point(pad.GetPosition())) <= threshold:
                return False
    return True

def nearest_safe_grid_key(board, endpoint, layer, pos, step, bounds, width_mm, via_width_mm=0.0):
    base = grid_key(pos, step)
    candidates = [base]
    for radius in range(1, 5):
        for dx in range(-radius, radius + 1):
            for dy in range(-radius, radius + 1):
                if abs(dx) != radius and abs(dy) != radius:
                    continue
                candidates.append((base[0] + dx, base[1] + dy))
    for key in candidates:
        p = grid_point(key, step)
        if not inside_bounds([p], bounds):
            continue
        if point_is_route_safe(board, endpoint, layer, p, width_mm, via_width_mm):
            return key
    return None

def search_grid_path(board, endpoint, layer, start, goal, bounds, width_mm, via_width_mm=0.0):
    step = 0.5
    minx, miny, maxx, maxy = bounds
    # Keep the search local but allow enough room to route around connector/MCU clutter.
    window = 4.0
    local_minx = max(minx, min(start[0], goal[0]) - window)
    local_maxx = min(maxx, max(start[0], goal[0]) + window)
    local_miny = max(miny, min(start[1], goal[1]) - window)
    local_maxy = min(maxy, max(start[1], goal[1]) + window)
    start_key = nearest_safe_grid_key(board, endpoint, layer, start, step, bounds, width_mm, via_width_mm)
    goal_key = nearest_safe_grid_key(board, endpoint, layer, goal, step, bounds, width_mm, via_width_mm)
    if not start_key or not goal_key:
        return None
    queue = []
    heapq.heappush(queue, (dist(grid_point(start_key, step), grid_point(goal_key, step)), 0, start_key))
    came_from = {}
    cost = {start_key: 0}
    visited = 0
    while queue and visited < 220:
        _, current_cost, current = heapq.heappop(queue)
        visited += 1
        if current == goal_key:
            points = [grid_point(current, step)]
            while current in came_from:
                current = came_from[current]
                points.append(grid_point(current, step))
            points.reverse()
            simplified = []
            for p in points:
                if len(simplified) < 2:
                    simplified.append(p)
                    continue
                a = simplified[-2]
                b = simplified[-1]
                if abs((b[0] - a[0]) * (p[1] - b[1]) - (b[1] - a[1]) * (p[0] - b[0])) < 1e-9:
                    simplified[-1] = p
                else:
                    simplified.append(p)
            return simplified
        for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            nxt = (current[0] + dx, current[1] + dy)
            p = grid_point(nxt, step)
            if p[0] < local_minx or p[0] > local_maxx or p[1] < local_miny or p[1] > local_maxy:
                continue
            if not inside_bounds([p], bounds):
                continue
            if not point_is_route_safe(board, endpoint, layer, p, width_mm, via_width_mm):
                continue
            new_cost = current_cost + step
            if nxt not in cost or new_cost < cost[nxt]:
                cost[nxt] = new_cost
                came_from[nxt] = current
                priority = new_cost + dist(p, grid_point(goal_key, step))
                heapq.heappush(queue, (priority, new_cost, nxt))
    return None

def grid_channel_candidates(board, endpoint, copper_layers, width_mm, via_width_mm):
    endpoint_distance = dist(endpoint['a']['pos'], endpoint['b']['pos'])
    if endpoint_distance > 10.0:
        return []
    bounds = board_bounds(board)
    a = endpoint['a']
    b = endpoint['b']
    candidates = []
    same_layer_path = search_grid_path(board, endpoint, a['layer'], a['pos'], b['pos'], bounds, width_mm)
    if same_layer_path and len(same_layer_path) >= 2:
        candidates.append({
            'name': f'grid-channel-same-layer-{a["layer"]}',
            'layers': [a['layer']],
            'points': [a['pos']] + same_layer_path + [b['pos']],
            'repairIntent': 'grid_channel_search',
        })
    for route_layer in copper_layers:
        if route_layer == a['layer'] and route_layer == b['layer']:
            continue
        for offset in [0.8, -0.8]:
            for axis in ['x', 'y']:
                if axis == 'x':
                    sv = (a['pos'][0] + offset, a['pos'][1])
                    tv = (b['pos'][0] - offset, b['pos'][1])
                else:
                    sv = (a['pos'][0], a['pos'][1] + offset)
                    tv = (b['pos'][0], b['pos'][1] - offset)
                if not inside_bounds([sv, tv], bounds):
                    continue
                if not point_is_route_safe(board, endpoint, a['layer'], sv, width_mm, via_width_mm):
                    continue
                if not point_is_route_safe(board, endpoint, b['layer'], tv, width_mm, via_width_mm):
                    continue
                if not point_is_route_safe(board, endpoint, route_layer, sv, width_mm, via_width_mm):
                    continue
                if not point_is_route_safe(board, endpoint, route_layer, tv, width_mm, via_width_mm):
                    continue
                path = search_grid_path(board, endpoint, route_layer, sv, tv, bounds, width_mm, via_width_mm)
                if path and len(path) >= 2:
                    candidates.append({
                        'name': f'grid-channel-via-{route_layer}-{axis}-{offset}',
                        'vias': [sv, tv],
                        'segments': [
                            {'layer': a['layer'], 'points': [a['pos'], sv]},
                            {'layer': route_layer, 'points': path},
                            {'layer': b['layer'], 'points': [tv, b['pos']]},
                        ],
                        'repairIntent': 'grid_channel_search_with_layer_escape',
                    })
                if len(candidates) >= 2:
                    return candidates
    return candidates

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
    target_skipped = 0
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
            'targetNet': args.target_net,
            'targetSkipped': target_skipped,
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
        copper_layers = enabled_copper_layers(board)
        resolved = []
        for item_index, item in enumerate(unconnected):
            endpoint = resolve_unconnected(board, item)
            if not endpoint:
                rejected_items.append({'index': item_index, 'reason': 'endpoint_resolution_failed'})
                continue
            if args.target_net and endpoint['net'] != args.target_net:
                target_skipped += 1
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
            candidates = grid_channel_candidates(board, endpoint, copper_layers, args.width, args.via_width) + candidate_paths(endpoint['a'], endpoint['b'], copper_layers)
            for candidate in candidates[:args.max_candidates_per_item]:
                if attempts >= args.max_drc_calls or (time.time() - started) >= args.max_minutes * 60:
                    break
                if not inside_bounds(candidate_all_points(candidate), bounds):
                    candidate_failures['outside_outline_bounds'] = candidate_failures.get('outside_outline_bounds', 0) + 1
                    continue
                short_risk = estimate_candidate_short_risk(board, endpoint, candidate, args.width, args.via_width)
                if short_risk.get('risk'):
                    reason = short_risk.get('reason') or 'predicted_short_risk'
                    candidate_failures[reason] = candidate_failures.get(reason, 0) + 1
                    rejected_items.append({
                        'index': endpoint['index'],
                        'net': endpoint['net'],
                        'candidate': candidate.get('name'),
                        'reason': reason,
                        'detail': short_risk,
                    })
                    continue
                cand_board = pcbnew.LoadBoard(latest)
                apply_candidate(cand_board, endpoint, candidate, args.width, args.via_width, args.via_drill)
                if not args.skip_zone_fill:
                    try:
                        pcbnew.ZONE_FILLER(cand_board).Fill(cand_board.Zones())
                    except Exception:
                        pass
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
parser.add_argument('--target-net', default='')
parser.add_argument('--skip-zone-fill', action='store_true')
args = parser.parse_args()
run(args)
`

const isolatedCandidateHelper = `${clearanceAwareHelper.split('def run(args):')[0]}
def flatten_candidates(board, unconnected, target_net, max_items, max_candidates_per_item, width, via_width):
    bounds = board_bounds(board)
    copper_layers = enabled_copper_layers(board)
    resolved = []
    target_skipped = 0
    rejected = []
    for item_index, item in enumerate(unconnected):
        endpoint = resolve_unconnected(board, item)
        if not endpoint:
            rejected.append({'index': item_index, 'reason': 'endpoint_resolution_failed'})
            continue
        if target_net and endpoint['net'] != target_net:
            target_skipped += 1
            continue
        endpoint['index'] = item_index
        endpoint['distance'] = dist(endpoint['a']['pos'], endpoint['b']['pos'])
        resolved.append(endpoint)
    selected = sorted(resolved, key=lambda endpoint: endpoint['distance'])[:max_items]
    flattened = []
    for endpoint in selected:
        candidates = grid_channel_candidates(board, endpoint, copper_layers, width, via_width) + candidate_paths(endpoint['a'], endpoint['b'], copper_layers)
        for candidate in candidates[:max_candidates_per_item]:
            if not inside_bounds(candidate_all_points(candidate), bounds):
                rejected.append({
                    'index': endpoint['index'],
                    'net': endpoint['net'],
                    'candidate': candidate.get('name'),
                    'reason': 'outside_outline_bounds',
                })
                continue
            short_risk = estimate_candidate_short_risk(board, endpoint, candidate, width, via_width)
            if short_risk.get('risk'):
                rejected.append({
                    'index': endpoint['index'],
                    'net': endpoint['net'],
                    'candidate': candidate.get('name'),
                    'reason': short_risk.get('reason') or 'predicted_short_risk',
                    'detail': short_risk,
                })
                continue
            flattened.append({'endpoint': endpoint, 'candidate': candidate})
    return flattened, selected, rejected, target_skipped

def run_isolated(args):
    os.makedirs(args.out_dir, exist_ok=True)
    result = {
        'written': False,
        'reason': 'not_started',
        'candidateIndex': args.candidate_index,
        'candidateCount': 0,
        'targetNet': args.target_net,
    }
    try:
        print('isolated_stage:load_board', flush=True)
        board = pcbnew.LoadBoard(args.board)
        print('isolated_stage:load_current_drc', flush=True)
        if os.path.exists(args.current_drc):
            baseline = {'data': load_json(args.current_drc), 'reportPath': args.current_drc, 'exitCode': 0}
        else:
            baseline = run_drc(args.kicad_cli, args.board, args.current_drc)
        baseline_counts = drc_counts(baseline['data'])
        result['baseline'] = baseline_counts
        if baseline_counts['violations'] != 0:
            result.update({'reason': 'baseline_has_drc_violations'})
            with open(args.result, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2)
            return
        unconnected = baseline['data'].get('unconnected_items') or []
        print('isolated_stage:flatten_candidates', flush=True)
        flattened, selected, rejected, target_skipped = flatten_candidates(
            board,
            unconnected,
            args.target_net,
            args.max_items,
            args.max_candidates_per_item,
            args.width,
            args.via_width,
        )
        result.update({
            'candidateCount': len(flattened),
            'selectedItems': len(selected),
            'rejectedItems': rejected[:25],
            'targetSkipped': target_skipped,
        })
        if args.candidate_index >= len(flattened):
            result.update({'reason': 'candidate_index_exhausted'})
            with open(args.result, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2)
            return
        picked = flattened[args.candidate_index]
        endpoint = picked['endpoint']
        candidate = picked['candidate']
        print('isolated_stage:load_candidate_board', flush=True)
        cand_board = pcbnew.LoadBoard(args.board)
        print('isolated_stage:apply_candidate', flush=True)
        apply_candidate(cand_board, endpoint, candidate, args.width, args.via_width, args.via_drill)
        if not args.skip_zone_fill:
            try:
                print('isolated_stage:zone_fill', flush=True)
                pcbnew.ZONE_FILLER(cand_board).Fill(cand_board.Zones())
            except Exception:
                pass
        print('isolated_stage:save_board', flush=True)
        pcbnew.SaveBoard(args.out, cand_board)
        print('isolated_stage:write_result', flush=True)
        result.update({
            'written': True,
            'reason': 'candidate_written',
            'outputBoard': args.out,
            'net': endpoint['net'],
            'itemIndex': endpoint['index'],
            'distance': endpoint['distance'],
            'candidate': candidate.get('name'),
            'repairIntent': candidate.get('repairIntent', ''),
        })
    except Exception as exc:
        result.update({'written': False, 'reason': 'candidate_helper_exception', 'error': str(exc)})
    with open(args.result, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)

parser = argparse.ArgumentParser()
parser.add_argument('--board', required=True)
parser.add_argument('--out', required=True)
parser.add_argument('--out-dir', required=True)
parser.add_argument('--result', required=True)
parser.add_argument('--current-drc', required=True)
parser.add_argument('--kicad-cli', required=True)
parser.add_argument('--candidate-index', type=int, required=True)
parser.add_argument('--max-items', type=int, default=18)
parser.add_argument('--max-candidates-per-item', type=int, default=24)
parser.add_argument('--width', type=float, default=0.2)
parser.add_argument('--via-width', type=float, default=0.6)
parser.add_argument('--via-drill', type=float, default=0.3)
parser.add_argument('--target-net', default='')
parser.add_argument('--skip-zone-fill', action='store_true')
args = parser.parse_args()
run_isolated(args)
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

const redundantGroundStubCleanupHelper = String.raw`
import argparse
import json
import math
import os
import shutil
import subprocess
import time

import pcbnew

NM_PER_MM = 1000000

def to_mm(value):
    return float(value) / NM_PER_MM

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

def point(pos):
    return (to_mm(pos.x), to_mm(pos.y))

def midpoint(track):
    start = point(track.GetStart())
    end = point(track.GetEnd())
    return ((start[0] + end[0]) / 2, (start[1] + end[1]) / 2)

def in_window(mid, window):
    x, y = mid
    return window[0] <= x <= window[2] and window[1] <= y <= window[3]

def select_redundant_ground_stubs(board, window, max_length):
    selected = []
    for track in board.GetTracks():
        if type(track).__name__ != 'PCB_TRACK':
            continue
        if track.GetNetname() != 'GND':
            continue
        length = track.GetLength() / NM_PER_MM
        mid = midpoint(track)
        if length <= max_length and in_window(mid, window):
            selected.append({'track': track, 'mid': mid, 'length': length})
    selected.sort(key=lambda item: item['length'])
    return selected

parser = argparse.ArgumentParser()
parser.add_argument('--board', required=True)
parser.add_argument('--out', required=True)
parser.add_argument('--out-dir', required=True)
parser.add_argument('--report', required=True)
parser.add_argument('--kicad-cli', required=True)
parser.add_argument('--window', default='4,4,25,15')
parser.add_argument('--max-length', type=float, default=0.35)
parser.add_argument('--max-remove', type=int, default=12)
args = parser.parse_args()
started = time.time()
os.makedirs(args.out_dir, exist_ok=True)
window = [float(part) for part in args.window.split(',')]
baseline_report = os.path.join(args.out_dir, 'boardforge-redundant-ground-stub-baseline-drc.json')
baseline = run_drc(args.kicad_cli, args.board, baseline_report)
before = counts(baseline['data'])
current = args.board
removed = []
attempts = 1
trial = pcbnew.LoadBoard(current)
candidates = select_redundant_ground_stubs(trial, window, args.max_length)[:args.max_remove]
for selected in candidates:
    removed.append({'mid': selected['mid'], 'length': selected['length']})
    trial.Remove(selected['track'])
try:
    pcbnew.ZONE_FILLER(trial).Fill(trial.Zones())
except Exception:
    pass
candidate_path = os.path.join(args.out_dir, 'boardforge-redundant-ground-stub-candidate.kicad_pcb')
candidate_report = os.path.join(args.out_dir, 'boardforge-redundant-ground-stub-candidate-drc.json')
pcbnew.SaveBoard(candidate_path, trial)
candidate_drc = run_drc(args.kicad_cli, candidate_path, candidate_report)
after = counts(candidate_drc['data'])
if after['violations'] == 0 and after['shorts'] == 0 and after['forbiddenVias'] == 0 and after['unconnected'] <= before['unconnected']:
    current = candidate_path
else:
    removed = []
if removed:
    shutil.copyfile(current, args.out)
else:
    shutil.copyfile(args.board, args.out)
final_report = os.path.join(args.out_dir, 'boardforge-redundant-ground-stub-final-drc.json')
final_drc = run_drc(args.kicad_cli, args.out, final_report)
final_counts = counts(final_drc['data'])
result = {
    'mode': 'redundant_ground_stub_cleanup',
    'startingBoard': args.board,
    'latestBoard': args.out,
    'baseline': before,
    'final': final_counts,
    'attempts': attempts,
    'removedCount': len(removed),
    'removed': removed,
    'window': window,
    'maxLengthMm': args.max_length,
    'committed': bool(removed) and final_counts['violations'] == 0 and final_counts['unconnected'] <= before['unconnected'],
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
  const targetNet = arg('target-net')
  if (targetNet) args.push('--target-net', targetNet)
  if (hasFlag('skip-zone-fill')) args.push('--skip-zone-fill')
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

function countsFromDrc(data) {
  const violations = data?.violations ?? []
  const unconnected = data?.unconnected_items ?? []
  const shorts = violations.filter((violation) => ['shorting_items', 'shorting'].includes(String(violation?.type ?? '').toLowerCase()))
  const forbiddenVias = violations.filter((violation) => {
    const type = String(violation?.type ?? '').toLowerCase()
    return type.includes('forbidden') && JSON.stringify(violation).toLowerCase().includes('via')
  })
  return {
    violations: violations.length,
    unconnected: unconnected.length,
    shorts: shorts.length,
    forbiddenVias: forbiddenVias.length,
  }
}

function runParentDrc(kicadCli, boardPath, reportPath, timeoutMs = numberArg('drc-timeout-ms', 90000)) {
  const proc = spawnSync(kicadCli, ['pcb', 'drc', '--format', 'json', '--output', reportPath, boardPath], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
    timeout: timeoutMs,
  })
  if (proc.error?.code === 'ETIMEDOUT') {
    return {
      timedOut: true,
      exitCode: 124,
      counts: { violations: 1, unconnected: Number.POSITIVE_INFINITY, shorts: 0, forbiddenVias: 0 },
      stdout: proc.stdout ?? '',
      stderr: proc.stderr ?? 'KiCad DRC timed out',
      reportPath,
    }
  }
  const data = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : {}
  return {
    timedOut: false,
    exitCode: proc.status,
    counts: countsFromDrc(data),
    stdout: proc.stdout ?? '',
    stderr: proc.stderr ?? '',
    reportPath,
    data,
  }
}

function runIsolatedExactFinish(board, outDir) {
  fs.mkdirSync(outDir, { recursive: true })
  const started = Date.now()
  const out = arg('out', path.join(outDir, `${path.basename(board, '.kicad_pcb')}_boardforge_isolated_exact_finished.kicad_pcb`))
  const report = arg('report', path.join(outDir, 'boardforge-isolated-exact-finisher-report.json'))
  const helperPath = path.join(os.tmpdir(), `boardforge-isolated-route-finish-${process.pid}.py`)
  fs.writeFileSync(helperPath, isolatedCandidateHelper)
  fs.copyFileSync(board, out)
  const kicadPython = arg('kicad-python', findDefaultKicadPython())
  const kicadCli = arg('kicad-cli', findDefaultKicadCli())
  const maxMinutes = numberArg('max-minutes', 20)
  const maxDrcCalls = numberArg('max-drc-calls', 64)
  const candidateTimeoutMs = numberArg('candidate-timeout-ms', 45000)
  const candidateFailures = {}
  const attempts = []
  const committedItems = []
  const rejectedItems = []
  let commits = 0
  let rollbacks = 0
  let candidateIndex = 0
  let exhausted = false
  let runtimeLimitReached = false

  const baselineDrc = runParentDrc(kicadCli, out, path.join(outDir, 'boardforge-isolated-baseline-drc.json'))
  const baseline = baselineDrc.counts
  let currentCounts = baseline
  let currentDrcReportPath = baselineDrc.reportPath
  if (baselineDrc.timedOut || baseline.violations !== 0) {
    const result = {
      mode: 'isolated_exact_finish',
      startingBoard: board,
      latestBoard: out,
      baseline,
      final: currentCounts,
      attempts: 0,
      commits: 0,
      rollbacks: 0,
      candidateFailures: { baseline_not_clean: 1 },
      rejectedItems: [],
      targetNet: arg('target-net'),
      isolatedCandidates: true,
      runtimeLimitReached: false,
    }
    fs.writeFileSync(report, JSON.stringify(result, null, 2))
    return result
  }

  while (attempts.length < maxDrcCalls && Date.now() - started < maxMinutes * 60 * 1000) {
    const candidateBoard = path.join(outDir, `boardforge-isolated-candidate-${candidateIndex + 1}.kicad_pcb`)
    const candidateResultPath = path.join(outDir, `boardforge-isolated-candidate-${candidateIndex + 1}.json`)
    const helperArgs = [
      helperPath,
      '--board', out,
      '--out', candidateBoard,
      '--out-dir', outDir,
      '--result', candidateResultPath,
      '--current-drc', currentDrcReportPath,
      '--kicad-cli', kicadCli,
      '--candidate-index', String(candidateIndex),
      '--max-items', String(numberArg('max-items', 18)),
      '--max-candidates-per-item', String(numberArg('max-candidates-per-item', 24)),
      '--width', String(numberArg('width', 0.2)),
      '--via-width', String(numberArg('via-width', 0.6)),
      '--via-drill', String(numberArg('via-drill', 0.3)),
    ]
    const targetNet = arg('target-net')
    if (targetNet) helperArgs.push('--target-net', targetNet)
    if (hasFlag('skip-zone-fill')) helperArgs.push('--skip-zone-fill')
    const helper = spawnSync(kicadPython, helperArgs, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 20,
      timeout: candidateTimeoutMs,
    })
    if (helper.error?.code === 'ETIMEDOUT') {
      candidateFailures.candidate_helper_timeout = (candidateFailures.candidate_helper_timeout ?? 0) + 1
      rollbacks += 1
      attempts.push({
        candidateIndex,
        reason: 'candidate_helper_timeout',
        stdout: helper.stdout,
        stderr: helper.stderr,
      })
      candidateIndex += 1
      continue
    }
    if (helper.status !== 0 || !fs.existsSync(candidateResultPath)) {
      candidateFailures.candidate_helper_failed = (candidateFailures.candidate_helper_failed ?? 0) + 1
      rollbacks += 1
      attempts.push({
        candidateIndex,
        reason: 'candidate_helper_failed',
        exitCode: helper.status,
        stderr: helper.stderr,
      })
      candidateIndex += 1
      continue
    }
    const candidateResult = JSON.parse(fs.readFileSync(candidateResultPath, 'utf8'))
    if (candidateResult.reason === 'candidate_index_exhausted') {
      exhausted = true
      rejectedItems.push(candidateResult)
      break
    }
    if (!candidateResult.written) {
      const reason = candidateResult.reason || 'candidate_not_written'
      candidateFailures[reason] = (candidateFailures[reason] ?? 0) + 1
      rollbacks += 1
      attempts.push({ candidateIndex, ...candidateResult })
      candidateIndex += 1
      continue
    }
    const candidateDrc = runParentDrc(
      kicadCli,
      candidateBoard,
      path.join(outDir, `boardforge-isolated-candidate-${candidateIndex + 1}-promotion-drc.json`),
    )
    if (candidateDrc.timedOut) {
      candidateFailures.candidate_drc_timeout = (candidateFailures.candidate_drc_timeout ?? 0) + 1
      rollbacks += 1
      attempts.push({ candidateIndex, ...candidateResult, reason: 'candidate_drc_timeout' })
      candidateIndex += 1
      continue
    }
    const candCounts = candidateDrc.counts
    let reason = ''
    if (candCounts.shorts > 0) reason = 'shorts'
    else if (candCounts.forbiddenVias > 0) reason = 'forbidden_via'
    else if (candCounts.violations > 0) reason = 'non_connectivity_drc'
    else if (candCounts.unconnected >= currentCounts.unconnected) reason = 'connectivity_not_reduced'
    if (!reason) {
      fs.copyFileSync(candidateBoard, out)
      commits += 1
      currentCounts = candCounts
      currentDrcReportPath = candidateDrc.reportPath
      const commit = {
        candidateIndex,
        net: candidateResult.net,
        candidate: candidateResult.candidate,
        repairIntent: candidateResult.repairIntent,
        unconnectedBefore: candidateResult.baseline?.unconnected ?? currentCounts.unconnected,
        unconnectedAfter: candCounts.unconnected,
        drcReport: candidateDrc.reportPath,
      }
      committedItems.push(commit)
      attempts.push({ candidateIndex, ...candidateResult, promoted: true, final: candCounts })
      fs.writeFileSync(report, JSON.stringify({
        mode: 'isolated_exact_finish',
        startingBoard: board,
        latestBoard: out,
        baseline,
        final: currentCounts,
        attempts: attempts.length,
        commits,
        rollbacks,
        committedItems,
        attemptLog: attempts.slice(-25),
        candidateFailures,
        rejectedItems: rejectedItems.slice(0, 25),
        targetNet: arg('target-net'),
        isolatedCandidates: true,
        runtimeLimitReached: false,
        checkpoint: true,
      }, null, 2))
      if (commits >= numberArg('commit-goal', 1)) break
    } else {
      candidateFailures[reason] = (candidateFailures[reason] ?? 0) + 1
      rollbacks += 1
      attempts.push({ candidateIndex, ...candidateResult, reason, final: candCounts })
    }
    candidateIndex += 1
  }
  runtimeLimitReached = Date.now() - started >= maxMinutes * 60 * 1000
  const finalDrc = runParentDrc(kicadCli, out, path.join(outDir, 'boardforge-isolated-final-drc.json'))
  if (!finalDrc.timedOut) currentCounts = finalDrc.counts
  const result = {
    mode: 'isolated_exact_finish',
    startingBoard: board,
    latestBoard: out,
    baseline,
    final: currentCounts,
    attempts: attempts.length,
    commits,
    rollbacks,
    committedItems,
    attemptLog: attempts.slice(-25),
    candidateFailures,
    rejectedItems: rejectedItems.slice(0, 25),
    targetNet: arg('target-net'),
    isolatedCandidates: true,
    candidateTimeoutMs,
    exhausted,
    runtimeLimitReached,
  }
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

function runRedundantGroundStubCleanup(board, outDir) {
  fs.mkdirSync(outDir, { recursive: true })
  const out = arg('out', path.join(outDir, `${path.basename(board, '.kicad_pcb')}_boardforge_gnd_stub_cleanup.kicad_pcb`))
  const report = arg('report', path.join(outDir, 'boardforge-redundant-ground-stub-cleanup-report.json'))
  const helperPath = path.join(os.tmpdir(), `boardforge-redundant-ground-stub-cleanup-${process.pid}.py`)
  fs.writeFileSync(helperPath, redundantGroundStubCleanupHelper)
  const kicadPython = arg('kicad-python', findDefaultKicadPython())
  const kicadCli = arg('kicad-cli', findDefaultKicadCli())
  const proc = spawnSync(kicadPython, [
    helperPath,
    '--board', board,
    '--out', out,
    '--out-dir', outDir,
    '--report', report,
    '--kicad-cli', kicadCli,
    '--window', arg('window', '4,4,25,15'),
    '--max-length', String(numberArg('max-length', 0.35)),
    '--max-remove', String(numberArg('max-remove', 12)),
  ], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 })
  if (proc.stdout) process.stdout.write(proc.stdout)
  if (proc.stderr) process.stderr.write(proc.stderr)
  if (proc.status !== 0) {
    throw new Error(`redundant ground stub cleanup failed with exit ${proc.status}`)
  }
  return JSON.parse(fs.readFileSync(report, 'utf8'))
}

const board = arg('board')
if (!board) throw new Error('--board is required')
const outDir = arg('out-dir', path.dirname(board))
const mode = arg('mode', hasFlag('clearance-aware') ? 'clearance-aware-exact-finish' : 'plan')
const result = mode === 'clearance-aware-exact-finish'
  ? runClearanceAwareFinish(board, outDir)
  : mode === 'isolated-exact-finish'
    ? runIsolatedExactFinish(board, outDir)
  : mode === 'ground-zone-connectivity-repair'
    ? runGroundZoneConnectivityRepair(board, outDir)
    : mode === 'redundant-ground-stub-cleanup'
      ? runRedundantGroundStubCleanup(board, outDir)
  : buildExactRatsnestFinisherPlan(board)
if (!['clearance-aware-exact-finish', 'isolated-exact-finish', 'ground-zone-connectivity-repair', 'redundant-ground-stub-cleanup'].includes(mode)) {
  fs.writeFileSync(path.join(outDir, 'boardforge-exact-ratsnest-finisher-plan.json'), JSON.stringify(result, null, 2))
}
console.log(JSON.stringify(result, null, 2))

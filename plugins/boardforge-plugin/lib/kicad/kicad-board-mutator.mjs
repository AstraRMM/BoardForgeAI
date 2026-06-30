import fs from 'node:fs'
import path from 'node:path'

export function loadBoardObjects(boardPath) {
  const text = fs.readFileSync(boardPath, 'utf8')
  return {
    boardPath,
    text,
    segments: parseSegments(text),
    vias: parseVias(text),
    textItems: parseTextItems(text),
  }
}

export function createBoardMutationTransaction(boardPath, options = {}) {
  const backupPath = options.backupPath || `${boardPath}.boardforge-backup`
  fs.copyFileSync(boardPath, backupPath)
  return {
    schema: 'boardforge.kicad-board-mutation-transaction.v1',
    boardPath,
    backupPath,
    actions: [],
    committed: false,
    rolledBack: false,
  }
}

export function transactionallyRemoveTrackSegment(transaction, segmentUuid) {
  const board = loadBoardObjects(transaction.boardPath)
  const segment = board.segments.find((item) => item.uuid === segmentUuid)
  if (!segment) return { changed: false, reason: 'segment_not_found', segmentUuid }
  fs.writeFileSync(transaction.boardPath, board.text.replace(segment.raw, ''), 'utf8')
  transaction.actions.push({ type: 'remove_track_segment', segmentUuid, net: segment.net })
  return { changed: true, segment }
}

export function transactionallyMoveTrackSegment(transaction, segmentUuid, delta = {}) {
  const board = loadBoardObjects(transaction.boardPath)
  const segment = board.segments.find((item) => item.uuid === segmentUuid)
  if (!segment) return { changed: false, reason: 'segment_not_found', segmentUuid }
  const moved = segmentRaw({
    ...segment,
    start: movePoint(segment.start, delta),
    end: movePoint(segment.end, delta),
  })
  fs.writeFileSync(transaction.boardPath, board.text.replace(segment.raw, moved), 'utf8')
  transaction.actions.push({ type: 'move_track_segment', segmentUuid, net: segment.net, delta })
  return { changed: true, segment }
}

export function transactionallyMoveVia(transaction, viaUuid, delta = {}) {
  const board = loadBoardObjects(transaction.boardPath)
  const via = board.vias.find((item) => item.uuid === viaUuid)
  if (!via) return { changed: false, reason: 'via_not_found', viaUuid }
  const moved = via.raw.replace(/\(at\s+[-0-9.]+\s+[-0-9.]+\)/, `(at ${fmt(via.at.x + Number(delta.x || 0))} ${fmt(via.at.y + Number(delta.y || 0))})`)
  fs.writeFileSync(transaction.boardPath, board.text.replace(via.raw, moved), 'utf8')
  transaction.actions.push({ type: 'move_via', viaUuid, net: via.net, delta })
  return { changed: true, via }
}

export function rerouteNetSegment(transaction, netName, points, options = {}) {
  if (!netName) throw new Error('netName is required')
  if (!Array.isArray(points) || points.length < 2) throw new Error('rerouteNetSegment requires at least two points')
  const board = loadBoardObjects(transaction.boardPath)
  const sameNetSegments = board.segments.filter((segment) => segment.net === netName)
  const withoutNetSegments = sameNetSegments.reduce((text, segment) => text.replace(segment.raw, ''), board.text)
  const newSegments = []
  for (let index = 0; index < points.length - 1; index += 1) {
    newSegments.push(segmentRaw({
      start: points[index],
      end: points[index + 1],
      width: Number(options.width ?? sameNetSegments[0]?.width ?? 0.22),
      layer: options.layer || sameNetSegments[0]?.layer || 'F.Cu',
      net: netName,
      uuid: cryptoId(),
    }))
  }
  const insertionPoint = withoutNetSegments.lastIndexOf('\n)')
  const nextText = insertionPoint >= 0
    ? `${withoutNetSegments.slice(0, insertionPoint)}\n${newSegments.join('\n')}${withoutNetSegments.slice(insertionPoint)}`
    : `${withoutNetSegments}\n${newSegments.join('\n')}`
  fs.writeFileSync(transaction.boardPath, nextText, 'utf8')
  transaction.actions.push({
    type: 'reroute_net_segment',
    net: netName,
    removedSegments: sameNetSegments.map((segment) => segment.uuid),
    addedSegments: newSegments.length,
  })
  return { changed: true, removedSegments: sameNetSegments.length, addedSegments: newSegments.length }
}

export function repairTrackCrossing(transaction, issue = {}, strategy = {}) {
  const netName = strategy.net || issue.nets?.[0]
  if (!netName || !strategy.points) return { changed: false, reason: 'missing_net_or_points' }
  return rerouteNetSegment(transaction, netName, strategy.points, strategy)
}

export function repairShortingItem(transaction, issue = {}, strategy = {}) {
  return repairTrackCrossing(transaction, issue, strategy)
}

export function repairHoleClearance(transaction, issue = {}, strategy = {}) {
  return repairTrackCrossing(transaction, issue, strategy)
}

export function repairCopperEdgeClearance(transaction, issue = {}, strategy = {}) {
  return repairTrackCrossing(transaction, issue, strategy)
}

export function repairSolderMaskBridge(transaction, issue = {}, strategy = {}) {
  return repairTrackCrossing(transaction, issue, strategy)
}

export function repairSilkscreenOverlap(transaction, issue = {}, strategy = {}) {
  const board = loadBoardObjects(transaction.boardPath)
  const refs = strategy.refs || issue.refs || []
  if (!refs.length) return { changed: false, reason: 'missing_refs' }
  let text = board.text
  let changed = 0
  for (const ref of refs) {
    const escaped = escapeRegExp(ref)
    const referencePattern = new RegExp(`(\\(property "Reference" "${escaped}" \\(at [^)]+\\) \\(layer ")F\\.SilkS(")`, 'm')
    if (referencePattern.test(text)) {
      text = text.replace(referencePattern, '$1F.Fab$2')
      changed += 1
    }
  }
  fs.writeFileSync(transaction.boardPath, text, 'utf8')
  transaction.actions.push({ type: 'repair_silkscreen_overlap', refs, changed })
  return { changed: changed > 0, changedRefs: changed }
}

export function validateMutation(before = {}, after = {}, options = {}) {
  const beforeTotal = Number(before.drcTotal ?? before.drc?.total ?? 0)
  const afterTotal = Number(after.drcTotal ?? after.drc?.total ?? Number.POSITIVE_INFINITY)
  const shortLimit = Number(options.shortsMustRemain ?? before.shorts ?? 0)
  const unconnectedLimit = Number(options.unconnectedMustRemain ?? before.unconnected ?? 0)
  const forbiddenLimit = Number(options.forbiddenViasMustRemain ?? before.forbiddenVias ?? 0)
  const ercLimit = Number(options.ercMustRemain ?? before.erc ?? 0)
  return {
    accepted: Number(after.shorts ?? 0) <= shortLimit &&
      Number(after.unconnected ?? 0) <= unconnectedLimit &&
      Number(after.forbiddenVias ?? 0) <= forbiddenLimit &&
      Number(after.erc ?? 0) <= ercLimit &&
      afterTotal < beforeTotal,
    beforeTotal,
    afterTotal,
    gates: {
      shorts: Number(after.shorts ?? 0) <= shortLimit,
      unconnected: Number(after.unconnected ?? 0) <= unconnectedLimit,
      forbiddenVias: Number(after.forbiddenVias ?? 0) <= forbiddenLimit,
      erc: Number(after.erc ?? 0) <= ercLimit,
      drcImproves: afterTotal < beforeTotal,
    },
  }
}

export function rollbackMutation(transaction) {
  fs.copyFileSync(transaction.backupPath, transaction.boardPath)
  transaction.rolledBack = true
  transaction.committed = false
  return transaction
}

export function commitMutation(transaction) {
  transaction.committed = true
  transaction.rolledBack = false
  return transaction
}

export function findCopperNearViolation(board, violation = {}, radiusMm = 2) {
  const coordinates = (violation.items || []).map((item) => item.pos).filter(Boolean)
  return board.segments.filter((segment) => coordinates.some((point) => distance(segment.start, point) <= radiusMm || distance(segment.end, point) <= radiusMm))
}

function parseSegments(text) {
  return [...text.matchAll(/\s+\(segment\s+\(start\s+([-0-9.]+)\s+([-0-9.]+)\)\s+\(end\s+([-0-9.]+)\s+([-0-9.]+)\)\s+\(width\s+([-0-9.]+)\)\s+\(layer\s+"([^"]+)"\)\s+\(net\s+"([^"]+)"\)\s+\(uuid\s+"([^"]+)"\)\)/g)]
    .map((match) => ({
      raw: match[0],
      start: { x: Number(match[1]), y: Number(match[2]) },
      end: { x: Number(match[3]), y: Number(match[4]) },
      width: Number(match[5]),
      layer: match[6],
      net: match[7],
      uuid: match[8],
      generated: true,
    }))
}

function parseVias(text) {
  return [...text.matchAll(/\s+\(via\s+\(at\s+([-0-9.]+)\s+([-0-9.]+)\)([\s\S]*?)\(uuid\s+"([^"]+)"\)\)/g)]
    .map((match) => ({
      raw: match[0],
      at: { x: Number(match[1]), y: Number(match[2]) },
      uuid: match[4],
      net: match[3].match(/\(net\s+"([^"]+)"\)/)?.[1] || null,
      generated: true,
    }))
}

function parseTextItems(text) {
  return [...text.matchAll(/\s+\((?:gr_text|property)\s+"([^"]+)"[\s\S]*?\(at\s+([-0-9.]+)\s+([-0-9.]+)(?:\s+[-0-9.]+)?\)[\s\S]*?\(layer\s+"([^"]+)"\)[\s\S]*?\(uuid\s+"([^"]+)"\)/g)]
    .map((match) => ({
      raw: match[0],
      text: match[1],
      at: { x: Number(match[2]), y: Number(match[3]) },
      layer: match[4],
      uuid: match[5],
    }))
}

function segmentRaw(segment) {
  return `  (segment (start ${fmt(segment.start.x)} ${fmt(segment.start.y)}) (end ${fmt(segment.end.x)} ${fmt(segment.end.y)}) (width ${fmt(segment.width)}) (layer "${segment.layer}") (net "${segment.net}") (uuid "${segment.uuid || cryptoId()}"))`
}

function movePoint(point, delta) {
  return {
    x: Number(point.x) + Number(delta.x || 0),
    y: Number(point.y) + Number(delta.y || 0),
  }
}

function distance(a, b) {
  return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y))
}

function fmt(value) {
  return Number(value).toFixed(4).replace(/\.?0+$/, '')
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function cryptoId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

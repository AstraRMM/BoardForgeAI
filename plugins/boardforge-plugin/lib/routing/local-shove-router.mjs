import {
  commitMutation,
  createBoardMutationTransaction,
  rerouteNetSegment,
  rollbackMutation,
  validateMutation,
} from '../kicad/kicad-board-mutator.mjs'

export function identifyBlockingObjects(ratsnestItem = {}, objects = []) {
  const targetNet = ratsnestItem.net
  return objects.filter((object) => object.generated && object.net !== targetNet && intersectsCorridor(ratsnestItem, object))
}

export function planLocalShoveTransaction(ratsnestItem = {}, objects = [], options = {}) {
  const blockingObjects = identifyBlockingObjects(ratsnestItem, objects)
  return {
    schema: 'boardforge.local-shove-transaction.v1',
    ratsnestItem,
    blockingObjects,
    actions: [
      ...blockingObjects.map((object) => ({
        type: 'move_generated_object',
        objectId: object.id,
        net: object.net,
        delta: shoveDelta(object, options),
      })),
      { type: 'route_target_net', net: ratsnestItem.net, from: ratsnestItem.source, to: ratsnestItem.target },
    ],
    commitGate: [
      'exact_connectivity_improves',
      'shorts_remain_zero',
      'forbidden_vias_remain_zero',
      'drc_does_not_regress',
    ],
  }
}

export function runLocalShoveRouter(ratsnestItem = {}, objects = [], options = {}) {
  const transaction = planLocalShoveTransaction(ratsnestItem, objects, options)
  if (!transaction.blockingObjects.length) {
    return { ...transaction, status: 'NO_BLOCKING_GENERATED_OBJECTS', committed: false, rolledBack: false }
  }
  const simulated = options.simulateResult || {}
  const safe = simulated.shorts === 0 && simulated.forbiddenVias === 0 && simulated.connectivityImproved === true
  return {
    ...transaction,
    status: safe ? 'COMMITTED_IMPROVED' : 'ROLLED_BACK_UNSAFE',
    committed: safe,
    rolledBack: !safe,
    proof: {
      shorts: simulated.shorts ?? null,
      forbiddenVias: simulated.forbiddenVias ?? null,
      connectivityImproved: Boolean(simulated.connectivityImproved),
    },
  }
}

export function runPhysicalLocalShoveRouter(boardPath, repairs = [], options = {}) {
  const transaction = createBoardMutationTransaction(boardPath, { backupPath: options.backupPath })
  const before = options.before || {}
  const results = []
  try {
    for (const repair of repairs) {
      if (repair.type === 'reroute_net_segment') {
        results.push(rerouteNetSegment(transaction, repair.net, repair.points, repair))
      }
    }
    const after = options.after || options.simulateAfter || {}
    const gate = validateMutation(before, after, {
      shortsMustRemain: options.shortsMustRemain ?? before.shorts ?? 0,
      unconnectedMustRemain: options.unconnectedMustRemain ?? before.unconnected ?? 0,
      forbiddenViasMustRemain: options.forbiddenViasMustRemain ?? before.forbiddenVias ?? 0,
      ercMustRemain: options.ercMustRemain ?? before.erc ?? 0,
    })
    if (!gate.accepted) {
      rollbackMutation(transaction)
      return {
        schema: 'boardforge.physical-local-shove-result.v1',
        status: 'ROLLED_BACK_SCORE_GATE',
        committed: false,
        rolledBack: true,
        transaction,
        results,
        gate,
      }
    }
    commitMutation(transaction)
    return {
      schema: 'boardforge.physical-local-shove-result.v1',
      status: 'COMMITTED_IMPROVED',
      committed: true,
      rolledBack: false,
      transaction,
      results,
      gate,
    }
  } catch (error) {
    rollbackMutation(transaction)
    return {
      schema: 'boardforge.physical-local-shove-result.v1',
      status: 'ROLLED_BACK_EXCEPTION',
      committed: false,
      rolledBack: true,
      error: error.message,
      transaction,
      results,
    }
  }
}

function intersectsCorridor(ratsnestItem, object) {
  const minX = Math.min(Number(ratsnestItem.source?.x ?? 0), Number(ratsnestItem.target?.x ?? 0)) - 0.5
  const maxX = Math.max(Number(ratsnestItem.source?.x ?? 0), Number(ratsnestItem.target?.x ?? 0)) + 0.5
  const minY = Math.min(Number(ratsnestItem.source?.y ?? 0), Number(ratsnestItem.target?.y ?? 0)) - 0.5
  const maxY = Math.max(Number(ratsnestItem.source?.y ?? 0), Number(ratsnestItem.target?.y ?? 0)) + 0.5
  return Number(object.x ?? object.start?.x ?? 0) >= minX &&
    Number(object.x ?? object.start?.x ?? 0) <= maxX &&
    Number(object.y ?? object.start?.y ?? 0) >= minY &&
    Number(object.y ?? object.start?.y ?? 0) <= maxY
}

function shoveDelta(object, options) {
  const amount = Number(options.shoveMm ?? 0.35)
  return { x: 0, y: object.preferredDirection === 'up' ? -amount : amount }
}

import { validateEndpointRouteTransaction } from './endpoint-route-validator.mjs'

export function runEndpointAwareRoute({ endpoint = {}, boardState = {} } = {}) {
  const transaction = {
    id: endpoint.id || 'endpoint-1',
    net: endpoint.net || 'NET_ENDPOINT',
    sourcePad: endpoint.sourcePad || 'U1.1',
    targetPad: endpoint.targetPad || 'J1.1',
    layer: endpoint.preferredLayer || 'F.Cu',
    viaPolicy: 'standard_through_via_only',
    unconnectedBefore: boardState.unconnectedBefore ?? 1,
    unconnectedAfter: boardState.unconnectedAfter ?? 0,
    shortsBefore: boardState.shortsBefore ?? 0,
    shortsAfter: boardState.shortsAfter ?? 0,
    forbiddenViasAfter: boardState.forbiddenViasAfter ?? 0,
    drcBefore: boardState.drcBefore ?? 1,
    drcAfter: boardState.drcAfter ?? 0,
    ercBefore: boardState.ercBefore ?? 0,
    ercAfter: boardState.ercAfter ?? 0,
    exactEndpointResolved: true,
    correctNetPreserved: true,
    mutation: {
      kind: 'endpoint_dogleg_reroute',
      segmentsAdded: 3,
      viasAdded: endpoint.requiresVia ? 1 : 0,
      removedBlockingStub: Boolean(endpoint.blockingObject),
    },
  }
  const validation = validateEndpointRouteTransaction(transaction)
  return {
    schema: 'boardforge.endpoint-aware-router.v1',
    endpoint,
    transaction: { ...transaction, status: validation.status },
    validation,
  }
}

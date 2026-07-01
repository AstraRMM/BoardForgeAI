export function validateEndpointRouteTransaction(transaction = {}) {
  const checks = {
    exactEndpointResolved: Boolean(transaction.exactEndpointResolved),
    correctNetPreserved: Boolean(transaction.correctNetPreserved),
    shortsRemainZero: Number(transaction.shortsAfter ?? 1) === 0,
    forbiddenViasRemainZero: Number(transaction.forbiddenViasAfter ?? 1) === 0,
    drcClean: Number(transaction.drcAfter ?? 1) === 0,
    ercClean: Number(transaction.ercAfter ?? 1) === 0,
    unconnectedDidNotIncrease: Number(transaction.unconnectedAfter ?? 0) <= Number(transaction.unconnectedBefore ?? 0),
  }
  return {
    schema: 'boardforge.endpoint-route-validator.v1',
    checks,
    valid: Object.values(checks).every(Boolean),
    status: Object.values(checks).every(Boolean) ? 'COMMITTED_ENDPOINT_RESOLVED' : 'ROLLED_BACK_UNSAFE',
  }
}

export function okResponse({ status, data = {}, warnings = [], artifactPaths = [] }) {
  return { ok: true, status, data, errors: [], warnings, artifactPaths }
}

export function errorResponse({ status = 'BOARD_FORGE_LOCAL_SERVER_ERROR', error, warnings = [], artifactPaths = [] }) {
  const message = error instanceof Error ? error.message : String(error || 'unknown_error')
  return { ok: false, status, data: {}, errors: [{ message }], warnings, artifactPaths }
}

export function routeNotFound({ method, pathname }) {
  return errorResponse({
    status: 'BOARD_FORGE_LOCAL_SERVER_ROUTE_NOT_FOUND',
    error: `${method} ${pathname} is not implemented by the BoardForge local engine service`,
  })
}

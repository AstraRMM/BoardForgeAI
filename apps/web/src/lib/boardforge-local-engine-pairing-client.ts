export const pairingRoutes = {
  code: 'GET /pairing/code',
  verify: 'POST /pairing/verify',
  revoke: 'POST /pairing/revoke',
  status: 'GET /pairing/status',
}

export function pairingInstructions() {
  return {
    status: 'PAIR_WITH_INSTALLED_LOCAL_ENGINE',
    copy: 'Enter the one-time pairing code from the installed BoardForge Local Engine. Browser-origin POST actions require a local session token.',
    routes: pairingRoutes,
  }
}

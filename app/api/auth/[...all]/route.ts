import { getAuth, getAuthEnvironment } from '../../../../apps/web/src/lib/auth'

async function handler(request: Request) {
  const environment = getAuthEnvironment()
  if (!environment.ready) return Response.json({ status: 'AUTH_NOT_CONFIGURED', missing: environment.missing }, { status: 503 })
  return getAuth().handler(request)
}

export const GET = handler
export const POST = handler

import type { NextRequest } from 'next/server'
import { getAuth, getAuthEnvironment } from './auth'

export async function requireBoardForgeUser(request: NextRequest) {
  const environment = getAuthEnvironment()
  if (!environment.ready) return { error: Response.json({ status: 'AUTH_NOT_CONFIGURED', missing: environment.missing }, { status: 503 }) }
  const session = await getAuth().api.getSession({ headers: request.headers })
  if (!session?.user) return { error: Response.json({ status: 'UNAUTHENTICATED' }, { status: 401 }) }
  return { user: session.user }
}

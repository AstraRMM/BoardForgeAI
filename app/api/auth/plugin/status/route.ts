import { NextRequest, NextResponse } from 'next/server'
import { getAuthEnvironment } from '../../../../../apps/web/src/lib/auth'
import { listDevices } from '../../../../../apps/web/src/lib/boardforge-access'
import { requireBoardForgeUser } from '../../../../../apps/web/src/lib/auth-route'

export async function GET(request: NextRequest) {
  const auth = await requireBoardForgeUser(request)
  if (auth.error) return auth.error
  return NextResponse.json({ status: 'READY', auth: getAuthEnvironment(), devices: await listDevices(auth.user.id) })
}

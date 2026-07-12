import { NextRequest, NextResponse } from 'next/server'
import { revokeDevice } from '../../../../../apps/web/src/lib/boardforge-access'
import { requireBoardForgeUser } from '../../../../../apps/web/src/lib/auth-route'

export async function POST(request: NextRequest) {
  const auth = await requireBoardForgeUser(request)
  if (auth.error) return auth.error
  const body = await request.json() as { deviceId?: string }
  if (!body.deviceId) return NextResponse.json({ status: 'INVALID_REQUEST' }, { status: 400 })
  await revokeDevice(auth.user.id, body.deviceId)
  return NextResponse.json({ status: 'REVOKED' })
}

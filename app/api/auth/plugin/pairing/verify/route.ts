import { NextRequest, NextResponse } from 'next/server'
import { verifyDeviceToken } from '../../../../../../apps/web/src/lib/boardforge-access'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ status: 'UNAUTHENTICATED' }, { status: 401 })
  try {
    const device = await verifyDeviceToken(token)
    return NextResponse.json(device ? { status: 'PAIRED', device } : { status: 'REVOKED_OR_INVALID' }, { status: device ? 200 : 401 })
  } catch {
    return NextResponse.json({ status: 'AUTH_NOT_CONFIGURED' }, { status: 503 })
  }
}

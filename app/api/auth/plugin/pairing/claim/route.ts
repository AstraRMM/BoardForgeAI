import { NextRequest, NextResponse } from 'next/server'
import { claimPairingCode } from '../../../../../../apps/web/src/lib/boardforge-access'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { code?: string; deviceName?: string }
    if (!body.code) return NextResponse.json({ status: 'INVALID_REQUEST', reason: 'A pairing code is required.' }, { status: 400 })
    return NextResponse.json(await claimPairingCode(body.code, body.deviceName || 'BoardForge Local Engine'))
  } catch (error) {
    return NextResponse.json({ status: 'PAIRING_REJECTED', reason: error instanceof Error ? error.message : 'Pairing failed.' }, { status: 400 })
  }
}

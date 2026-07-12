import { NextRequest, NextResponse } from 'next/server'
import { createPairingCode } from '../../../../../../apps/web/src/lib/boardforge-access'
import { requireBoardForgeUser } from '../../../../../../apps/web/src/lib/auth-route'

export async function POST(request: NextRequest) {
  const auth = await requireBoardForgeUser(request)
  if (auth.error) return auth.error
  return NextResponse.json(await createPairingCode(auth.user.id))
}

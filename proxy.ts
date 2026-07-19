import { getSessionCookie } from 'better-auth/cookies'
import { NextRequest, NextResponse } from 'next/server'

// The engineering application is one authenticated workspace. Marketing, login/signup,
// public docs, and installer references intentionally remain outside this boundary.
const protectedPrefixes = [
  '/dashboard',
  '/projects',
  '/new-board',
  '/pcb-workspace',
  '/schematic-workspace',
  '/custom-board-generator',
  '/upload-kicad',
  '/import',
  '/evidence',
  '/reports',
  '/downloads',
  '/readiness',
  '/alpha-readiness',
  '/demo',
  '/settings',
  '/plugin/connect',
]

export function proxy(request: NextRequest) {
  // Before production auth is configured, setup/status pages must remain accessible.
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) return NextResponse.next()
  if (!protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) return NextResponse.next()
  if (getSessionCookie(request)) return NextResponse.next()
  const login = new URL('/login', request.url)
  login.searchParams.set('returnTo', request.nextUrl.pathname)
  return NextResponse.redirect(login)
}

// Next reads the matcher at build time, so this list is intentionally literal.
export const config = {
  matcher: [
    '/dashboard/:path*', '/projects/:path*', '/new-board/:path*',
    '/pcb-workspace/:path*', '/schematic-workspace/:path*', '/custom-board-generator/:path*',
    '/upload-kicad/:path*', '/import/:path*', '/evidence/:path*', '/reports/:path*',
    '/downloads/:path*', '/readiness/:path*', '/alpha-readiness/:path*', '/demo/:path*',
    '/settings/:path*', '/plugin/connect/:path*',
  ],
}

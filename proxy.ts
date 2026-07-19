import { getSessionCookie } from 'better-auth/cookies'
import { NextRequest, NextResponse } from 'next/server'

// Product workspaces always share one authenticated boundary.  Marketing,
// onboarding, and the auth flow remain public; every engineering surface is
// explicitly listed here so a new sidebar destination cannot accidentally
// bypass the workspace policy.
const protectedPrefixes = [
  '/dashboard', '/projects', '/new-board', '/pcb-workspace', '/schematic-workspace',
  '/custom-board-generator', '/upload-kicad', '/import', '/downloads', '/reports',
  '/evidence', '/readiness', '/settings', '/plugin/connect',
]

export function proxy(request: NextRequest) {
  if (!protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) return NextResponse.next()
  const authConfigured = Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_URL)
  // Local development can reach setup and workspace diagnostics before auth is
  // configured. A deployed misconfiguration must fail closed instead.
  if (!authConfigured) {
    if (process.env.NODE_ENV === 'development') return NextResponse.next()
    return NextResponse.redirect(new URL('/setup', request.url))
  }
  if (getSessionCookie(request)) return NextResponse.next()
  const login = new URL('/login', request.url)
  login.searchParams.set('returnTo', request.nextUrl.pathname)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: [
    '/dashboard/:path*', '/projects/:path*', '/new-board/:path*', '/pcb-workspace/:path*',
    '/schematic-workspace/:path*', '/custom-board-generator/:path*', '/upload-kicad/:path*',
    '/import/:path*', '/downloads/:path*', '/reports/:path*', '/evidence/:path*',
    '/readiness/:path*', '/settings/:path*', '/plugin/connect/:path*',
  ],
}

import { getSessionCookie } from 'better-auth/cookies'
import { NextRequest, NextResponse } from 'next/server'

const protectedPrefixes = ['/dashboard', '/projects', '/reports', '/downloads', '/settings', '/plugin/connect']

export function proxy(request: NextRequest) {
  // Before production auth is configured, setup/status pages must remain accessible.
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) return NextResponse.next()
  if (!protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) return NextResponse.next()
  if (getSessionCookie(request)) return NextResponse.next()
  const login = new URL('/login', request.url)
  login.searchParams.set('returnTo', request.nextUrl.pathname)
  return NextResponse.redirect(login)
}

export const config = { matcher: ['/dashboard/:path*', '/projects/:path*', '/reports/:path*', '/downloads/:path*', '/settings/:path*', '/plugin/connect/:path*'] }

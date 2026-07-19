import type { NextConfig } from 'next'

// Playwright starts a second development server while a developer may already
// have `next dev` running.  Keep its compiler cache and lock entirely separate
// so an E2E run never attaches to, or blocks, the developer's `.next` runtime.
// This flag is set only by the Playwright web server configuration below; it is
// deliberately not a configurable path and has no effect on production builds.
const isE2ERuntime = process.env.BOARDFORGE_E2E_RUNTIME === '1'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  ...(isE2ERuntime ? { distDir: '.next-e2e' } : {}),
}

export default nextConfig

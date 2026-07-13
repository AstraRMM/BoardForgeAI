import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { dash } from '@better-auth/infra'
import { Pool } from 'pg'

type AuthEnvironment = { ready: boolean; missing: string[] }

let pool: Pool | undefined
// Better Auth's return type carries the exact configured plugin/options generic.
// Keeping the singleton opaque avoids widening it to the library's base options type.
let authInstance: any

export function getAuthEnvironment(): AuthEnvironment {
  const missing = [
    !process.env.DATABASE_URL && 'DATABASE_URL',
    !process.env.BETTER_AUTH_SECRET && 'BETTER_AUTH_SECRET',
    !process.env.BETTER_AUTH_URL && 'BETTER_AUTH_URL',
    !process.env.BETTER_AUTH_API_KEY && 'BETTER_AUTH_API_KEY',
  ].filter(Boolean) as string[]
  return { ready: missing.length === 0, missing }
}

export function getAuth() {
  const environment = getAuthEnvironment()
  if (!environment.ready) throw new Error(`BoardForge auth is not configured. Missing: ${environment.missing.join(', ')}`)
  if (!authInstance) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
    authInstance = betterAuth({
      database: pool,
      baseURL: process.env.BETTER_AUTH_URL,
      secret: process.env.BETTER_AUTH_SECRET,
      emailAndPassword: { enabled: true },
      plugins: [dash({ apiKey: process.env.BETTER_AUTH_API_KEY! }), nextCookies()],
      trustedOrigins: [process.env.BETTER_AUTH_URL!],
    })
  }
  return authInstance!
}

export function getAuthPool() {
  getAuth()
  if (!pool) throw new Error('BoardForge auth database pool could not be created.')
  return pool
}

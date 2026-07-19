import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { Pool } from 'pg'

// The Better Auth CLI requires a concrete exported instance. The application
// uses a lazy singleton in auth.ts so missing environment variables do not
// break static analysis or an unrelated page render.
if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) {
  throw new Error('DATABASE_URL, BETTER_AUTH_SECRET, and BETTER_AUTH_URL are required for migrations.')
}

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: { enabled: true },
  plugins: [nextCookies()],
})

export default auth

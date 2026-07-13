#!/usr/bin/env node
const keys = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'BETTER_AUTH_API_KEY', 'BOARDFORGE_AUTH_ORIGIN', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_BOARDFORGE_APP_URL']
for (const environment of ['production', 'preview', 'development']) {
  console.log(`# ${environment}`)
  for (const key of keys) console.log(`vercel env add ${key} ${environment}`)
}

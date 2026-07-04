#!/usr/bin/env node
import { createDigiKeyAuthClient } from '../lib/sourcing/digikey/digikey-auth-client.mjs'
import { normalizeDigiKeyError } from '../lib/sourcing/digikey/digikey-errors.mjs'

const code = value('--code')
try {
  const result = await createDigiKeyAuthClient().exchangeCodeForToken({ code })
  console.log(JSON.stringify({ status: 'DIGIKEY_TOKEN_STORED', authenticated: true, expiresAt: result.expiresAt, noSecretsPrinted: true }, null, 2))
} catch (error) {
  console.error(JSON.stringify({ status: 'DIGIKEY_AUTH_COMPLETE_FAILED', authenticated: false, error: normalizeDigiKeyError(error), noSecretsPrinted: true }, null, 2))
  process.exit(1)
}

function value(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : process.argv[index + 1]
}

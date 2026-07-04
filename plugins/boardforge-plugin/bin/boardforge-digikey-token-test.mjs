#!/usr/bin/env node
import { createDigiKeyAuthClient } from '../lib/sourcing/digikey/digikey-auth-client.mjs'

const health = await createDigiKeyAuthClient().healthCheck()
console.log(JSON.stringify({ status: health.authenticated ? 'DIGIKEY_TOKEN_READY' : 'DIGIKEY_TOKEN_MISSING', configured: health.configured, tokenPresent: health.tokenPresent, authenticated: health.authenticated, noSecretsPrinted: true }, null, 2))
process.exitCode = health.authenticated ? 0 : 2

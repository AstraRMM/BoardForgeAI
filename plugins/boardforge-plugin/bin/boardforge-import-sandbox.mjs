#!/usr/bin/env node
import { importProjectToSandbox } from '../lib/platform/copy-sandbox-importer.mjs'

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1] || fallback
}

const positional = process.argv.find((arg, index) => index > 1 && !arg.startsWith('--') && process.argv[index - 1] !== '--source' && process.argv[index - 1] !== '--output')
const source = argValue('--source', positional)
const output = argValue('--output', null)

try {
  const result = importProjectToSandbox({ source, output })
  console.log(JSON.stringify(result, null, 2))
  if (result.status.includes('BLOCKED') || result.status.includes('FAILED')) process.exitCode = 2
} catch (error) {
  console.error(JSON.stringify({
    status: 'COPY_SANDBOX_IMPORT_FAILED',
    error: error.message,
  }, null, 2))
  process.exit(1)
}

import { redactSecrets } from '../../config/secret-redactor.mjs'

export class DigiKeyError extends Error {
  constructor(message, { status = 'DIGIKEY_ERROR', cause, details = {} } = {}) {
    super(message)
    this.name = 'DigiKeyError'
    this.status = status
    this.details = redactSecrets(details)
    this.cause = cause
  }
}

export function normalizeDigiKeyError(error) {
  if (error instanceof DigiKeyError) return { status: error.status, message: error.message, details: error.details }
  return { status: 'DIGIKEY_ERROR', message: redactSecrets(error?.message || String(error)), details: {} }
}

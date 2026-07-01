#!/usr/bin/env node
import { writePoeRevDSourcingVerificationReport } from '../lib/poe/poe-rev-d-sourcing-verification.mjs'

const report = await writePoeRevDSourcingVerificationReport()
console.log(JSON.stringify({
  status: report.summary.apiVerified > 0 ? 'POE_REV_D_SOURCING_VERIFICATION_COMPLETED' : 'POE_REV_D_SOURCING_VERIFICATION_KEYS_MISSING',
  report: report.files.json,
  markdown: report.files.markdown,
  partsChecked: report.summary.partsChecked,
  providersAttempted: report.summary.providersAttempted,
  apiVerified: report.summary.apiVerified,
  notChecked: report.summary.notChecked,
  exactBlocker: report.exactBlocker,
}, null, 2))

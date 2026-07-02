import { mkdir, appendFile } from 'node:fs/promises'
import path from 'node:path'

export async function appendAuditLog({ logDir, action, projectDir = null, result, blockedReason = null, license = devLicenseStatus(), protectedPathResult = null }) {
  if (!logDir) return null
  await mkdir(logDir, { recursive: true })
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    projectDir,
    result,
    blockedReason,
    license,
    protectedPathResult,
  }
  const file = path.join(logDir, 'BoardForge_Localhost_Service_Audit_Log.jsonl')
  await appendFile(file, `${JSON.stringify(entry)}\n`, 'utf8')
  return file
}

export function devLicenseStatus() {
  return {
    devMode: String(process.env.BOARDFORGE_DEV_LICENSE || '').toLowerCase() === 'true',
    licenseKeyPresent: Boolean(process.env.BOARDFORGE_LICENSE_KEY),
  }
}

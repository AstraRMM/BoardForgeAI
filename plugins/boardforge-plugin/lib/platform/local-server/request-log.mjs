import { mkdir, appendFile } from 'node:fs/promises'
import path from 'node:path'

export async function appendRequestLog({ logDir, route, method, status, ok, projectDir = null, artifactPaths = [] }) {
  if (!logDir) return null
  await mkdir(logDir, { recursive: true })
  const entry = {
    timestamp: new Date().toISOString(),
    method,
    route,
    projectDir,
    ok,
    status,
    artifactPaths,
  }
  const file = path.join(logDir, 'BoardForge_Localhost_Service_Request_Log.jsonl')
  await appendFile(file, `${JSON.stringify(entry)}\n`, 'utf8')
  return file
}

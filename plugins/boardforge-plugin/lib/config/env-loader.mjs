import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

export function parseDotEnv(text = '') {
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    env[key] = value
  }
  return env
}

export function loadBoardForgeEnv({ cwd = process.cwd(), includeProcess = true } = {}) {
  const files = ['.env', '.env.local']
  const loadedFiles = []
  const values = {}
  for (const file of files) {
    const filePath = path.join(cwd, file)
    if (!existsSync(filePath)) continue
    Object.assign(values, parseDotEnv(readFileSync(filePath, 'utf8')))
    loadedFiles.push(filePath)
  }
  // Explicit runtime configuration must win over checked-out local defaults.
  // This also lets CI and packaged launchers rotate supplier credentials safely.
  if (includeProcess) Object.assign(values, process.env)
  return { env: values, loadedFiles }
}

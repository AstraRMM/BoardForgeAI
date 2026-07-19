import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

export function createDigiKeyTokenStore({ filePath = path.join(process.cwd(), '.boardforge', 'digikey-token.json') } = {}) {
  return {
    filePath,
    readRaw() {
      if (!existsSync(filePath)) return null
      try { return JSON.parse(readFileSync(filePath, 'utf8')) } catch { return null }
    },
    read() {
      const token = this.readRaw()
      if (token?.expiresAt && Date.parse(token.expiresAt) <= Date.now()) return null
      return token
    },
    write(token) {
      mkdirSync(path.dirname(filePath), { recursive: true })
      writeFileSync(filePath, JSON.stringify(token, null, 2), { mode: 0o600 })
      return { stored: true, filePath }
    },
    clear() {
      this.write({ accessToken: null, expiresAt: new Date(0).toISOString() })
    },
  }
}

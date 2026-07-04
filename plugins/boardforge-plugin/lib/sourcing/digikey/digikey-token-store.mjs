import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

export function createDigiKeyTokenStore({ filePath = path.join(process.cwd(), '.boardforge', 'digikey-token.json') } = {}) {
  return {
    filePath,
    read() {
      if (!existsSync(filePath)) return null
      try {
        const token = JSON.parse(readFileSync(filePath, 'utf8'))
        if (token.expiresAt && Date.parse(token.expiresAt) <= Date.now()) return null
        return token
      } catch {
        return null
      }
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

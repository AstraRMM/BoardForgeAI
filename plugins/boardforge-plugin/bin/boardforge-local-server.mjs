#!/usr/bin/env node
import path from 'node:path'
import os from 'node:os'
import { mkdir } from 'node:fs/promises'
import { startBoardForgeLocalServer } from '../lib/platform/local-server/http-server.mjs'
import { DEFAULT_LOCAL_SERVER_PORT } from '../lib/platform/local-server/request-validator.mjs'

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1] || fallback
}

// Fixture folders are test inputs, never a user's project library.  The
// helper defaults to an empty, user-owned workspace unless --root explicitly
// names another local workspace.
const defaultWorkspace = path.join(os.homedir(), 'Documents', 'BoardForge', 'Projects')
const rootDir = path.resolve(argValue('--root', defaultWorkspace))
const port = Number(argValue('--port', String(DEFAULT_LOCAL_SERVER_PORT)))
await mkdir(rootDir, { recursive: true })
const server = startBoardForgeLocalServer({ rootDir, port })
const address = server.address()
console.log(JSON.stringify({
  status: 'BOARD_FORGE_LOCAL_SERVER_STARTED',
  url: `http://127.0.0.1:${address?.port || port}`,
  rootDir,
  localhostOnly: true,
}, null, 2))

import http from 'node:http'
import { readLocalEngineStatus } from './local-engine-status-reader.mjs'

export function createLocalEngineStatusServer(options = {}) {
  const projectDir = options.projectDir || process.cwd()
  return http.createServer((request, response) => {
    if (request.url !== '/status') {
      response.writeHead(404, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ error: 'not_found' }))
      return
    }
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify(readLocalEngineStatus(projectDir), null, 2))
  })
}

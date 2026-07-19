#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { startBoardForgeLocalServer } from '../lib/platform/local-server/http-server.mjs'

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1] || fallback
}

const rootDir = path.resolve(argValue('--root', 'C:\\Users\\luifi\\Desktop\\BoardForge_New_Board_Fixtures'))
const projectId = argValue('--project-id', 'BF-LOCALHOST-SERVICE-DEMO-01_REV_A')
const projectDir = path.join(rootDir, projectId)
const port = Number(argValue('--port', '38992'))
await mkdir(projectDir, { recursive: true })

const server = startBoardForgeLocalServer({ rootDir, port, logDir: path.join(projectDir, '.localhost-service') })
const baseUrl = `http://127.0.0.1:${port}`
const trace = []

try {
  const health = await call('GET', '/health')
  const intake = await call('POST', '/intake/start', {
    projectId,
    prompt: 'Make a compact odd-shaped robotics controller with USB-C, CAN, I2C, UART/GPS, SWD, PWM, mounting ears, and JLCPCB manufacturing.',
  })
  const intakeProjectId = intake.data.projectId
  if (!intakeProjectId) throw new Error('The intake start route did not return a project ID.')
  await call('POST', '/intake/answer', {
    projectId: intakeProjectId,
    answers: {
      controller_preference: 'STM32 recommended',
      interfaces_needed: 'USB CAN I2C UART PWM',
      power_input: 'USB-C plus external logic rail',
      board_shape: 'mounting ears odd outline',
      manufacturing_target: 'JLCPCB',
    },
  })
  await call('POST', '/brief/approve', { projectId: intakeProjectId })
  const create = await call('POST', '/project/create', { projectId: intakeProjectId, projectDir, oddShapeProof: true })
  const status = await call('GET', `/project/${encodeURIComponent(intakeProjectId)}/status?projectDir=${encodeURIComponent(projectDir)}`)
  const downloads = await call('GET', `/project/${encodeURIComponent(intakeProjectId)}/downloads?projectDir=${encodeURIComponent(projectDir)}`)
  const publishBlocked = await call('POST', `/project/${encodeURIComponent(intakeProjectId)}/publish`, { projectDir }, false)
  const publishOk = await call('POST', `/project/${encodeURIComponent(intakeProjectId)}/publish`, { projectDir, confirm: true })

  const validation = create.data.validation
  const report = [
    '# BoardForge Localhost Service Demo Report',
    '',
    `- Service: ${baseUrl}`,
    `- Health: ${health.status}`,
    `- Project: ${projectDir}`,
    `- DRC: ${validation.drc}`,
    `- ERC: ${validation.erc}`,
    `- Shorts: ${validation.shorts}`,
    `- Unconnected: ${validation.unconnected}`,
    `- Manufacturing package recorded: ${downloads.data.artifacts.package ? 'yes' : 'no'}`,
    `- Publish without confirm: ${publishBlocked.status}`,
    `- Publish with confirm: ${publishOk.status}`,
    '',
    'This proof was driven through localhost HTTP routes, not direct in-process artifact calls.',
  ].join('\n')

  const runLog = {
    status: 'BOARD_FORGE_LOCALHOST_SERVICE_DEMO_COMPLETED',
    baseUrl,
    projectDir,
    validation,
    manufacturingPackageRecorded: downloads.data.artifacts.package,
    publishGate: { withoutConfirm: publishBlocked.status, withConfirm: publishOk.status },
  }
  await writeFile(path.join(projectDir, 'BoardForge_Localhost_Service_Demo_Report.md'), report, 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_Localhost_Service_Run_Log.json'), JSON.stringify(runLog, null, 2), 'utf8')
  await writeFile(path.join(projectDir, 'BoardForge_Localhost_Service_API_Trace.json'), JSON.stringify(trace, null, 2), 'utf8')
  console.log(JSON.stringify(runLog, null, 2))
} finally {
  server.close()
}

async function call(method, route, body = null, throwOnError = true) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await response.json()
  trace.push({ method, route, request: body, response: json })
  if (throwOnError && !json.ok) throw new Error(`${method} ${route} failed: ${JSON.stringify(json.errors)}`)
  return json
}

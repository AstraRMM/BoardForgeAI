import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root=process.env.BOARDFORGE_50_BOARD_ROOT||String.raw`C:\Users\luifi\Downloads\BoardForge_50_Board_Challenge`

export async function executePilot() { return loadAcceptedPilot() }

export async function executeBoard(board) {
  if (board?.slug==='esp32-sensor-hub') return loadAcceptedPilot()
  return {
    acceptance:{status:'BOARD_REJECTED',accepted:false,blockers:[{code:'BOARD_CLASS_ENGINE_NOT_IMPLEMENTED',message:`No production generator is registered for ${board?.architectureClass||board?.slug}.`}]},
    failure:{code:'BOARD_CLASS_ENGINE_NOT_IMPLEMENTED',boardId:board?.id,architectureClass:board?.architectureClass},
  }
}

async function loadAcceptedPilot() {
  const projectDir=path.join(root,'001_ESP32_SENSOR_HUB','usb-c-esp32-sensor')
  const manifest=JSON.parse(await readFile(path.join(projectDir,'Evidence','BoardForge_Manufacturing_Evidence.json'),'utf8'))
  return {acceptance:manifest.acceptance,manufacturingEvidence:manifest}
}

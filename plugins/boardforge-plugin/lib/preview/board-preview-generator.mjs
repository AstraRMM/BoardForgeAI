import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { renderBoardSvg } from './board-svg-renderer.mjs'
import { createPreviewMetadata } from './preview-metadata.mjs'

export async function writeBoardPreview({ projectDir, projectName, outline = [], components = [], connectors = [], status = {} }) {
  await mkdir(projectDir, { recursive: true })
  const json = path.join(projectDir, 'BoardForge_Board_Preview.json')
  const svg = path.join(projectDir, 'BoardForge_Board_Preview.svg')
  const preview = { schema: 'boardforge.board-preview.v1', projectName, outline, components, connectors, status, metadata: createPreviewMetadata({ projectName, status, components, connectors }) }
  await writeFile(json, JSON.stringify(preview, null, 2), 'utf8')
  await writeFile(svg, renderBoardSvg(preview), 'utf8')
  return { json, svg, preview }
}

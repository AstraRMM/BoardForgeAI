import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

export async function writeBoardPreview({ projectDir, projectName, outline = [], components = [], connectors = [], status = {} }) {
  await mkdir(projectDir, { recursive: true })
  const json = path.join(projectDir, 'BoardForge_Board_Preview.json')
  const svg = path.join(projectDir, 'BoardForge_Board_Preview.svg')
  const preview = { schema: 'boardforge.board-preview.v1', projectName, outline, components, connectors, status }
  await writeFile(json, JSON.stringify(preview, null, 2), 'utf8')
  await writeFile(svg, previewSvg(preview), 'utf8')
  return { json, svg, preview }
}

function previewSvg(preview) {
  const points = preview.outline.map((p) => `${p.x},${p.y}`).join(' ')
  const components = preview.components.map((c) => `<rect x="${c.x - 3}" y="${c.y - 2}" width="6" height="4" rx="0.8" fill="#22c55e"><title>${c.ref}</title></rect>`).join('\n')
  const connectors = preview.connectors.map((c) => `<rect x="${c.x - 4}" y="${c.y - 1.5}" width="8" height="3" rx="0.5" fill="#38bdf8"><title>${c.ref}</title></rect>`).join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 70" width="900" height="700">
  <rect width="90" height="70" fill="#020617"/>
  <polygon points="${points}" fill="#1e293b" stroke="#f8fafc" stroke-width="0.5"/>
  ${components}
  ${connectors}
  <text x="5" y="65" fill="#cbd5e1" font-size="3">${preview.projectName} | DRC ${preview.status.drc} ERC ${preview.status.erc}</text>
</svg>
`
}

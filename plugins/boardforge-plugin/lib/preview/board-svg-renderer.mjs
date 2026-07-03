export function renderBoardSvg({ projectName = 'BoardForge Project', outline = [], components = [], connectors = [], status = {} }) {
  const points = outline.length ? outline.map((point) => `${point.x},${point.y}`).join(' ') : '5,5 95,5 95,65 5,65'
  const componentSvg = components.map((component, index) => `<rect x="${component.x || 20 + index * 12}" y="${component.y || 25}" width="10" height="7" rx="1" fill="#38bdf8"/><text x="${(component.x || 20 + index * 12) + 1}" y="${(component.y || 25) + 5}" font-size="2.5" fill="#00111f">${component.ref || `U${index + 1}`}</text>`).join('')
  const connectorSvg = connectors.map((connector, index) => `<rect x="${connector.x || 8 + index * 28}" y="${connector.y || 58}" width="12" height="4" fill="#f59e0b"/><text x="${connector.x || 8 + index * 28}" y="${(connector.y || 58) - 1}" font-size="2.5" fill="#e2e8f0">${connector.ref || `J${index + 1}`}</text>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 75" width="700" height="525">
  <rect width="100" height="75" fill="#020617"/>
  <polygon points="${points}" fill="#0f172a" stroke="#67e8f9" stroke-width="0.8"/>
  <circle cx="13" cy="13" r="3" fill="#111827" stroke="#f87171" stroke-width="0.7"/>
  <circle cx="87" cy="13" r="3" fill="#111827" stroke="#f87171" stroke-width="0.7"/>
  <circle cx="13" cy="62" r="3" fill="#111827" stroke="#f87171" stroke-width="0.7"/>
  <circle cx="87" cy="62" r="3" fill="#111827" stroke="#f87171" stroke-width="0.7"/>
  ${componentSvg}
  ${connectorSvg}
  <text x="6" y="72" font-size="3" fill="#cbd5e1">${projectName} | DRC ${status.drc ?? '?'} ERC ${status.erc ?? '?'} | ${status.manufacturing || 'LOCAL'}</text>
</svg>
`
}

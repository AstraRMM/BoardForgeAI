export function createPreviewMetadata({ projectName, status = {}, components = [], connectors = [] }) {
  return {
    projectName,
    status,
    componentCount: components.length,
    connectorCount: connectors.length,
    previewType: 'svg_approximation_from_local_artifacts',
    generatedAt: new Date().toISOString(),
  }
}

export function createWebProjectCard({ projectId, projectName, previewSvg, manufacturingZip, projectState, validation }) {
  return {
    schema: 'boardforge.web-project-card.v1',
    projectId,
    projectName,
    previewSvg,
    manufacturingZip,
    projectState,
    dashboardVisible: projectState === 'dashboard_published',
    validation,
  }
}

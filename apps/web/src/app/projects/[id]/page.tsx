import { AppShell } from '../../../components/app/AppShell'
import { ProjectWorkspaceLocalContent } from '../../../components/project/ProjectWorkspaceLocalContent'

export const dynamic = 'force-dynamic'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AppShell title="Project workspace" subtitle="Local project evidence, validation gates, and release state."><div className="bf-project-detail-page"><ProjectWorkspaceLocalContent projectId={id} /></div></AppShell>
}

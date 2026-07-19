import { AppShell } from '../../components/app/AppShell'
import { WorkspaceSettings } from '../../components/settings/WorkspaceSettings'
import { getAuthEnvironment } from '../../lib/auth'

export default function SettingsPage() {
  const auth = getAuthEnvironment()
  return <AppShell title="Workspace settings" subtitle="Configure browser preferences and pair a desktop helper for approved local actions.">
    <WorkspaceSettings authReady={auth.ready} missing={auth.missing} />
  </AppShell>
}

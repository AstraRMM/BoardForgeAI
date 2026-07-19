import { AppShell } from '../../components/app/AppShell'
import { NewBoardIntakeWorkspace } from '../../components/intake/NewBoardIntakeWorkspace'

export default function NewBoardPage() {
  return <NewBoardCommandCenter />
}

function NewBoardCommandCenter() {
  return <AppShell title="New board" subtitle="Capture intent, resolve requirements, and approve a local brief before candidate creation."><div className="bf-app-page bf-new-board-page"><NewBoardIntakeWorkspace /></div></AppShell>
}

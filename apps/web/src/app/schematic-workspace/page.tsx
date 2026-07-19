import { redirect } from 'next/navigation'

/** A project-bound schematic editor is not available yet; never surface a fixture as one. */
export default function SchematicWorkspacePage() {
  redirect('/projects')
}

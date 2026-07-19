import { redirect } from 'next/navigation'

export const metadata = { title: 'Projects · BoardForge' }

/** A project-bound PCB editor is not available yet; never surface a fixture as one. */
export default function PcbWorkspacePage() {
  redirect('/projects')
}

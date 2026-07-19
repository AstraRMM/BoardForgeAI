import { redirect } from 'next/navigation'

/** Pairing has one functional surface: the session-aware settings workspace. */
export default function PluginConnectPage() {
  redirect('/settings/plugin')
}

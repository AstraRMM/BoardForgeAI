import { redirect } from 'next/navigation'

export default function DeviceSettingsPage() {
  // Device registration has no backing API. Keep old bookmarks working without
  // presenting a non-functional account-management screen as product surface.
  redirect('/settings')
}

import { redirect } from 'next/navigation'

export default function BillingSettingsPage() {
  // There is no billing or entitlement service in this deployment. Preserve
  // compatibility while routing to the supported workspace configuration page.
  redirect('/settings')
}

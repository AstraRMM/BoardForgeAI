import { redirect } from 'next/navigation'

/** Readiness is evidence-backed, so it belongs to the single validation registry. */
export default function ReadinessPage() {
  redirect('/evidence')
}

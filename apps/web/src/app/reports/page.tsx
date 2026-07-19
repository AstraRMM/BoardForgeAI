import { redirect } from 'next/navigation'

/** Validation and evidence share one artifact registry rather than two summaries. */
export default function ReportsPage() {
  redirect('/evidence')
}

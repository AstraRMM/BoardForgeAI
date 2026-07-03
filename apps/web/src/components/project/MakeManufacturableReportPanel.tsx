import { MakeManufacturableButton } from './MakeManufacturableButton'

export function MakeManufacturableReportPanel() {
  return (
    <section className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
      <p className="text-sm uppercase tracking-wide text-emerald-300">Make Manufacturable</p>
      <h2 className="mt-1 text-xl font-semibold text-emerald-50">Validate, repair, review, diff, export</h2>
      <p className="mt-2 text-sm text-emerald-100">Runs only on safe local candidates or sandbox copies. Protected/source projects are never mutated.</p>
      <div className="mt-3"><MakeManufacturableButton /></div>
    </section>
  )
}

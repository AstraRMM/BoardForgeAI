import { AlternativePartsPanel } from './AlternativePartsPanel'
import { BomVerificationTable } from './BomVerificationTable'
import { MakeSourcableButton } from './MakeSourcableButton'
import { MakeSourcableReportPanel } from './MakeSourcableReportPanel'
import { QuoteReadinessPanel } from './QuoteReadinessPanel'
import { SupplierMatrixPanel } from './SupplierMatrixPanel'

const actions = [
  ['Check DigiKey Status', 'digikey_provider_health'],
  ['Run DigiKey Verification', 'sourcing_verify'],
  ['Run Quote Readiness', 'quote_readiness'],
  ['Find Alternative Parts', 'alternative_parts'],
  ['Make Sourcable', 'make_sourcable'],
  ['Refresh Sourcing Reports', 'sourcing_verify'],
  ['Open Supplier Matrix', 'supplier_matrix'],
  ['Open Proposed Substitution Plan', 'make_sourcable'],
]

export function SourcingCommandCenter({ project }: { project?: any }) {
  const sourcing = project?.sourcing || {}
  return (
    <section className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-cyan-100">Sourcing Command Center</h2>
          <p className="mt-1 text-sm text-cyan-100/80">Live website connected to installed local engine. No fake stock, no browser-exposed supplier secrets, no silent mock fallback.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map(([label, job]) => <button key={label} data-job-type={job} className="rounded border border-cyan-300 px-3 py-2 text-sm text-cyan-100" type="button">{label}</button>)}
          <MakeSourcableButton />
        </div>
      </div>
      <p className="mt-3 rounded border border-cyan-300/30 bg-slate-950 p-2 text-xs text-cyan-100">Each action checks pairing/local engine status, starts a job-backed local-engine action, polls logs, refreshes artifacts, and reports exact redacted blockers if DigiKey or local services fail.</p>
      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <div className="rounded bg-slate-950 p-2"><dt className="text-slate-500">DigiKey</dt><dd className="font-semibold">{humanize(sourcing.digikeyStatus || 'Ready when local credentials exist')}</dd></div>
        <div className="rounded bg-slate-950 p-2"><dt className="text-slate-500">DigiKey Auth</dt><dd className="font-semibold">{sourcing.digikeyAuthenticated ? 'Authenticated through local engine' : 'Local token required'}</dd></div>
        <div className="rounded bg-slate-950 p-2"><dt className="text-slate-500">Live Lookup</dt><dd className="font-semibold">{humanize(sourcing.liveLookupStatus || 'Run verification')}</dd></div>
        <div className="rounded bg-slate-950 p-2"><dt className="text-slate-500">Mouser</dt><dd className="font-semibold">{humanize(sourcing.mouserStatus || 'Ready when local credentials exist')}</dd></div>
        <div className="rounded bg-slate-950 p-2"><dt className="text-slate-500">Mouser Live Lookup</dt><dd className="font-semibold">{humanize(sourcing.mouserLiveLookupStatus || 'Run Mouser verification')}</dd></div>
        <div className="rounded bg-slate-950 p-2"><dt className="text-slate-500">Quote</dt><dd className="font-semibold">{humanize(sourcing.quoteReadiness || 'Not verified yet')}</dd></div>
        <div className="rounded bg-slate-950 p-2"><dt className="text-slate-500">Assembly</dt><dd className="font-semibold">{humanize(sourcing.state || 'Assembly not verified yet')}</dd></div>
      </dl>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-cyan-100">BOM Verification</h3>
          <BomVerificationTable rows={sourcing.rows || []} />
        </div>
        <SupplierMatrixPanel matrix={sourcing.supplierMatrix} />
        <QuoteReadinessPanel report={sourcing.quoteReport} />
        <AlternativePartsPanel alternatives={sourcing.alternatives || []} />
        <MakeSourcableReportPanel report={sourcing.makeSourcableReport} />
      </div>
    </section>
  )
}

function humanize(value: string) {
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

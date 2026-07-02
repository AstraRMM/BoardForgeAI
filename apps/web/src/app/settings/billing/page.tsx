export default function BillingSettingsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100">
      <h1 className="text-3xl font-semibold">Billing and License</h1>
      <p className="mt-3 max-w-3xl text-slate-400">
        BoardForge alpha separates local license checks from project publishing. Development runs can use
        <code className="mx-1 rounded bg-slate-900 px-1">BOARDFORGE_DEV_LICENSE=true</code>; production billing is not faked.
      </p>
    </main>
  )
}

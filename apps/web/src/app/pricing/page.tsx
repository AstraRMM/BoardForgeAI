export default function PricingPage() {
  return <main className="min-h-screen bg-slate-950 px-8 py-8 text-slate-100"><h1 className="text-3xl font-semibold">Pricing</h1><div className="mt-6 grid gap-4 md:grid-cols-3"><Tier name="Starter" price="Annual license" /><Tier name="Pro" price="Advanced routing" /><Tier name="Team" price="Shared workflows" /></div></main>
}

function Tier({ name, price }: { name: string; price: string }) {
  return <section className="rounded-lg border border-slate-800 bg-slate-900 p-4"><h2 className="text-xl font-semibold">{name}</h2><p className="mt-2 text-slate-400">{price}</p></section>
}

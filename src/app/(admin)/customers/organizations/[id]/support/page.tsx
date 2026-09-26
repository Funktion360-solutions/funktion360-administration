import Link from "next/link";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/customers/organizations/${id}`}
          className="text-xs text-black/45 hover:text-black"
        >
          ← Tilbage til kundeoverblik
        </Link>

        <div className="mt-4 font-mono text-xs uppercase tracking-[0.16em] text-black/40">
          Customer 360
        </div>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Support
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-black/55">
          Supporthistorik, tickets og tekniske eskalationer.
        </p>
      </div>

      <section className="rounded-2xl border border-dashed border-black/15 bg-white/50 p-6">
        <div className="font-mono text-xs uppercase tracking-[0.14em] text-black/35">
          Modul under opbygning
        </div>

        <p className="mt-2 text-sm text-black/50">
          Funktionaliteten flyttes hertil fra den eksisterende Customer 360-side
          i de næste trin.
        </p>
      </section>
    </div>
  );
}

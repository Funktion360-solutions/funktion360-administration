import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { data: people },
    { data: organizations },
    { data: products },
    { data: plans },
    { data: prices },
  ] = await Promise.all([
    supabase.rpc("list_crm_people"),
    supabase.rpc("list_crm_organizations"),
    supabase.rpc("list_crm_products"),
    supabase.rpc("list_crm_product_plans"),
    supabase.rpc("list_crm_product_plan_prices"),
  ]);

  const metrics = [
    {
      label: "Personer",
      value: people?.length ?? 0,
      description: "Aktive CRM-personer",
    },
    {
      label: "Organisationer",
      value: organizations?.length ?? 0,
      description: "Organisationer i CRM",
    },
    {
      label: "Produkter",
      value: products?.length ?? 0,
      description: "Produkter i kataloget",
    },
    {
      label: "Produktplaner",
      value: plans?.length ?? 0,
      description: "Kommercielle planer",
    },
    {
      label: "Priskomponenter",
      value: prices?.length ?? 0,
      description: "Registrerede priser",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-black/45">
          Overblik
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-black/55">
          Centralt overblik over Funktion360s kunder,
          produkter og kommercielle struktur.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-black/10 bg-white p-5"
          >
            <p className="text-sm font-medium text-black/55">
              {metric.label}
            </p>

            <p className="mt-4 text-3xl font-semibold tracking-tight">
              {metric.value}
            </p>

            <p className="mt-2 text-xs text-black/45">
              {metric.description}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-black/10 bg-white p-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/40">
            Commercial operations
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Funktion360 Control Plane
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">
            Dashboardet bliver centrum for salg, kontrakter,
            abonnementer, licenser, fakturering, support og
            drift på tværs af Funktion360s produkter.
          </p>
        </section>

        <section className="rounded-2xl border border-black/10 bg-[#202120] p-6 text-white">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#cfff69]">
            System
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Administration online
          </h2>

          <p className="mt-3 text-sm leading-6 text-white/55">
            CRM, RBAC og produktkatalog er forbundet til
            Funktion360-infrastrukturen.
          </p>
        </section>
      </div>
    </div>
  );
}

import Link from "next/link";
import { createPerson } from "@/app/actions/people";
import { createClient } from "@/lib/supabase/server";

type CrmPerson = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  primary_email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  active: "Aktiv",
  inactive: "Inaktiv",
  lead: "Lead",
  prospect: "Prospect",
  customer: "Kunde",
};

export default async function PeoplePage() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("list_crm_people");

  if (error) {
    throw new Error(`People query failed: ${error.message}`);
  }

  const people = (data ?? []) as CrmPerson[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-black/45">
            Kunder
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Personer
          </h1>

          <p className="mt-2 text-sm text-black/55">
            Centralt personregister på tværs af Funktion360s produkter,
            systemer og kunderelationer.
          </p>
        </div>

        <div className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm">
          <strong>{people.length}</strong>
          <span className="ml-2 text-black/45">personer</span>
        </div>
      </div>

      <section className="rounded-2xl border border-black/10 bg-white p-6">
        <div className="mb-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/40">
            CRM
          </p>

          <h2 className="mt-2 text-lg font-semibold">
            Opret person
          </h2>

          <p className="mt-1 text-sm text-black/50">
            Tilføj en ny person til det centrale CRM.
          </p>
        </div>

        <form
          action={createPerson}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
        >
          <input
            name="first_name"
            placeholder="Fornavn"
            required
            className="rounded-xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm outline-none transition focus:border-black/30"
          />

          <input
            name="last_name"
            placeholder="Efternavn"
            className="rounded-xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm outline-none transition focus:border-black/30"
          />

          <input
            name="email"
            type="email"
            placeholder="E-mail"
            className="rounded-xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm outline-none transition focus:border-black/30"
          />

          <input
            name="phone"
            type="tel"
            placeholder="Telefon"
            className="rounded-xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm outline-none transition focus:border-black/30"
          />

          <button
            type="submit"
            className="rounded-xl bg-[#202120] px-5 py-3 text-sm font-medium text-white transition hover:bg-black"
          >
            Opret person
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/40">
              Personregister
            </p>

            <h2 className="mt-2 text-lg font-semibold">
              CRM-personer
            </h2>
          </div>

          <span className="text-xs text-black/40">
            Vælg en person for at åbne den samlede profil
          </span>
        </div>

        {people.length > 0 ? (
          <div className="divide-y divide-black/10">
            {people.map((person) => {
              const fullName =
                [person.first_name, person.last_name]
                  .filter(Boolean)
                  .join(" ") ||
                person.primary_email ||
                "Unavngiven person";

              return (
                <Link
                  key={person.id}
                  href={`/customers/people/${person.id}`}
                  className="group grid gap-4 px-6 py-5 transition hover:bg-black/[0.02] md:grid-cols-[1.2fr_1.4fr_1fr_auto] md:items-center"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {fullName}
                    </p>

                    <p className="mt-1 font-mono text-[10px] text-black/30">
                      {person.id}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-black/40">
                      E-mail
                    </p>

                    <p className="mt-1 truncate text-sm">
                      {person.primary_email ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-black/40">
                      Telefon
                    </p>

                    <p className="mt-1 text-sm">
                      {person.phone ?? "—"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <span className="rounded-full bg-[#cfff69]/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide">
                      {statusLabels[person.status] ?? person.status}
                    </span>

                    <span className="text-lg text-black/25 transition group-hover:translate-x-1 group-hover:text-black">
                      →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-black/45">
            Ingen personer oprettet endnu.
          </div>
        )}
      </section>
    </div>
  );
}

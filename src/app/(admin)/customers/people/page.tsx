import {
  createPerson,
  deletePerson,
  updatePerson,
} from "@/app/actions/people";
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

export default async function PeoplePage() {
  const supabase = await createClient();

  const { data: people, error } = await supabase.rpc(
    "list_crm_people"
  );

  if (error) {
    throw new Error(`People query failed: ${error.message}`);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-black/45">
            Kunder
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Personer
          </h1>

          <p className="mt-2 text-sm text-black/55">
            Administrér personer på tværs af Funktion360s produkter
            og kunderelationer.
          </p>
        </div>

        <div className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm">
          <strong>{people?.length ?? 0}</strong>
          <span className="ml-2 text-black/45">personer</span>
        </div>
      </div>

      <section className="rounded-2xl border border-black/10 bg-white p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">
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
        <div className="border-b border-black/10 px-6 py-5">
          <h2 className="text-lg font-semibold">
            CRM-personer
          </h2>
        </div>

        {people && people.length > 0 ? (
          <div className="divide-y divide-black/10">
            {people.map((person: CrmPerson) => (
              <div
                key={person.id}
                className="p-6"
              >
                <form
                  action={updatePerson}
                  className="grid gap-3 lg:grid-cols-[1fr_1fr_1.4fr_1fr_auto]"
                >
                  <input
                    type="hidden"
                    name="id"
                    value={person.id}
                  />

                  <input
                    name="first_name"
                    defaultValue={person.first_name ?? ""}
                    required
                    aria-label="Fornavn"
                    className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />

                  <input
                    name="last_name"
                    defaultValue={person.last_name ?? ""}
                    aria-label="Efternavn"
                    className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />

                  <input
                    name="email"
                    type="email"
                    defaultValue={person.primary_email ?? ""}
                    aria-label="E-mail"
                    className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />

                  <input
                    name="phone"
                    type="tel"
                    defaultValue={person.phone ?? ""}
                    aria-label="Telefon"
                    className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />

                  <button
                    type="submit"
                    className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium transition hover:bg-black/[0.04]"
                  >
                    Gem
                  </button>
                </form>

                <div className="mt-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-[#cfff69] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide">
                      {person.status}
                    </span>

                    <span className="font-mono text-[10px] text-black/35">
                      {person.id}
                    </span>
                  </div>

                  <form action={deletePerson}>
                    <input
                      type="hidden"
                      name="id"
                      value={person.id}
                    />

                    <button
                      type="submit"
                      className="text-xs font-medium text-red-700 transition hover:text-red-900"
                    >
                      Slet person
                    </button>
                  </form>
                </div>
              </div>
            ))}
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

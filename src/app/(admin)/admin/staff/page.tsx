import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

type StaffRole = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  assigned_at: string;
};

type StaffUser = {
  id: string;
  auth_user_id: string;
  display_name: string;
  email: string;
  status: string;
  created_at: string;
  updated_at: string;
  roles: StaffRole[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "medium",
    timeZone: "Europe/Copenhagen",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: string }) {
  const label =
    status === "active"
      ? "Aktiv"
      : status === "inactive"
        ? "Inaktiv"
        : status;

  return (
    <span className="inline-flex rounded-full border border-black/10 px-2.5 py-1 text-xs font-medium">
      {label}
    </span>
  );
}

export default async function StaffPage() {
  await requirePermission("staff.read");

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("list_crm_staff_users");

  const staffUsers = (data ?? []) as StaffUser[];

  const activeCount = staffUsers.filter(
    (staff) => staff.status === "active"
  ).length;

  const roleCount = new Set(
    staffUsers.flatMap((staff) => staff.roles.map((role) => role.id))
  ).size;

  return (
    <main className="space-y-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-black/50">
          Administration / Adgangsstyring
        </p>

        <div className="mt-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Medarbejdere
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/60">
            Administrativ oversigt over medarbejdere med adgang til Funktion360
            Administration og deres tildelte roller.
          </p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-black/45">
            Medarbejdere
          </p>
          <p className="mt-2 text-2xl font-semibold">{staffUsers.length}</p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-black/45">
            Aktive
          </p>
          <p className="mt-2 text-2xl font-semibold">{activeCount}</p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-black/45">
            Roller i brug
          </p>
          <p className="mt-2 text-2xl font-semibold">{roleCount}</p>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-semibold">
            Medarbejderne kunne ikke indlæses
          </h2>

          <p className="mt-2 text-sm text-black/60">
            {error.message}
          </p>
        </section>
      ) : staffUsers.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center">
          <h2 className="font-semibold">Ingen medarbejdere fundet</h2>
          <p className="mt-2 text-sm text-black/55">
            Medarbejdere med administrativ adgang vises her.
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-black/10 bg-black/[0.025]">
                <tr>
                  <th className="px-4 py-3 font-medium text-black/55">
                    Medarbejder
                  </th>
                  <th className="px-4 py-3 font-medium text-black/55">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium text-black/55">
                    Roller
                  </th>
                  <th className="px-4 py-3 font-medium text-black/55">
                    Oprettet
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/[0.07]">
                {staffUsers.map((staff) => (
                  <tr key={staff.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-medium">{staff.display_name}</p>
                      <p className="mt-1 text-xs text-black/45">
                        {staff.email}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge status={staff.status} />
                    </td>

                    <td className="px-4 py-4">
                      {staff.roles.length > 0 ? (
                        <div className="flex max-w-xl flex-wrap gap-1.5">
                          {staff.roles.map((role) => (
                            <span
                              key={role.id}
                              title={role.description ?? undefined}
                              className="inline-flex rounded-full bg-black/[0.055] px-2.5 py-1 text-xs font-medium"
                            >
                              {role.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-black/40">Ingen roller</span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-black/60">
                      {formatDate(staff.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

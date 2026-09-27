import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

type Permission = {
  id: string;
  key: string;
  description: string | null;
};

type Role = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  created_at: string;
  staff_count: number;
  permissions: Permission[];
};

function formatPermissionKey(value: string) {
  const [domain, action] = value.split(".");

  if (!action) {
    return value;
  }

  return `${domain} · ${action}`;
}

export default async function RolesPage() {
  await requirePermission("staff.read");

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("list_crm_roles");

  const roles = (data ?? []) as Role[];

  const permissionKeys = new Set(
    roles.flatMap((role) =>
      role.permissions.map((permission) => permission.key)
    )
  );

  const assignedStaff = roles.reduce(
    (sum, role) => sum + Number(role.staff_count),
    0
  );

  return (
    <main className="space-y-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-black/50">
          Administration / Adgangsstyring
        </p>

        <div className="mt-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Roller & rettigheder
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/60">
            Oversigt over Funktion360s rollebaserede adgangsstyring og de
            rettigheder, der er tildelt hver administrativ rolle.
          </p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-black/45">
            Roller
          </p>
          <p className="mt-2 text-2xl font-semibold">{roles.length}</p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-black/45">
            Rettigheder i brug
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {permissionKeys.size}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-black/45">
            Rolletildelinger
          </p>
          <p className="mt-2 text-2xl font-semibold">{assignedStaff}</p>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-semibold">
            Roller og rettigheder kunne ikke indlæses
          </h2>

          <p className="mt-2 text-sm text-black/60">{error.message}</p>
        </section>
      ) : roles.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center">
          <h2 className="font-semibold">Ingen roller fundet</h2>
        </section>
      ) : (
        <section className="grid gap-4">
          {roles.map((role) => (
            <article
              key={role.id}
              className="rounded-2xl border border-black/10 bg-white"
            >
              <div className="flex flex-col gap-4 border-b border-black/[0.07] p-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{role.name}</h2>

                    {role.is_system_role ? (
                      <span className="rounded-full bg-black/[0.055] px-2.5 py-1 text-xs font-medium">
                        Systemrolle
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 font-mono text-xs text-black/45">
                    {role.key}
                  </p>

                  {role.description ? (
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-black/60">
                      {role.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex gap-6 text-sm">
                  <div>
                    <p className="text-xs text-black/45">Medarbejdere</p>
                    <p className="mt-1 font-semibold">
                      {Number(role.staff_count)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-black/45">Rettigheder</p>
                    <p className="mt-1 font-semibold">
                      {role.permissions.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <h3 className="text-xs font-medium uppercase tracking-wide text-black/45">
                  Tildelte rettigheder
                </h3>

                {role.permissions.length === 0 ? (
                  <p className="mt-3 text-sm text-black/45">
                    Rollen har ingen tildelte rettigheder.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {role.permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="rounded-xl border border-black/[0.08] bg-black/[0.018] p-3"
                      >
                        <p className="font-mono text-xs font-medium">
                          {formatPermissionKey(permission.key)}
                        </p>

                        {permission.description ? (
                          <p className="mt-1.5 text-xs leading-5 text-black/50">
                            {permission.description}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

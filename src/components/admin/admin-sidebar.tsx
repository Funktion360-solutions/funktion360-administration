import Link from "next/link";
import { adminNavigation } from "@/lib/navigation/admin-navigation";
import { LogoutButton } from "@/components/admin/logout-button";

type AdminSidebarProps = {
  staff: {
    display_name: string;
    email: string;
    roles: string[];
  };
};

export function AdminSidebar({
  staff,
}: AdminSidebarProps) {
  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-white/10 bg-[#202120] text-white">
      <div className="border-b border-white/10 px-6 py-6">
        <Link href="/" className="block">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#cfff69] font-mono text-sm font-bold text-[#202120]">
              F
            </div>

            <div>
              <p className="text-sm font-semibold tracking-tight">
                Funktion360
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                Administration
              </p>
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-6">
          {adminNavigation.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
                {group.label}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.07] hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/[0.05] p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#cfff69] text-sm font-semibold text-[#202120]">
              {staff.display_name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {staff.display_name}
              </p>

              <p className="truncate text-xs text-white/45">
                {staff.email}
              </p>

              <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-[#cfff69]">
                {staff.roles.join(", ")}
              </p>
            </div>
          </div>

          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}

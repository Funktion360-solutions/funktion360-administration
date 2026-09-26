import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

type AdminShellProps = {
  children: ReactNode;
  staff: {
    display_name: string;
    email: string;
    roles: string[];
  };
};

export function AdminShell({
  children,
  staff,
}: AdminShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f0] text-[#202120]">
      <AdminSidebar staff={staff} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-black/10 bg-white px-6">
          <div>
            <p className="text-sm font-semibold">
              Funktion360 Administration
            </p>

            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">
              Internal operations
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-black/55">
              Production
            </span>

            <span className="rounded-full bg-[#cfff69] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide">
              Internal
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

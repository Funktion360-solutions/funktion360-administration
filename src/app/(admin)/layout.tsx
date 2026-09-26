import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaff } from "@/lib/auth/require-staff";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const staff = await requireStaff();

  return (
    <AdminShell staff={staff}>
      {children}
    </AdminShell>
  );
}

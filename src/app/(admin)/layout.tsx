import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaff } from "@/lib/auth/require-staff";
import { requireStaffMfa } from "@/lib/auth/require-staff-mfa";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const staff = await requireStaff();
  await requireStaffMfa();

  return (
    <AdminShell staff={staff}>
      {children}
    </AdminShell>
  );
}

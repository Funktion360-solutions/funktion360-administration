import { redirect } from "next/navigation";
import {
  requireStaff,
  type CurrentStaff,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

export async function requirePermission(
  permission: string
): Promise<CurrentStaff> {
  const staff = await requireStaff();

  const normalizedPermission = permission.trim();

  if (!normalizedPermission) {
    throw new Error("Permission key is required");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "current_user_has_permission",
    {
      required_permission: normalizedPermission,
    }
  );

  if (error) {
    console.error("Permission check failed", {
      permission: normalizedPermission,
      code: error.code,
      message: error.message,
    });

    redirect("/?error=permission-check-failed");
  }

  if (data !== true) {
    redirect("/?error=forbidden");
  }

  return staff;
}

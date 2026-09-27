"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/require-permission";
import { runSystemHealthCheck } from "@/lib/operations/health-checks";
import { createClient } from "@/lib/supabase/server";

export async function runAdministrationHealthCheck() {
  await requirePermission("systems.health");

  const supabase = await createClient();

  const { error: aalError } = await supabase.rpc(
    "require_crm_critical_action_aal2"
  );

  if (aalError) {
    throw new Error(
      `AAL2 verification required: ${aalError.message}`
    );
  }

  const result = await runSystemHealthCheck(
    "funktion360-administration"
  );

  revalidatePath("/systems/status");
  revalidatePath("/systems/integrations");

  return result;
}

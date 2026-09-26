import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentStaff = {
  staff_user_id: string;
  display_name: string;
  email: string;
  status: string;
  roles: string[];
};

export async function requireStaff(): Promise<CurrentStaff> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data, error } = await supabase.rpc(
    "get_current_staff_status"
  );

  if (error || !data || data.length !== 1) {
    await supabase.auth.signOut();
    redirect("/login?error=unauthorized");
  }

  return data[0] as CurrentStaff;
}

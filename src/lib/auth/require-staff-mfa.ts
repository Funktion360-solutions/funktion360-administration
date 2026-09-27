import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireStaffMfa(): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  /*
   * get_crm_auth_policy() only returns data for an authenticated,
   * active staff account and fails closed for the MFA policy.
   */
  const { data: policyData, error: policyError } =
    await supabase.rpc("get_crm_auth_policy");

  if (
    policyError ||
    !policyData ||
    policyData.length !== 1
  ) {
    await supabase.auth.signOut();
    redirect("/login?error=security-policy");
  }

  const mfaRequired =
    policyData[0].staff_mfa_required === true;

  if (!mfaRequired) {
    return;
  }

  /*
   * Supabase places the Authentication Assurance Level in the JWT.
   * Admin access is allowed only when the current session is AAL2
   * while the staff MFA policy is enabled.
   */
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  const aal = claimsData.claims.aal;

  if (aal === "aal2") {
    return;
  }

  /*
   * The login MFA page determines whether the account has a verified
   * factor. If not, the enrollment flow will handle setup.
   */
  redirect("/login/mfa");
}

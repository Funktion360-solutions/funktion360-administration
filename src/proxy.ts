import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (["/api/identity/products", "/api/identity/memberships", "/api/webhooks/resend", "/api/webhooks/stripe", "/api/webhooks/payment-warnings"].includes(request.nextUrl.pathname)) return;
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

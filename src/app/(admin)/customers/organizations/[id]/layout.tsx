import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerNavigation } from "@/components/customer-360/customer-navigation";
import { createClient } from "@/lib/supabase/server";

type Organization = {
  id: string;
  name: string;
  organization_type: string;
  status: string;
};

const organizationTypeLabels: Record<string, string> = {
  company: "Virksomhed",
  municipality: "Kommune",
  region: "Region",
  association: "Forening",
  public_authority: "Offentlig myndighed",
  nonprofit: "Nonprofit",
  other: "Andet",
};

const statusLabels: Record<string, string> = {
  lead: "Lead",
  prospect: "Prospect",
  customer: "Kunde",
  inactive: "Inaktiv",
};

export default async function CustomerLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_crm_organization", {
    target_organization_id: id,
  });

  if (error) {
    throw new Error(
      `Kunne ikke hente organisation til Customer 360: ${error.message}`
    );
  }

  const organization = (
    Array.isArray(data) ? data[0] : data
  ) as Organization | null;

  if (!organization) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/customers/organizations"
          className="text-xs text-black/45 transition-colors hover:text-black"
        >
          ← Organisationer
        </Link>

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.16em] text-black/40">
              Customer 360
            </div>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {organization.name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-black/50">
              <span>
                {organizationTypeLabels[organization.organization_type] ??
                  organization.organization_type}
              </span>

              <span aria-hidden="true">·</span>

              <span className="rounded-full bg-[#cfff69] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-[#202120]">
                {statusLabels[organization.status] ?? organization.status}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <CustomerNavigation organizationId={organization.id} />
        </div>
      </header>

      {children}
    </div>
  );
}

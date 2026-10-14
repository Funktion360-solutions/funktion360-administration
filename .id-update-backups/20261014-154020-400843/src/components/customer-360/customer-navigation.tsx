"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type CustomerNavigationProps = {
  organizationId: string;
};

export function CustomerNavigation({
  organizationId,
}: CustomerNavigationProps) {
  const pathname = usePathname();

  const basePath = `/customers/organizations/${organizationId}`;

  const items = [
    {
      label: "Overblik",
      href: basePath,
      active: pathname === basePath,
    },
    {
      label: "Kontakter",
      href: `${basePath}/contacts`,
      active: pathname.startsWith(`${basePath}/contacts`),
    },
    {
      label: "Produkter & licenser",
      href: `${basePath}/products`,
      active: pathname.startsWith(`${basePath}/products`),
    },
    {
      label: "Salg",
      href: `${basePath}/sales`,
      active: pathname.startsWith(`${basePath}/sales`),
    },
    {
      label: "Kontrakter",
      href: `${basePath}/contracts`,
      active: pathname.startsWith(`${basePath}/contracts`),
    },
    {
      label: "Fakturering",
      href: `${basePath}/billing`,
      active: pathname.startsWith(`${basePath}/billing`),
    },
    {
      label: "Support",
      href: `${basePath}/support`,
      active: pathname.startsWith(`${basePath}/support`),
    },
    {
      label: "Aktivitet",
      href: `${basePath}/activity`,
      active: pathname.startsWith(`${basePath}/activity`),
    },
  ];

  return (
    <nav
      aria-label="Customer 360"
      className="overflow-x-auto border-b border-black/10"
    >
      <div className="flex min-w-max gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "border-b-2 px-3 py-3 text-sm transition-colors",
              item.active
                ? "border-[#202120] font-semibold text-[#202120]"
                : "border-transparent text-black/45 hover:text-black",
            ].join(" ")}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export type AdminNavigationItem = {
  label: string;
  href: string;
};

export type AdminNavigationGroup = {
  label: string;
  items: AdminNavigationItem[];
};

export const adminNavigation: AdminNavigationGroup[] = [
  {
    label: "Overblik",
    items: [
      {
        label: "Dashboard",
        href: "/",
      },
    ],
  },
  {
    label: "Kunder",
    items: [
      {
        label: "Personer",
        href: "/customers/people",
      },
      {
        label: "Organisationer",
        href: "/customers/organizations",
      },
    ],
  },
  {
    label: "Salg",
    items: [
      {
        label: "Pipeline",
        href: "/sales/pipeline",
      },
      {
        label: "Tilbud",
        href: "/sales/quotes",
      },
    ],
  },
  {
    label: "Aftaler",
    items: [
      {
        label: "Kontrakter",
        href: "/contracts",
      },
      {
        label: "Abonnementer & licenser",
        href: "/subscriptions",
      },
      {
        label: "Fakturering",
        href: "/billing",
      },
    ],
  },
  {
    label: "Produkter",
    items: [
      {
        label: "Produktkatalog",
        href: "/products",
      },
      {
        label: "Planer & priser",
        href: "/products/plans",
      },
    ],
  },
  {
    label: "Support",
    items: [
      {label:"Indbakke",href:"/support/inbox"},
      {
        label: "Supportsager",
        href: "/support/tickets",
      },
      {
        label: "Vidensbase",
        href: "/support/knowledge",
      },
    ],
  },
  {
    label: "Drift",
    items: [
      {
        label: "Opgaver",
        href: "/tasks",
      },
      {
        label: "Integrationer",
        href: "/systems/integrations",
      },
      {
        label: "Synkronisering",
        href: "/systems/sync",
      },
      {
        label: "Systemstatus",
        href: "/systems/status",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "Medarbejdere",
        href: "/admin/staff",
      },
      {
        label: "Roller & rettigheder",
        href: "/admin/roles",
      },
      {
        label: "Sikkerhed",
        href: "/admin/security",
      },
      {
        label: "Auditlog",
        href: "/admin/audit",
      },
      {
        label: "GDPR",
        href: "/admin/privacy",
      },
    ],
  },
];

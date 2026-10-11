export type SupportCase = {
  id: string;
  case_number: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  person_name: string | null;
  organization_name: string | null;
  person_id: string | null;
  created_at: string;
};
export type SupportMessage = {
  id: string;
  body: string;
  message_type: string;
  author_staff_name: string | null;
  author_person_name: string | null;
  created_at: string;
};
export type OutboxEmail = {
  id: string;
  support_case_id: string;
  recipient: string;
  sender: string;
  reply_to: string;
  subject: string;
  body: string;
  html_body?: string | null;
  status: string;
  provider_id: string | null;
  created_at: string;
  retry_allowed?: boolean;
};
export const statusLabels: Record<string, string> = {
  new: "Ny",
  open: "Åben",
  waiting_customer: "Afventer kunde",
  waiting_internal: "Afventer internt",
  resolved: "Løst",
  closed: "Lukket",
  cancelled: "Annulleret",
};

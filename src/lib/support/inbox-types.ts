export type InboxMail = {
  id: string;
  provider_id: string;
  sender: string;
  subject: string;
  body: string;
  status: string;
  received_at: string;
  support_case_id: string | null;
  attachment_count: number;
  authenticated_sender: boolean;
};
export const deliveryLabels: Record<string, string> = {
  "email.sent": "Accepteret af Resend",
  "email.delivered": "Leveret til kundens mailserver",
  "email.delivery_delayed": "Levering forsinket",
  "email.bounced": "Afvist af kundens mailserver",
  "email.failed": "Afsendelse fejlede",
  "email.complained": "Markeret som spam",
  "email.suppressed": "Afsendelse blokeret",
};

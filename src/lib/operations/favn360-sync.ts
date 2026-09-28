import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  listFavn360CrmIdentities,
  type Favn360CrmCursor,
} from "@/lib/operations/favn360-crm";
import {
  runSync,
  type SyncTriggerType,
} from "@/lib/operations/sync-runs";

const INTEGRATION_KEY = "favn360-crm-api";
const PAGE_SIZE = 500;

type SyncFavn360IdentitiesInput = {
  triggerType?: SyncTriggerType;
  triggeredByStaffUserId?: string | null;
};

export async function syncFavn360Identities({
  triggerType = "system",
  triggeredByStaffUserId = null,
}: SyncFavn360IdentitiesInput = {}) {
  return runSync({
    integrationKey: INTEGRATION_KEY,
    syncType: "full",
    triggerType,
    triggeredByStaffUserId,
    metadata: {
      source_system: "favn360",
      contract_version: 1,
      page_size: PAGE_SIZE,
    },

    execute: async () => {
      const supabase = createAdminClient();

      let cursor: Favn360CrmCursor | null = null;
      let pagesProcessed = 0;

      let recordsDiscovered = 0;
      let recordsProcessed = 0;
      let recordsSucceeded = 0;
      let recordsFailed = 0;

      const failedExternalUserIds: string[] = [];

      do {
        const page = await listFavn360CrmIdentities({
          cursor,
          limit: PAGE_SIZE,
        });

        pagesProcessed += 1;
        recordsDiscovered += page.identities.length;

        for (const identity of page.identities) {
          recordsProcessed += 1;

          const { error } = await supabase.rpc(
            "upsert_favn360_crm_identity",
            {
              target_external_user_id:
                identity.user_id,
              target_email:
                identity.email,
              target_full_name:
                identity.full_name,
              target_role:
                identity.role,
              target_source_updated_at:
                identity.updated_at,
            }
          );

          if (error) {
            recordsFailed += 1;

            if (failedExternalUserIds.length < 100) {
              failedExternalUserIds.push(
                identity.user_id
              );
            }

            console.error(
              "Favn360 CRM identity upsert failed",
              {
                externalUserId: identity.user_id,
                code: error.code,
                message: error.message,
              }
            );

            continue;
          }

          recordsSucceeded += 1;
        }

        cursor = page.next_cursor;
      } while (cursor !== null);

      return {
        recordsDiscovered,
        recordsProcessed,
        recordsSucceeded,
        recordsFailed,
        metadata: {
          source_system: "favn360",
          contract_version: 1,
          pages_processed: pagesProcessed,
          page_size: PAGE_SIZE,
          failed_external_user_ids:
            failedExternalUserIds,
          failed_external_user_ids_truncated:
            recordsFailed >
            failedExternalUserIds.length,
        },
      };
    },
  });
}

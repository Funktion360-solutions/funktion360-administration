import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type SyncType =
  | "full"
  | "incremental"
  | "reconciliation"
  | "webhook"
  | "manual";

export type SyncTriggerType =
  | "scheduled"
  | "manual"
  | "webhook"
  | "system";

export type SyncTerminalStatus =
  | "succeeded"
  | "partially_succeeded"
  | "failed"
  | "cancelled";

type SyncMetadata = Record<string, unknown>;

type StartSyncRunInput = {
  integrationKey: string;
  syncType?: SyncType;
  triggerType?: SyncTriggerType;
  triggeredByStaffUserId?: string | null;
  metadata?: SyncMetadata;
};

type CompleteSyncRunInput = {
  syncRunId: string;
  status: SyncTerminalStatus;
  recordsDiscovered?: number;
  recordsProcessed?: number;
  recordsSucceeded?: number;
  recordsFailed?: number;
  errorCode?: string | null;
  errorSummary?: string | null;
  metadata?: SyncMetadata;
};

export async function startSyncRun({
  integrationKey,
  syncType = "incremental",
  triggerType = "system",
  triggeredByStaffUserId = null,
  metadata = {},
}: StartSyncRunInput): Promise<string> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc(
    "start_crm_system_sync_run",
    {
      target_integration_key: integrationKey,
      target_sync_type: syncType,
      target_trigger_type: triggerType,
      target_triggered_by_staff_user_id:
        triggeredByStaffUserId,
      target_metadata: metadata,
    }
  );

  if (error) {
    throw new Error(
      `Failed to start CRM sync run: ${error.message}`
    );
  }

  if (typeof data !== "string" || data.length === 0) {
    throw new Error(
      "CRM sync engine returned an invalid sync run ID"
    );
  }

  return data;
}

export async function completeSyncRun({
  syncRunId,
  status,
  recordsDiscovered = 0,
  recordsProcessed = 0,
  recordsSucceeded = 0,
  recordsFailed = 0,
  errorCode = null,
  errorSummary = null,
  metadata = {},
}: CompleteSyncRunInput): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.rpc(
    "complete_crm_system_sync_run",
    {
      target_sync_run_id: syncRunId,
      target_status: status,
      target_records_discovered: recordsDiscovered,
      target_records_processed: recordsProcessed,
      target_records_succeeded: recordsSucceeded,
      target_records_failed: recordsFailed,
      target_error_code: errorCode,
      target_error_summary: errorSummary,
      target_metadata: metadata,
    }
  );

  if (error) {
    throw new Error(
      `Failed to complete CRM sync run: ${error.message}`
    );
  }
}

type SyncExecutionResult = {
  recordsDiscovered: number;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  metadata?: SyncMetadata;
};

type RunSyncInput = StartSyncRunInput & {
  execute: () => Promise<SyncExecutionResult>;
};

function getSyncErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      errorCode: "SYNC_EXECUTION_FAILED",
      errorSummary: error.message.slice(0, 1000),
    };
  }

  return {
    errorCode: "SYNC_EXECUTION_FAILED",
    errorSummary: "Synchronization failed with an unknown error",
  };
}

export async function runSync({
  execute,
  ...startInput
}: RunSyncInput): Promise<{
  syncRunId: string;
  result: SyncExecutionResult;
}> {
  const syncRunId = await startSyncRun(startInput);

  try {
    const result = await execute();

    const status: SyncTerminalStatus =
      result.recordsFailed === 0
        ? "succeeded"
        : result.recordsSucceeded > 0
          ? "partially_succeeded"
          : "failed";

    await completeSyncRun({
      syncRunId,
      status,
      recordsDiscovered: result.recordsDiscovered,
      recordsProcessed: result.recordsProcessed,
      recordsSucceeded: result.recordsSucceeded,
      recordsFailed: result.recordsFailed,
      metadata: result.metadata ?? {},
    });

    return {
      syncRunId,
      result,
    };
  } catch (error) {
    const { errorCode, errorSummary } =
      getSyncErrorDetails(error);

    try {
      await completeSyncRun({
        syncRunId,
        status: "failed",
        errorCode,
        errorSummary,
        metadata: {
          execution_failed: true,
        },
      });
    } catch (completionError) {
      console.error(
        "Failed to record terminal state for CRM sync run",
        {
          syncRunId,
          completionError,
        }
      );
    }

    throw error;
  }
}

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type HealthStatus =
  | "operational"
  | "degraded"
  | "outage"
  | "unknown";

type HealthTarget = {
  getUrl: () => string;
  checkType:
    | "availability"
    | "api"
    | "database"
    | "authentication"
    | "sync"
    | "webhook"
    | "deployment";
};

function getAdministrationHealthUrl() {
  const baseUrl = process.env.ADMINISTRATION_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      "ADMINISTRATION_BASE_URL is not configured"
    );
  }

  return new URL("/api/health", baseUrl).toString();
}

const HEALTH_TARGETS: Record<string, HealthTarget> = {
  "funktion360-administration": {
    getUrl: getAdministrationHealthUrl,
    checkType: "availability",
  },
};

export async function runSystemHealthCheck(
  systemKey: keyof typeof HEALTH_TARGETS
) {
  const target = HEALTH_TARGETS[systemKey];

  if (!target) {
    throw new Error(
      `Health check target is not allowlisted: ${systemKey}`
    );
  }

  const supabase = createAdminClient();

  const startedAt = performance.now();

  let status: HealthStatus = "outage";
  let statusCode: number | null = null;
  let errorCode: string | null = null;
  let errorSummary: string | null = null;

  try {
    const response = await fetch(target.getUrl(), {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: {
        Accept: "application/json",
      },
    });

    statusCode = response.status;

    if (!response.ok) {
      status = response.status >= 500
        ? "outage"
        : "degraded";

      errorCode = `HTTP_${response.status}`;
      errorSummary =
        `Health endpoint returned HTTP ${response.status}`;
    } else {
      const body = (await response.json()) as {
        status?: unknown;
        service?: unknown;
      };

      if (
        body.status === "ok" &&
        body.service === systemKey
      ) {
        status = "operational";
      } else {
        status = "degraded";
        errorCode = "INVALID_HEALTH_RESPONSE";
        errorSummary =
          "Health endpoint returned an unexpected response";
      }
    }
  } catch (error) {
    status = "outage";

    if (
      error instanceof DOMException &&
      error.name === "TimeoutError"
    ) {
      errorCode = "TIMEOUT";
      errorSummary =
        "Health endpoint did not respond within 5 seconds";
    } else {
      errorCode = "REQUEST_FAILED";
      errorSummary =
        error instanceof Error
          ? error.message
          : "Health request failed";
    }
  }

  const responseTimeMs = Math.max(
    0,
    Math.round(performance.now() - startedAt)
  );

  const { data: healthCheckId, error: recordError } =
    await supabase.rpc("record_crm_system_health_check", {
      target_system_key: systemKey,
      target_check_type: target.checkType,
      target_status: status,
      target_response_time_ms: responseTimeMs,
      target_status_code: statusCode,
      target_error_code: errorCode,
      target_error_summary: errorSummary,
      target_metadata: {
        target: systemKey,
      },
    });

  if (recordError) {
    throw new Error(
      `Could not record health check: ${recordError.message}`
    );
  }

  return {
    id: healthCheckId,
    systemKey,
    status,
    responseTimeMs,
    statusCode,
    errorCode,
    errorSummary,
  };
}

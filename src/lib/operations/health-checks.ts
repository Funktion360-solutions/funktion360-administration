import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type HealthStatus =
  | "operational"
  | "degraded"
  | "outage"
  | "unknown";

type HealthTarget =
  | {
      kind: "http";
      getUrl: () => string;
      expectedService?: string;
      checkType:
        | "availability"
        | "api"
        | "authentication"
        | "webhook"
        | "deployment";
    }
  | {
      kind: "database";
      checkType: "database";
    }
  | {
      kind: "vercel";
      checkType: "deployment";
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

function getFavn360HealthUrl() {
  const baseUrl = process.env.FAVN360_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      "FAVN360_BASE_URL is not configured"
    );
  }

  return new URL("/api/health", baseUrl).toString();
}

const HEALTH_TARGETS: Record<string, HealthTarget> = {
  "funktion360-administration": {
    kind: "http",
    getUrl: getAdministrationHealthUrl,
    expectedService: "funktion360-administration",
    checkType: "availability",
  },
  favn360: {
    kind: "http",
    getUrl: getFavn360HealthUrl,
    checkType: "availability",
  },
  supabase: {
    kind: "database",
    checkType: "database",
  },
  vercel: {
    kind: "vercel",
    checkType: "deployment",
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
    if (target.kind === "database") {
      const { data, error } = await supabase.rpc(
        "check_crm_database_health"
      );

      if (error) {
        status = "outage";
        errorCode = "DATABASE_HEALTH_FAILED";
        errorSummary = error.message;
      } else {
        const body = data as {
          status?: unknown;
          service?: unknown;
          database?: unknown;
          system_registry_accessible?: unknown;
        } | null;

        if (
          body?.status === "ok" &&
          body.service === systemKey &&
          body.database === "reachable" &&
          body.system_registry_accessible === true
        ) {
          status = "operational";
        } else {
          status = "degraded";
          errorCode = "INVALID_DATABASE_HEALTH_RESPONSE";
          errorSummary =
            "Database health probe returned an unexpected response";
        }
      }
    } else if (target.kind === "vercel") {
      const token = process.env.VERCEL_API_TOKEN;
      const projectId = process.env.VERCEL_PROJECT_ID;
      const teamId = process.env.VERCEL_ORG_ID;

      if (!token) {
        throw new Error("VERCEL_API_TOKEN is not configured");
      }

      if (!projectId) {
        throw new Error("VERCEL_PROJECT_ID is not configured");
      }

      if (!teamId) {
        throw new Error("VERCEL_ORG_ID is not configured");
      }

      const url = new URL(
        "https://api.vercel.com/v6/deployments"
      );

      url.searchParams.set("projectId", projectId);
      url.searchParams.set("teamId", teamId);
      url.searchParams.set("target", "production");
      url.searchParams.set("limit", "1");

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      statusCode = response.status;

      if (!response.ok) {
        status = response.status >= 500
          ? "outage"
          : "degraded";

        errorCode = `VERCEL_HTTP_${response.status}`;
        errorSummary =
          `Vercel API returned HTTP ${response.status}`;
      } else {
        const body = (await response.json()) as {
          deployments?: Array<{
            uid?: unknown;
            name?: unknown;
            target?: unknown;
            state?: unknown;
            readyState?: unknown;
          }>;
        };

        const deployment = body.deployments?.[0];

        const deploymentState =
          typeof deployment?.state === "string"
            ? deployment.state
            : typeof deployment?.readyState === "string"
              ? deployment.readyState
              : null;

        if (
          deployment?.name !==
            "funktion360-administration" ||
          deployment?.target !== "production"
        ) {
          status = "degraded";
          errorCode = "INVALID_VERCEL_DEPLOYMENT";
          errorSummary =
            "Vercel returned an unexpected production deployment";
        } else if (deploymentState === "READY") {
          status = "operational";
        } else if (
          deploymentState === "ERROR" ||
          deploymentState === "CANCELED"
        ) {
          status = "outage";
          errorCode = `VERCEL_${deploymentState}`;
          errorSummary =
            `Production deployment state is ${deploymentState}`;
        } else {
          status = "degraded";
          errorCode = deploymentState
            ? `VERCEL_${deploymentState}`
            : "VERCEL_UNKNOWN_STATE";
          errorSummary = deploymentState
            ? `Production deployment state is ${deploymentState}`
            : "Vercel returned no deployment state";
        }
      }
    } else {
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

        const serviceMatches =
          target.expectedService === undefined ||
          body.service === target.expectedService;

        if (
          body.status === "ok" &&
          serviceMatches
        ) {
          status = "operational";
        } else {
          status = "degraded";
          errorCode = "INVALID_HEALTH_RESPONSE";
          errorSummary =
            "Health endpoint returned an unexpected response";
        }
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

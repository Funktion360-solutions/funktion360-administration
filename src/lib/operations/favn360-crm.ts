import "server-only";

export type Favn360CrmIdentity = {
  user_id: string;
  email: string | null;
  full_name: string;
  role: "citizen" | "administrator" | "representative";
  created_at: string;
  updated_at: string;
};

export type Favn360CrmCursor = {
  updated_after: string;
  updated_after_id: string;
};

type Favn360IdentityResponse = {
  contract_version: number;
  identities: Favn360CrmIdentity[];
  next_cursor: Favn360CrmCursor | null;
};

function getConfiguration() {
  const baseUrl = process.env.FAVN360_BASE_URL;
  const secret = process.env.CRM_INTEGRATION_SECRET;

  if (!baseUrl) {
    throw new Error(
      "FAVN360_BASE_URL is not configured"
    );
  }

  if (!secret) {
    throw new Error(
      "CRM_INTEGRATION_SECRET is not configured"
    );
  }

  return {
    baseUrl,
    secret,
  };
}

function isValidIdentity(
  value: unknown
): value is Favn360CrmIdentity {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const identity =
    value as Record<string, unknown>;

  return (
    typeof identity.user_id === "string" &&
    (
      identity.email === null ||
      typeof identity.email === "string"
    ) &&
    typeof identity.full_name === "string" &&
    (
      identity.role === "citizen" ||
      identity.role === "administrator" ||
      identity.role === "representative"
    ) &&
    typeof identity.created_at === "string" &&
    typeof identity.updated_at === "string"
  );
}

function isValidCursor(
  value: unknown
): value is Favn360CrmCursor {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const cursor =
    value as Record<string, unknown>;

  return (
    typeof cursor.updated_after === "string" &&
    typeof cursor.updated_after_id === "string"
  );
}

export async function listFavn360CrmIdentities(
  options: {
    cursor?: Favn360CrmCursor | null;
    limit?: number;
  } = {}
): Promise<Favn360IdentityResponse> {
  const { baseUrl, secret } =
    getConfiguration();

  const limit = options.limit ?? 500;

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 1000
  ) {
    throw new Error(
      "Favn360 CRM identity limit must be between 1 and 1000"
    );
  }

  const url = new URL(
    "/api/integrations/crm/identities",
    baseUrl
  );

  url.searchParams.set(
    "limit",
    String(limit)
  );

  if (options.cursor) {
    url.searchParams.set(
      "updated_after",
      options.cursor.updated_after
    );

    url.searchParams.set(
      "updated_after_id",
      options.cursor.updated_after_id
    );
  }

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${secret}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Favn360 CRM API returned HTTP ${response.status}`
    );
  }

  const body =
    await response.json() as unknown;

  if (
    typeof body !== "object" ||
    body === null
  ) {
    throw new Error(
      "Favn360 CRM API returned an invalid response"
    );
  }

  const result =
    body as Record<string, unknown>;

  if (result.contract_version !== 1) {
    throw new Error(
      "Unsupported Favn360 CRM contract version"
    );
  }

  if (
    !Array.isArray(result.identities) ||
    !result.identities.every(isValidIdentity)
  ) {
    throw new Error(
      "Favn360 CRM API returned invalid identities"
    );
  }

  if (
    result.next_cursor !== null &&
    !isValidCursor(result.next_cursor)
  ) {
    throw new Error(
      "Favn360 CRM API returned an invalid cursor"
    );
  }

  return {
    contract_version: 1,
    identities: result.identities,
    next_cursor: result.next_cursor,
  };
}

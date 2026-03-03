export type AdminEvent = {
  id: string;
  name: string;
};

export type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  events: AdminEvent[];
};

export type LoginResponse = {
  success: boolean;
  data: {
    accessToken: string;
    user: AdminUser;
  };
  error?: string;
};

export type FormResponseItem = {
  fieldName: string;
  value: string | boolean | number | null;
};

export type DashboardUser = {
  id: string;
  email: string;
  formResponses: FormResponseItem[];
  checkedIn: boolean;
  checkedInAt: string | null;
  registeredAt: string;
};

export type UsersResponse = {
  success: boolean;
  data: {
    items: DashboardUser[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

export type OverviewResponse = {
  success: boolean;
  data: {
    users: {
      total: number;
      assigned: number;
      unassigned: number;
      checkedIn: number;
      checkedInPercentage: number;
    };
  };
};

export type ConsumeCheckInResponse = {
  success: boolean;
  data?: {
    alreadyCheckedIn: boolean;
    checkedInAt: string;
    userId: string;
    eventId: string;
  };
  error?: string;
  details?: string;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

async function parseJson<T>(response: Response): Promise<T> {
  const raw = (await response.json()) as T;
  return raw;
}

export async function loginAdmin(
  apiBaseUrl: string,
  payload: { email: string; password: string },
): Promise<LoginResponse> {
  const response = await fetch(
    `${normalizeBaseUrl(apiBaseUrl)}/api/v1/admin/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  const result = await parseJson<LoginResponse>(response);
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Login failed");
  }

  return result;
}

function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchUsers(
  apiBaseUrl: string,
  token: string,
  options: {
    eventId: string;
    page: number;
    limit: number;
    search?: string;
  },
): Promise<UsersResponse> {
  const query = new URLSearchParams({
    eventId: options.eventId,
    page: String(options.page),
    limit: String(options.limit),
  });

  if (options.search?.trim()) {
    query.set("search", options.search.trim());
  }

  const response = await fetch(
    `${normalizeBaseUrl(apiBaseUrl)}/api/v1/admin/users?${query.toString()}`,
    {
      headers: authHeaders(token),
    },
  );

  const result = await parseJson<UsersResponse>(response);
  if (!response.ok || !result.success) {
    throw new Error("Failed to load users");
  }

  return result;
}

export async function fetchOverview(
  apiBaseUrl: string,
  token: string,
  eventId: string,
): Promise<OverviewResponse> {
  const response = await fetch(
    `${normalizeBaseUrl(apiBaseUrl)}/api/v1/admin/events/${eventId}/overview`,
    {
      headers: authHeaders(token),
    },
  );

  const result = await parseJson<OverviewResponse>(response);
  if (!response.ok || !result.success) {
    throw new Error("Failed to load overview statistics");
  }

  return result;
}

export async function consumeCheckInByReference(
  apiBaseUrl: string,
  reference: string,
): Promise<ConsumeCheckInResponse> {
  const response = await fetch(
    `${normalizeBaseUrl(apiBaseUrl)}/api/v1/public/check-in/consume`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, passReferenceId: reference }),
    },
  );

  const result = await parseJson<ConsumeCheckInResponse>(response);
  if (!response.ok || !result.success) {
    throw new Error(result.error || result.details || "Check-in failed");
  }

  return result;
}

export async function exportUsersCsv(
  apiBaseUrl: string,
  token: string,
  eventId: string,
): Promise<Blob> {
  const query = new URLSearchParams({ eventId, format: "csv" });

  const response = await fetch(
    `${normalizeBaseUrl(apiBaseUrl)}/api/v1/admin/users/export?${query.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("CSV export failed");
  }

  return response.blob();
}

export function extractFormValue(
  formResponses: FormResponseItem[],
  keys: string[],
): string {
  for (const key of keys) {
    const match = formResponses.find((item) => item.fieldName === key);
    if (match?.value === undefined || match?.value === null) {
      continue;
    }

    const value = String(match.value).trim();
    if (value.length > 0) {
      return value;
    }
  }

  return "";
}

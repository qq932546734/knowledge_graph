import type { ApiResponse } from "@/lib/client/types";

let cachedCsrfToken: string | null = null;

async function ensureCsrfToken(): Promise<string> {
  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }

  const response = await fetch("/api/security/csrf", {
    credentials: "include",
  });

  const payload = (await response.json()) as ApiResponse<{ csrfToken: string }>;
  if (!payload.success) {
    throw new Error(payload.error.message);
  }

  cachedCsrfToken = payload.data.csrfToken;
  return cachedCsrfToken;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  requiresCsrf = false,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("content-type", "application/json");

  if (requiresCsrf) {
    const csrfToken = await ensureCsrfToken();
    headers.set("x-csrf-token", csrfToken);
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
  });

  const payload = (await response.json()) as ApiResponse<T>;
  if (!payload.success) {
    throw new Error(`${payload.error.code}: ${payload.error.message}`);
  }

  return payload.data;
}

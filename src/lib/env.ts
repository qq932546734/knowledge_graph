const required = ["DATABASE_URL", "AUTH_SECRET"] as const;

export function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function validateEnv(): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  for (const key of required) {
    getEnv(key);
  }
}

export const RATE_LIMIT_WINDOW_MINUTES = Number(process.env.RATE_LIMIT_WINDOW_MINUTES ?? "15");
export const RATE_LIMIT_MAX_ATTEMPTS = Number(process.env.RATE_LIMIT_MAX_ATTEMPTS ?? "5");
export const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME ?? "kg_csrf_token";
export const CSRF_HEADER_NAME = process.env.CSRF_HEADER_NAME ?? "x-csrf-token";

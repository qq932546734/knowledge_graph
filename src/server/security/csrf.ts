import { randomBytes } from "crypto";

import type { NextRequest, NextResponse } from "next/server";

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/env";
import { ApiError, ERROR_CODES } from "@/lib/errors";

const cookieMaxAge = 7 * 24 * 60 * 60;

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: cookieMaxAge,
  });
}

export function validateCsrf(request: NextRequest): void {
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return;
  }

  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new ApiError(ERROR_CODES.CSRF_INVALID, "Invalid CSRF token", 403);
  }
}

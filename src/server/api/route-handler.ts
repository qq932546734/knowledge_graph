import { randomUUID } from "crypto";

import type { Session } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";
import { ApiError, ERROR_CODES, type ErrorCode } from "@/lib/errors";
import { logError, logInfo } from "@/lib/logger";
import { validateCsrf } from "@/server/security/csrf";

interface HandlerContext {
  request: NextRequest;
  session: Session | null;
  userId: string | null;
  requestId: string;
}

interface HandlerOptions {
  requireAuth?: boolean;
  requireCsrf?: boolean;
}

function errorResponse(
  requestId: string,
  code: ErrorCode,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details: details ?? null,
      },
      requestId,
    },
    {
      status,
      headers: {
        "x-request-id": requestId,
      },
    },
  );
}

export function ok<T>(data: T, requestId: string, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      requestId,
    },
    {
      status,
      headers: {
        "x-request-id": requestId,
      },
    },
  );
}

export function withApiHandler<TRouteContext = unknown>(
  handler: (
    context: HandlerContext,
    routeContext: TRouteContext,
  ) => Promise<NextResponse> | NextResponse,
  options: HandlerOptions = {},
) {
  return async (request: NextRequest, routeContext: TRouteContext): Promise<NextResponse> => {
    const requestId = request.headers.get("x-request-id") || randomUUID();

    try {
      const session = await auth();

      if (options.requireAuth && !session?.user?.id) {
        throw new ApiError(ERROR_CODES.AUTH_REQUIRED, "Authentication required", 401);
      }

      if (options.requireCsrf) {
        validateCsrf(request);
      }

      logInfo("request.received", {
        requestId,
        method: request.method,
        path: request.nextUrl.pathname,
        userId: session?.user?.id ?? null,
      });

      const response = await handler(
        {
          request,
          session,
          userId: session?.user?.id ?? null,
          requestId,
        },
        routeContext,
      );

      response.headers.set("x-request-id", requestId);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        return errorResponse(requestId, error.code, error.message, error.status, error.details);
      }

      if (error instanceof Error && error.message === "RATE_LIMITED") {
        return errorResponse(
          requestId,
          ERROR_CODES.RATE_LIMITED,
          "Too many failed login attempts. Try again later.",
          429,
        );
      }

      logError("request.failed", error, {
        requestId,
        method: request.method,
        path: request.nextUrl.pathname,
      });

      return errorResponse(requestId, ERROR_CODES.INTERNAL_ERROR, "Internal server error", 500);
    }
  };
}

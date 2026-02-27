import { NextResponse } from "next/server";

import { withApiHandler } from "@/server/api/route-handler";
import { generateCsrfToken, setCsrfCookie } from "@/server/security/csrf";

export const GET = withApiHandler(
  async ({ requestId }) => {
    const token = generateCsrfToken();
    const response = NextResponse.json({
      success: true,
      data: { csrfToken: token },
      requestId,
    });

    setCsrfCookie(response, token);
    return response;
  },
  { requireAuth: true },
);

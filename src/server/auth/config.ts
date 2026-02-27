import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { RATE_LIMIT_MAX_ATTEMPTS, RATE_LIMIT_WINDOW_MINUTES } from "@/lib/env";
import { prisma } from "@/server/db";
import { verifyPassword } from "@/server/auth/password";
import { SlidingWindowRateLimiter } from "@/server/security/rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const loginRateLimiter = new SlidingWindowRateLimiter(
  RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  RATE_LIMIT_MAX_ATTEMPTS,
);

function requestIp(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const firstForwardedIp = xForwardedFor.split(",")[0]?.trim();

  return firstForwardedIp || request.headers.get("x-real-ip") || "unknown";
}

export const authConfig = {
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production" ? "__Secure-kg.session-token" : "kg.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase().trim();
        const ip = requestIp(request);
        const rateLimitKey = `${ip}:${email}`;

        if (!loginRateLimiter.canAttempt(rateLimitKey)) {
          throw new Error("RATE_LIMITED");
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, passwordHash: true },
        });

        if (!user) {
          loginRateLimiter.recordFailure(rateLimitKey);
          return null;
        }

        const isPasswordValid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!isPasswordValid) {
          loginRateLimiter.recordFailure(rateLimitKey);
          return null;
        }

        loginRateLimiter.reset(rateLimitKey);

        return {
          id: user.id,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id as string;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = String(token.userId);
      }

      return session;
    },
  },
} satisfies NextAuthConfig;

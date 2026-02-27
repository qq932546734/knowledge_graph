import { NextResponse } from "next/server";

import { auth } from "@/auth";

export default auth((request) => {
  const isLoggedIn = Boolean(request.auth);
  const path = request.nextUrl.pathname;
  const requiresAuth =
    path.startsWith("/dashboard") ||
    path.startsWith("/nodes") ||
    path.startsWith("/relations") ||
    path.startsWith("/review") ||
    path.startsWith("/practice") ||
    path.startsWith("/graph") ||
    path.startsWith("/backup");

  if (requiresAuth && !isLoggedIn) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (path === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/nodes/:path*",
    "/relations/:path*",
    "/review/:path*",
    "/practice/:path*",
    "/graph/:path*",
    "/backup/:path*",
    "/login",
  ],
};

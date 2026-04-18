import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const AUTH_REQUIRED = ["/orders", "/checkout", "/admin"];
// Routes only for admins
const ADMIN_ONLY = ["/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  const role = request.cookies.get("role")?.value;

  const requiresAuth = AUTH_REQUIRED.some((p) => pathname.startsWith(p));
  const requiresAdmin = ADMIN_ONLY.some((p) => pathname.startsWith(p));

  if (requiresAuth && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (requiresAdmin && role !== "Admin") {
    return NextResponse.redirect(new URL("/orders/new", request.url));
  }

  if (pathname === "/login" && token) {
    const redirect = role === "Admin" ? "/admin/flavors" : "/orders/new";
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};

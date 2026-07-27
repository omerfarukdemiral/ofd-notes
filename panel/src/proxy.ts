import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  // Girişli kullanıcıyı login ekranında tutmanın anlamı yok.
  if (pathname === "/giris" && session?.role === "ADMIN") {
    return NextResponse.redirect(new URL("/panel", request.url));
  }

  if (pathname === "/giris") {
    return NextResponse.next();
  }

  if (!session) {
    const url = new URL("/giris", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/yetkisiz", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*", "/giris"],
};

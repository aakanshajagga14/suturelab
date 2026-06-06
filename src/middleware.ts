import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LEGACY_REDIRECTS: Record<string, string> = {
  "/session": "/training",
  "/summary": "/report",
  "/laparoscopic": "/training",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  for (const [legacy, target] of Object.entries(LEGACY_REDIRECTS)) {
    if (pathname === legacy || pathname.startsWith(`${legacy}/`)) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(legacy, target);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/session/:path*", "/summary/:path*", "/laparoscopic/:path*"],
};

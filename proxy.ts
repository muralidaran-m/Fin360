import { NextRequest, NextResponse } from "next/server"

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth"

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const isAuthenticated = token ? await verifySessionToken(token) : false

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!login|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)",
  ],
}

import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Simple pass-through middleware since we're using Firebase auth
  // No Supabase session management needed here
  return
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}

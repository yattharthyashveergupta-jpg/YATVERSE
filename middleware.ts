import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/middleware"

function withSupabaseCookies(
  from: NextResponse,
  to: NextResponse
) {
  from.cookies.getAll().forEach(({ name, value, ...options }) => {
    to.cookies.set(name, value, options)
  })

  return to
}

export async function middleware(request: NextRequest) {
  const { supabase, getResponse } = createClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const supabaseResponse = getResponse()

  const { pathname } = request.nextUrl
  const isAuthPage = pathname === "/login" || pathname === "/signup"
  const isProtectedPage = pathname === "/" || pathname === "/onboarding"

  if (!user && isProtectedPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return withSupabaseCookies(supabaseResponse, NextResponse.redirect(url))
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return withSupabaseCookies(supabaseResponse, NextResponse.redirect(url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

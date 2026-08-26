import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { isProfileIncomplete } from "@/lib/profile"
import { createClient } from "@/utils/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (!code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, college")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error("Failed to load profile after authentication callback:", profileError)
    return NextResponse.redirect(`${origin}/login?error=profile_check_failed`)
  }

  if (isProfileIncomplete(profile)) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  return NextResponse.redirect(`${origin}/`)
}

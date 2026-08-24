"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { isProfileIncomplete } from "@/lib/profile"

export default function LoginPage() {
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "profile_check_failed") {
      setError("We couldn't verify your profile. Please try signing in again.")
    }
  }, [])

  async function redirectAfterLogin(userId: string) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, college")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("Failed to load profile after login:", profileError)
      setError("We couldn't verify your profile. Please try signing in again.")
      setLoading(false)
      return
    }

    window.location.href = isProfileIncomplete(profile)
      ? "/onboarding"
      : "/"
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setLoading(true)
    setError("")

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError("Sign in failed. Please try again.")
      setLoading(false)
      return
    }

    await redirectAfterLogin(data.user.id)
  }

  async function handleGoogleLogin() {
    setError("")

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    }
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#a78bfa] text-2xl">
            ✦
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to YATVERSE
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Your entire student journey, connected.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-7 shadow-2xl">

          <h2 className="text-xl font-semibold">
            Sign in
          </h2>

          <p className="mt-1 mb-6 text-sm text-zinc-400">
            Continue to your YATVERSE workspace.
          </p>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-3 text-sm font-medium transition hover:bg-zinc-800"
          >
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-500">OR</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <label className="text-sm text-zinc-300">
              Email
            </label>

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-2 mb-4 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-violet-400"
            />

            {/* Password */}
            <label className="text-sm text-zinc-300">
              Password
            </label>

            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-violet-400"
            />

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Login */}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-[#a78bfa] py-3 text-sm font-semibold text-black transition hover:bg-[#b69cff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in to YATVERSE"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-500">
            By continuing, you agree to YATVERSE's terms and privacy policy.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="cursor-pointer text-violet-400 hover:text-violet-300"
          >
            Create one
          </Link>
        </p>

      </div>
    </main>
  )
}

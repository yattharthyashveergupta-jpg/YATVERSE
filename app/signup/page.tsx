"use client"

import { FormEvent, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"

export default function SignupPage() {
  const supabase = createClient()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setLoading(true)
    setError("")
    setMessage("")

    if (!name.trim()) {
      setError("Please enter your name.")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: name.trim(),
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user && !data.session) {
      setMessage(
        "Account created! Please check your email to verify your account."
      )
    } else {
      window.location.href = "/onboarding"
    }

    setLoading(false)
  }

  async function handleGoogleSignup() {
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
    <main className="min-h-screen bg-[#09090b] text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#a78bfa] text-2xl text-black">
            ✦
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Join YATVERSE
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Build your academic and career universe.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-7 shadow-2xl">

          <h2 className="text-xl font-semibold">
            Create your account
          </h2>

          <p className="mt-1 text-sm text-zinc-400">
            Start your personalized student journey.
          </p>

          <button
            type="button"
            onClick={handleGoogleSignup}
            className="mt-6 w-full rounded-xl border border-zinc-700 bg-zinc-900 py-3 text-sm font-medium transition hover:bg-zinc-800"
          >
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-500">OR</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Your name
              </label>

              <input
                type="text"
                placeholder="Yattharth"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-violet-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Email
              </label>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-violet-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Password
              </label>

              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-violet-400"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#a78bfa] py-3 text-sm font-semibold text-black transition hover:bg-[#b69cff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create YATVERSE account"}
            </button>

          </form>

          <p className="mt-6 text-center text-xs text-zinc-500">
            By creating an account, you agree to YATVERSE&apos;s terms and
            privacy policy.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-violet-400 hover:text-violet-300"
          >
            Sign in
          </Link>
        </p>

      </div>
    </main>
  )
}
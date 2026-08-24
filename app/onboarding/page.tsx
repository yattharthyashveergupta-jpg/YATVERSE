"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { hasRequiredProfileFields } from "@/lib/profile"

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState("")
  const [college, setCollege] = useState("")
  const [degree, setDegree] = useState("B.Tech")
  const [branch, setBranch] = useState("")
  const [semester, setSemester] = useState("")
  const [cgpa, setCgpa] = useState("")
  const [targetCgpa, setTargetCgpa] = useState("")
  const [careerGoal, setCareerGoal] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setLoading(true)
    setError("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    const normalizedFullName = fullName.trim()
    const normalizedCollege = college.trim()
    const semesterNumber = Number(semester)

    if (!hasRequiredProfileFields({ full_name: normalizedFullName, college: normalizedCollege })) {
      setError("Please enter your full name and college or university.")
      setLoading(false)
      return
    }

    if (!Number.isInteger(semesterNumber) || semesterNumber < 1 || semesterNumber > 8) {
      setError("Please select a valid semester.")
      setLoading(false)
      return
    }

    const cgpaNumber = cgpa === "" ? null : Number(cgpa)

    if (cgpaNumber !== null && (!Number.isFinite(cgpaNumber) || cgpaNumber < 0 || cgpaNumber > 10)) {
      setError("Please enter a CGPA between 0 and 10.")
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: normalizedFullName,
        college: normalizedCollege,
        branch: branch.trim(),
        semester: semesterNumber,
        cgpa: cgpaNumber,
        career_goal: careerGoal.trim() || null,
      })
      .eq("id", user.id)
      .select("id")
      .maybeSingle()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (!data) {
      setError("Your profile could not be updated. Please try again.")
      setLoading(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white px-6 py-10">
      <div className="mx-auto max-w-2xl">

        <div className="mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#a78bfa] text-2xl text-black">
            ✦
          </div>

          <p className="text-sm font-medium text-violet-400">
            YATVERSE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Let&apos;s build your universe.
          </h1>

          <p className="mt-2 text-zinc-400">
            Tell us a little about yourself so we can personalize YATVERSE for you.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800 bg-[#111113] p-7 shadow-2xl"
        >
          <div className="grid gap-5 md:grid-cols-2">

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-zinc-300">
                Full name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Yattharth Gupta"
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-violet-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-zinc-300">
                College / University
              </label>
              <input
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="Lovely Professional University"
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Degree
              </label>
              <select
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-violet-400"
              >
                <option>B.Tech</option>
                <option>B.E.</option>
                <option>BCA</option>
                <option>M.Tech</option>
                <option>MCA</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Branch
              </label>
              <input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="CSE AI & ML"
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-violet-400"
              >
                <option value="">Select semester</option>
                {Array.from({ length: 8 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    Semester {i + 1}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Current CGPA
              </label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.01"
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
                placeholder="9.11"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Target CGPA
              </label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.01"
                value={targetCgpa}
                onChange={(e) => setTargetCgpa(e.target.value)}
                placeholder="9.50"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-violet-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-zinc-300">
                Career goal
              </label>
              <input
                value={careerGoal}
                onChange={(e) => setCareerGoal(e.target.value)}
                placeholder="AI/ML Engineer"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-violet-400"
              />
            </div>

          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-7 w-full rounded-xl bg-[#a78bfa] py-3 text-sm font-semibold text-black transition hover:bg-[#b69cff] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving profile..." : "Continue to YATVERSE"}
          </button>
        </form>

      </div>
    </main>
  )
}

'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
        <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
        <p className="text-sm text-zinc-400 mb-6">{error?.message || 'An unexpected error occurred.'}</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium transition"
        >
          Try again
        </button>
      </body>
    </html>
  )
}

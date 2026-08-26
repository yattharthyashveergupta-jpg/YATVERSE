import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface ExecuteRequestBody {
  language: 'javascript' | 'python' | 'cpp' | 'c' | 'java'
  code: string
  stdin?: string
}

const LANGUAGE_MAP: Record<string, { pistonLang: string; version: string }> = {
  python: { pistonLang: 'python', version: '3.10.0' },
  cpp: { pistonLang: 'c++', version: '10.2.0' },
  c: { pistonLang: 'c', version: '10.2.0' },
  java: { pistonLang: 'java', version: '15.0.2' },
  javascript: { pistonLang: 'javascript', version: '18.15.0' },
}

export async function POST(req: Request) {
  const startTime = Date.now()
  try {
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to run code.' },
        { status: 401 }
      )
    }

    const body: ExecuteRequestBody = await req.json().catch(() => ({} as any))
    const { language, code, stdin = '' } = body

    if (!code || !code.trim()) {
      return NextResponse.json(
        { error: 'Code cannot be empty.' },
        { status: 400 }
      )
    }

    const langConfig = LANGUAGE_MAP[language]
    if (!langConfig) {
      return NextResponse.json(
        { error: `Unsupported language "${language}". Supported: python, cpp, c, java, javascript` },
        { status: 400 }
      )
    }

    // Call Piston sandboxed execution runner
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      const pistonRes = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: langConfig.pistonLang,
          version: langConfig.version,
          files: [{ content: code }],
          stdin: stdin || '',
          run_timeout: 5000,
          compile_timeout: 8000,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const executionDuration = Date.now() - startTime

      if (!pistonRes.ok) {
        const errorText = await pistonRes.text()
        return NextResponse.json({
          success: false,
          error: `Execution engine error (${pistonRes.status}): ${errorText.slice(0, 200)}`,
          executionTimeMs: executionDuration,
        })
      }

      const data = await pistonRes.json()
      const compile = data.compile || {}
      const run = data.run || {}

      const hasCompilationError = compile.code !== undefined && compile.code !== 0
      const hasRuntimeError = run.code !== undefined && run.code !== 0

      return NextResponse.json({
        success: !hasCompilationError && !hasRuntimeError,
        stdout: run.stdout || (hasCompilationError ? '' : run.output || ''),
        stderr: run.stderr || (hasCompilationError ? compile.stderr || compile.output : ''),
        compilationError: hasCompilationError ? compile.stderr || compile.output || 'Compilation failed' : null,
        exitCode: run.code ?? compile.code ?? 0,
        signal: run.signal || null,
        executionTimeMs: executionDuration,
      })
    } catch (fetchErr: any) {
      clearTimeout(timeoutId)
      const executionDuration = Date.now() - startTime
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: 'Execution timed out after 8.0s. Infinite loop or heavy computation detected.',
          exitCode: 124,
          executionTimeMs: executionDuration,
        })
      }
      return NextResponse.json({
        success: false,
        error: `Could not connect to sandbox runner: ${fetchErr.message || 'Network failure'}`,
        executionTimeMs: executionDuration,
      })
    }
  } catch (error: any) {
    console.error('Fatal code execution error:', error)
    return NextResponse.json(
      { error: error?.message || 'Unexpected server error during code execution.' },
      { status: 500 }
    )
  }
}

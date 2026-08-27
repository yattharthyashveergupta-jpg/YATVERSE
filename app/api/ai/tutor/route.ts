import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { GoogleGenAI } from '@google/genai'
import { buildStudentContext } from '@/lib/ai-student-context'

export async function POST(req: Request) {
  try {
    let supabase: any = null
    let userId: string | null = null

    try {
      supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    } catch (authErr) {
      console.warn('Supabase auth check in AI Tutor route:', authErr)
    }

    const body = await req.json().catch(() => ({}))
    const { message, language = 'English', history = [] } = body

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'A valid message string is required.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY in your environment to enable live AI responses.',
          code: 'MISSING_API_KEY',
        },
        { status: 503 }
      )
    }

    // Load rich, live student academic context from Supabase or structured profile fallback
    const studentContext = await buildStudentContext(supabase, userId)
    const { profile, subjects, pendingTasks, skills, projects, contextSummary } = studentContext
    const studentName = profile?.full_name || (profile as any)?.name || 'Student'
    const careerGoal = profile?.career_goal || (profile as any)?.role || 'Software Engineer'
    const semester = profile?.semester ? `Semester ${profile?.semester}` : 'Current semester'
    const branch = profile?.branch || 'Computer Science & Engineering'
    const cgpa = profile?.cgpa ? `${profile.cgpa}` : 'Not specified'
    const isHinglish = String(language).toLowerCase() === 'hinglish'

    const systemPrompt = `You are YAT, the personal 24/7 AI Academic Tutor, Placement Mentor, and Real-Time Academic Assistant inside YATVERSE (Next-Generation Student OS).

YOUR DUAL-ENGINE CAPABILITY:
1. DEEP ACADEMIC & CODING PEDAGOGY:
   - For standard academic, algorithmic (DSA), data structures, engineering, mathematics, computer science, and theoretical questions:
     * Answer directly using your deep knowledge and pedagogical framework.
     * Prefer intuitive conceptual explanations, concrete visual analogies, and step-by-step reasoning.
     * When teaching programming/DSA: provide clean idiomatic code (C, C++, Java, Python, or JS), step-by-step logic breakdown, and ALWAYS explicitly state Time Complexity and Space Complexity (Big-O notation).
     * When debugging code: analyze the student's exact code, pinpoint the flaw, explain the root cause, and provide the fix.

2. REAL-TIME WEB INFORMATION & LIVE GROUNDING:
   - You are equipped with live Google Search Grounding for real-time, time-sensitive, and up-to-date queries.
   - For questions regarding current news, latest political developments, recent movie releases, box office collections, current stock/crypto/tech product prices, latest software/hardware releases (e.g., in 2026/recent updates), sports scores/tournaments, and emerging tech advancements:
     * The model retrieves live Google Search web results.
     * Synthesize and explain the latest facts clearly, accurately, and objectively based on the retrieved real-time information.
     * Cite and reference the sources, publications, dates, and figures clearly in your explanation so the student gets reliable, grounded information.
   - For regular academic or coding questions that do not require current web events, synthesize directly without unnecessary web search delays.

STUDENT PROFILE CONTEXT (YATVERSE LIVE TELEMETRY):
- Name: ${studentName}
- Branch: ${branch}
- Academic Level: ${semester} (CGPA: ${cgpa})
- Target Career Milestone: ${careerGoal}
- Enrolled Coursework: ${
      subjects.length > 0
        ? subjects.map((s: any) => `${s.name}${s.progress ? ` (${s.progress}% progress)` : ''}`).join(', ')
        : 'Core CS / Engineering'
    }
- Pending Tasks / Deadlines: ${
      pendingTasks.length > 0
        ? pendingTasks.slice(0, 5).map((t: any) => `${t.title} (${t.task_type || 'Task'})`).join(', ')
        : 'No overdue tasks'
    }
- Tracked Skills: ${
      skills.length > 0
        ? skills.slice(0, 8).map((s: any) => `${s.name} (${s.proficiency || 'Beginner'})`).join(', ')
        : 'DSA, Web Tech, Core CS'
    }
- Projects: ${
      projects && projects.length > 0
        ? projects.slice(0, 4).map((p: any) => p.title).join(', ')
        : 'None logged yet'
    }

CRITICAL CONTEXT DISCIPLINE:
- Personalize answers with student context when helpful, but always address the student's actual question directly first.
- Maintain full continuity across multi-turn conversation. Correctly resolve pronouns and references to prior answers ("that algorithm", "the second loop", "in C++ now").

LANGUAGE & TONE:
${
  isHinglish
    ? `- Hinglish Mode Active: Respond in natural, conversational Indian Hinglish written in clean Roman script (e.g. "Yeh algorithm basically divide-and-conquer strategy use karta hai...", "Haan, latest 2026 reports ke mutabik..."). Keep technical terms (Array, Recursion, Stack, Time Complexity, Pointer, API, etc.) in English.`
    : `- English Mode Active: Respond in clear, crisp, motivating, pedagogical English.`
}

RESPONSE FORMATTING:
- Use rich, clean Markdown with clear headings, bullet points, and code blocks (\`\`\`cpp, \`\`\`python, \`\`\`java, \`\`\`javascript, \`\`\`sql, etc.).
- Return natural, beautifully formatted conversational text (do NOT wrap response in JSON).`

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })

    // Construct valid multi-turn contents array with proper role alternation
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []

    if (Array.isArray(history) && history.length > 0) {
      // Keep up to latest 16 messages for substantial conversation memory
      const recentHistory = history.slice(-16)

      // Find the first user message to ensure Gemini contents starts with 'user'
      const firstUserIdx = recentHistory.findIndex((h) => h.from === 'user')
      const validHistory = firstUserIdx !== -1 ? recentHistory.slice(firstUserIdx) : []

      for (const item of validHistory) {
        if (!item.text || typeof item.text !== 'string' || !item.text.trim()) continue
        const role: 'user' | 'model' = item.from === 'user' ? 'user' : 'model'

        // If the previous turn had the same role, merge text to avoid consecutive same-role error
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts[0].text += `\n\n${item.text.trim()}`
        } else {
          contents.push({
            role,
            parts: [{ text: item.text.trim() }],
          })
        }
      }
    }

    // Append the current user message
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += `\n\n${message.trim()}`
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: message.trim() }],
      })
    }

    let response: any = null
    let searchGroundingEnabled = false

    try {
      // Enable real-time Google Search Grounding on Gemini 3.6 Flash
      response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.35,
          tools: [{ googleSearch: {} }],
        },
      })
      searchGroundingEnabled = true
    } catch (searchError: any) {
      console.warn('Gemini with Search Grounding failed, retrying direct generation:', searchError?.message || searchError)
      // Resilient fallback to standard generation if search tool experienced transient error
      response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.35,
        },
      })
    }

    const replyText = response?.text
    if (!replyText) {
      throw new Error('Gemini model returned an empty response.')
    }

    // Extract real-time search grounding metadata if available
    const groundingMetadata = response?.candidates?.[0]?.groundingMetadata
    const searchQueries: string[] = groundingMetadata?.webSearchQueries || []
    const sources: Array<{ title: string; url: string }> = []

    if (Array.isArray(groundingMetadata?.groundingChunks)) {
      const seen = new Set<string>()
      for (const chunk of groundingMetadata.groundingChunks) {
        const uri = chunk?.web?.uri
        const title = chunk?.web?.title || uri
        if (uri && !seen.has(uri)) {
          seen.add(uri)
          sources.push({
            title: title.trim(),
            url: uri.trim(),
          })
        }
      }
    }

    const isRealtime = sources.length > 0 || searchQueries.length > 0

    return NextResponse.json(
      {
        reply: replyText,
        source: isRealtime ? 'Gemini 3.6 Flash + Google Search' : 'Gemini 3.6 Flash',
        isRealtime,
        sources,
        searchQueries,
        context: {
          studentName,
          careerGoal,
          subjectsCount: subjects.length,
          pendingTasksCount: pendingTasks.length,
          language: isHinglish ? 'Hinglish' : 'English',
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error: any) {
    console.error('AI Tutor API error:', error)

    const status =
      error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')
        ? 429
        : error?.status === 401 || error?.status === 403
        ? 401
        : error?.name === 'AbortError'
        ? 504
        : 500

    const userFriendlyMessage =
      status === 429
        ? 'Gemini API quota or rate limit reached. Please wait a moment and try again.'
        : status === 401
        ? 'Gemini API authentication failed. Please check your API key configuration in Settings.'
        : status === 504
        ? 'The request to Gemini AI timed out. Please try again.'
        : error?.message || 'An unexpected error occurred while communicating with the AI Tutor.'

    return NextResponse.json(
      {
        error: userFriendlyMessage,
        details: error?.message || String(error),
        code: error?.code || 'GEMINI_TUTOR_ERROR',
      },
      { status }
    )
  }
}

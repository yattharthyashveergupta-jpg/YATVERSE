import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { GoogleGenAI } from '@google/genai'
import { buildStudentContext } from '@/lib/ai-student-context'

/**
 * Recursively sanitize objects for logging so that API keys, auth tokens, and
 * sensitive credentials are NEVER leaked to server logs or client responses.
 */
function sanitizeForLogging(obj: any, maxDepth = 4): any {
  if (!obj || maxDepth < 0) return obj
  if (typeof obj === 'string') {
    return obj
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_GEMINI_KEY]')
      .replace(/Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/key=[A-Za-z0-9-_]+/gi, 'key=[REDACTED]')
  }
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForLogging(item, maxDepth - 1))
  }

  const sanitized: Record<string, any> = {}
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    if (
      lowerKey.includes('key') ||
      lowerKey.includes('auth') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('password')
    ) {
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = sanitizeForLogging(val, maxDepth - 1)
    }
  }
  return sanitized
}

/**
 * Categorize Gemini / Network errors into standard classified categories:
 * - 429 / RESOURCE_EXHAUSTED → quota/rate-limit
 * - 401 / 403 → API key / authentication issue
 * - 404 → invalid / unavailable model
 * - timeout / network → transient failure
 */
interface ClassifiedError {
  status: number
  error: string
  message: string
  isTransient: boolean
  originalCode?: string | number
}

function classifyGeminiError(err: any): ClassifiedError {
  const errMsg = typeof err?.message === 'string' ? err.message : String(err || '')
  const errStatus = Number(err?.status || err?.statusCode || err?.code || 0)
  const errCode = String(err?.code || err?.status || '')

  // 1. Quota / Rate Limit (429 / RESOURCE_EXHAUSTED)
  const is429 =
    errStatus === 429 ||
    errCode === '429' ||
    errCode === 'RESOURCE_EXHAUSTED' ||
    errMsg.includes('429') ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.toLowerCase().includes('quota') ||
    errMsg.toLowerCase().includes('rate limit') ||
    errMsg.toLowerCase().includes('resource has been exhausted')

  if (is429) {
    return {
      status: 429,
      error: 'AI_QUOTA_EXCEEDED',
      message: 'Gemini quota or rate limit reached. Please try again later.',
      isTransient: false,
      originalCode: errCode || 429,
    }
  }

  // 2. Authentication & Authorization (401 / 403 / PERMISSION_DENIED / API_KEY_INVALID)
  const isAuth =
    errStatus === 401 ||
    errStatus === 403 ||
    errCode === 'PERMISSION_DENIED' ||
    errCode === 'API_KEY_INVALID' ||
    errCode === 'UNAUTHENTICATED' ||
    errMsg.includes('API_KEY_INVALID') ||
    errMsg.includes('PERMISSION_DENIED') ||
    errMsg.includes('API key not valid') ||
    errMsg.includes('unauthenticated')

  if (isAuth) {
    return {
      status: errStatus === 403 ? 403 : 401,
      error: 'AI_AUTH_ERROR',
      message: 'Gemini API authentication failed. Please verify the server GEMINI_API_KEY configuration.',
      isTransient: false,
      originalCode: errCode || 401,
    }
  }

  // 3. Invalid or Unsupported Model (404 / NOT_FOUND)
  const isNotFound =
    errStatus === 404 ||
    errCode === 'NOT_FOUND' ||
    errMsg.includes('404') ||
    errMsg.includes('NOT_FOUND') ||
    errMsg.includes('is not found for API version') ||
    errMsg.includes('models/')

  if (isNotFound) {
    return {
      status: 404,
      error: 'AI_MODEL_NOT_FOUND',
      message: 'The requested Gemini model is invalid or currently unavailable.',
      isTransient: false,
      originalCode: errCode || 404,
    }
  }

  // 4. Timeout / Network / Transient Failures (504 / 503 / 500)
  const isTimeout =
    err?.name === 'AbortError' ||
    errMsg.includes('timed out') ||
    errMsg.includes('timeout') ||
    errCode === 'DEADLINE_EXCEEDED' ||
    errCode === 'ETIMEDOUT'

  if (isTimeout) {
    return {
      status: 504,
      error: 'AI_NETWORK_TIMEOUT',
      message: 'The request to Gemini AI timed out. Please try again.',
      isTransient: true,
      originalCode: 'DEADLINE_EXCEEDED',
    }
  }

  const isTransientNetwork =
    errStatus === 503 ||
    errStatus === 500 ||
    errCode === 'UNAVAILABLE' ||
    errCode === 'ECONNRESET' ||
    errCode === 'ENOTFOUND' ||
    errMsg.includes('fetch failed') ||
    errMsg.includes('ECONNRESET') ||
    errMsg.includes('network error') ||
    errMsg.includes('SocketError')

  if (isTransientNetwork) {
    return {
      status: 503,
      error: 'AI_TRANSIENT_FAILURE',
      message: 'A temporary network error occurred while communicating with Gemini. Please try again.',
      isTransient: true,
      originalCode: errCode || 503,
    }
  }

  // Generic fallback
  return {
    status: errStatus >= 400 && errStatus < 600 ? errStatus : 500,
    error: 'AI_TUTOR_ERROR',
    message: errMsg || 'An unexpected error occurred while communicating with the AI Tutor.',
    isTransient: false,
    originalCode: errCode || 500,
  }
}

/**
 * Execute an async operation with bounded exponential backoff for TRANSIENT server failures only.
 * Non-transient errors (429 Quota, 401 Auth, 404 Not Found) are NEVER retried.
 */
async function executeWithTransientRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 1,
  initialDelayMs = 1000
): Promise<T> {
  let attempt = 0
  while (true) {
    try {
      return await operation()
    } catch (err: any) {
      attempt++
      const classification = classifyGeminiError(err)

      // Only retry if marked as transient and within bounded retry count
      if (classification.isTransient && attempt <= maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1)
        console.warn(
          `[AI Tutor] Transient failure (${classification.error}). Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      // Re-throw immediately for non-transient or exhausted retries
      throw err
    }
  }
}

/**
 * Safely extract generated text from Gemini candidate parts instead of relying
 * solely on response.text which can be empty or undefined when tools/grounding are active.
 */
function safeExtractText(response: any): string {
  if (!response) return ''

  // 1. Try response.text accessor
  try {
    if (typeof response.text === 'string' && response.text.trim()) {
      return response.text.trim()
    }
  } catch {
    // response.text accessor can throw in certain tool response shapes
  }

  // 2. Iterate through all candidates and their content parts
  if (Array.isArray(response?.candidates)) {
    for (const candidate of response.candidates) {
      const parts = candidate?.content?.parts
      if (Array.isArray(parts) && parts.length > 0) {
        const textSegments = parts
          .map((part: any) => {
            if (typeof part === 'string') return part
            if (part && typeof part.text === 'string') return part.text
            return ''
          })
          .filter((t: string) => t && t.trim().length > 0)

        if (textSegments.length > 0) {
          return textSegments.join('\n\n').trim()
        }
      }
    }
  }

  return ''
}

/**
 * Safely extract Google Search Grounding metadata, source URLs, and search queries.
 */
function safeExtractGrounding(response: any): {
  sources: Array<{ title: string; url: string }>
  searchQueries: string[]
} {
  const candidate = response?.candidates?.[0]
  const groundingMetadata = candidate?.groundingMetadata
  const searchQueries: string[] = Array.isArray(groundingMetadata?.webSearchQueries)
    ? groundingMetadata.webSearchQueries
    : []
  const sources: Array<{ title: string; url: string }> = []
  const seen = new Set<string>()

  if (Array.isArray(groundingMetadata?.groundingChunks)) {
    for (const chunk of groundingMetadata.groundingChunks) {
      const uri = chunk?.web?.uri
      const title = chunk?.web?.title || uri
      if (uri && typeof uri === 'string' && !seen.has(uri.trim())) {
        seen.add(uri.trim())
        sources.push({
          title: (title || uri).trim(),
          url: uri.trim(),
        })
      }
    }
  }

  return { sources, searchQueries }
}

/**
 * Determine if a user query requires real-time Google Search Grounding vs.
 * standard academic/DSA/coding fast direct evaluation.
 */
function shouldUseSearchGrounding(message: string): boolean {
  const q = message.toLowerCase().trim()

  // 1. Math expressions & arithmetic (e.g. "What is 2 + 2?", "solve 15 * 4")
  if (/^[0-9\s\+\-\*\/\^\(\)\.\=\%\?]+$/.test(q) || /^what is\s+[0-9\s\+\-\*\/\^\(\)\.\=\%]+(\?)?$/i.test(q)) {
    return false
  }

  // 2. Pure date/time questions (authoritative system clock is already injected in system prompt)
  if (
    /^(what is\s+)?(today('?s)?\s+(date|day|time)|current\s+(date|time|year)|aaj\s+ka\s+date|aaj\s+kya\s+date\s+hai)(\?)?$/i.test(
      q
    )
  ) {
    return false
  }

  // 3. Core academic / DSA / coding / theory concepts without real-time indicators
  const pureAcademicRegex =
    /\b(binary search|linear search|quicksort|mergesort|bubble sort|heapsort|insertion sort|dijkstra|bellman ford|floyd warshall|bfs|dfs|kruskal|prim|recursion|dynamic programming|memoization|tabulation|time complexity|space complexity|big o|linked list|binary tree|avl tree|red black tree|trie|graph|stack|queue|hashmap|hash table|sql join|normalization|master theorem|dbms|operating system|cpu scheduling|round robin|deadlock|semaphore|mutex|paging|virtual memory|tcp 3-way handshake|tcp\/ip|osi model|polymorphism|inheritance|encapsulation|abstraction|object oriented|async await|promises|closure|event loop|syllabus|compiler design|automata|turing machine|boolean algebra|matrix multiplication)\b/i

  const hasRealtimeKeyword =
    /\b(latest|current|today|now|news|price|box office|collection|collections|2025|2026|update|updates|released|release date|who won|election|prime minister|president|ceo|minister|tournament|match|score|stock|crypto|bitcoin|weather)\b/i.test(
      q
    )

  if (pureAcademicRegex.test(q) && !hasRealtimeKeyword) {
    return false
  }

  // 4. Strong triggers for real-time / live web information
  const realtimeRegex =
    /\b(who is the current|current prime minister|current president|current ceo|current minister|prime minister of|box office|box-office|collection|collections|latest news|today's news|todays news|current news|breaking news|movie release|released on|release date|latest version|current version|current price|stock price|gold price|crypto price|bitcoin price|score|match score|tournament|ipl|world cup|olympics|elections|weather today|headlines|trending)\b/i

  return realtimeRegex.test(q) || hasRealtimeKeyword
}

export async function POST(req: Request) {
  const startTime = Date.now()
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
      console.warn('[AI Tutor] Supabase auth check notice:', authErr)
    }

    const body = await req.json().catch(() => ({}))
    const { message, language = 'English', history = [], conversationId: clientConvId } = body

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'A valid message string is required.' },
        { status: 400 }
      )
    }

    // Ensure or create conversation in Supabase if user is logged in
    let activeConversationId: string | null = clientConvId || null
    let autoTitleNeeded = false

    if (supabase && userId) {
      try {
        if (!activeConversationId) {
          // Create new conversation
          const truncatedTitle = message.trim().slice(0, 45).replace(/[\r\n]+/g, ' ')
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              user_id: userId,
              title: truncatedTitle || 'New Conversation',
              updated_at: new Date().toISOString(),
            })
            .select('id, title')
            .maybeSingle()
          if (newConv) {
            activeConversationId = newConv.id
          }
        } else {
          // Check if conversation exists and whether it needs auto-titling
          const { data: existingConv } = await supabase
            .from('conversations')
            .select('id, title')
            .eq('id', activeConversationId)
            .eq('user_id', userId)
            .maybeSingle()
          if (existingConv && (existingConv.title === 'New Conversation' || !existingConv.title)) {
            autoTitleNeeded = true
          }
        }

        // Save user message to database
        if (activeConversationId) {
          await supabase.from('messages').insert({
            conversation_id: activeConversationId,
            user_id: userId,
            role: 'user',
            content: message.trim(),
          })
        }
      } catch (dbErr) {
        console.warn('[AI Tutor] Non-blocking db save error before Gemini generation:', dbErr)
      }
    }

    // STRICT: Read API key ONLY from process.env.GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'AI_AUTH_ERROR',
          message: 'GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY in your environment to enable AI responses.',
        },
        { status: 503 }
      )
    }

    // Load rich, live student academic context from Supabase
    const studentContext = await buildStudentContext(supabase, userId)
    const { profile, subjects, pendingTasks, skills, projects, syllabusKnowledge } = studentContext
    const studentName = profile?.full_name || (profile as any)?.name || 'Student'
    const careerGoal = profile?.career_goal || (profile as any)?.role || 'Software Engineer'
    const semester = profile?.semester ? `Semester ${profile?.semester}` : 'Current semester'
    const branch = profile?.branch || 'Computer Science & Engineering'
    const cgpa = profile?.cgpa ? `${profile.cgpa}` : 'Not specified'
    const isHinglish = String(language).toLowerCase() === 'hinglish'

    // Format syllabus intelligence for prompt injection
    const syllabusContextStr =
      Array.isArray(syllabusKnowledge) && syllabusKnowledge.length > 0
        ? syllabusKnowledge
            .slice(0, 3)
            .map((sk: any) => {
              const uList = Array.isArray(sk.units)
                ? sk.units
                    .slice(0, 5)
                    .map((u: any) => `Unit ${u.unitNumber}: ${u.title} (${(u.topics || []).slice(0, 4).join(', ')})`)
                    .join('; ')
                : 'General curriculum'
              return `Course "${sk.course_title}" [${sk.course_code || 'Core'}]: ${uList}`
            })
            .join('\n')
        : 'None uploaded yet'

    // Server-side authoritative clock to eliminate stale dates
    const serverNow = new Date()
    const authoritativeDateStr = serverNow.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    })
    const authoritativeTimeStr = serverNow.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
      timeZone: 'UTC',
    })
    const authoritativeYear = serverNow.getUTCFullYear()
    const authoritativeISO = serverNow.toISOString()

    const systemPrompt = `You are YAT, the personal 24/7 AI Academic Tutor, Placement Mentor, and Real-Time Academic Assistant inside YATVERSE (Next-Generation Student OS).

AUTHORITATIVE REAL-TIME SYSTEM CLOCK:
- Current Date: ${authoritativeDateStr}
- Current Time: ${authoritativeTimeStr}
- Current Year: ${authoritativeYear}
- ISO Timestamp: ${authoritativeISO}
- CRITICAL: When the student asks "What is today's date?", "What day is it today?", or questions about the current date/year, ALWAYS answer with this exact authoritative date (${authoritativeDateStr}). Never use outdated pre-training knowledge.

YOUR DUAL-ENGINE CAPABILITY:
1. DEEP ACADEMIC & CODING PEDAGOGY:
   - For standard academic, algorithmic (DSA), data structures, engineering, mathematics, computer science, and theoretical questions:
     * Answer directly using your deep knowledge and pedagogical framework.
     * Prefer intuitive conceptual explanations, concrete visual analogies, and step-by-step reasoning.
     * When teaching programming/DSA: provide clean idiomatic code (C, C++, Java, Python, or JS), step-by-step logic breakdown, and ALWAYS explicitly state Time Complexity and Space Complexity (Big-O notation).
     * When debugging code: analyze the student's exact code, pinpoint the flaw, explain the root cause, and provide the fix.

2. REAL-TIME WEB INFORMATION & LIVE GROUNDING:
   - You are equipped with live Google Search Grounding for real-time, time-sensitive, and up-to-date queries.
   - For questions regarding current news, political leaders (e.g. current Prime Minister, President), recent movie releases & box office collections, current prices, latest software/hardware releases, and sports events:
     * Synthesize and explain the latest facts clearly, accurately, and objectively based on retrieved real-time information.
     * State verifiable details, figures, dates, and names clearly.

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
- Uploaded Syllabus & Curriculum Memory:
${syllabusContextStr}
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
- Personalize answers with student context and uploaded syllabus when helpful, but always address the student's actual question directly first.
- Maintain full continuity across multi-turn conversation. Correctly resolve pronouns and references to prior answers ("that algorithm", "the second loop", "in C++ now").

LANGUAGE & TONE:
${
  isHinglish
    ? `- Hinglish Mode Active: Respond in natural, conversational Indian Hinglish written in clean Roman script (e.g. "Yeh algorithm basically divide-and-conquer strategy use karta hai...", "Haan bhai, current updates ke mutabik..."). Keep technical terms (Array, Recursion, Stack, Time Complexity, Pointer, API, etc.) in English.`
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

    const needsSearch = shouldUseSearchGrounding(message)
    let response: any = null
    let searchGroundingSucceeded = false

    if (needsSearch) {
      // Attempt search grounding for real-time / current information queries with transient retry
      try {
        response = await executeWithTransientRetry(async () => {
          return await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.3,
              tools: [{ googleSearch: {} }],
            },
          })
        }, 1, 1000)
        searchGroundingSucceeded = true
      } catch (searchErr: any) {
        const classified = classifyGeminiError(searchErr)
        // If 429 (quota exceeded) or 401/403 (auth) or 404, throw immediately
        if (classified.status === 429 || classified.status === 401 || classified.status === 403 || classified.status === 404) {
          throw searchErr
        }

        const sanitizedErr = sanitizeForLogging(searchErr?.message || searchErr)
        console.warn('[AI Tutor] Google Search Grounding call encountered an issue, falling back to direct synthesis:', sanitizedErr)

        // Resilient fallback to direct generation with authoritative system clock
        response = await executeWithTransientRetry(async () => {
          return await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.3,
            },
          })
        }, 1, 1000)
      }
    } else {
      // Direct fast evaluation for standard academic / DSA / math / date questions
      response = await executeWithTransientRetry(async () => {
        return await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.3,
          },
        })
      }, 1, 1000)
    }

    // Safely extract text from candidate parts
    const replyText = safeExtractText(response)

    // Handle empty text or safety/filter blocks
    if (!replyText) {
      const firstCandidate = response?.candidates?.[0]
      const finishReason = firstCandidate?.finishReason

      console.warn(
        '[AI Tutor] Gemini response candidate produced no extractable text. FinishReason:',
        finishReason,
        'Candidates structure:',
        JSON.stringify(sanitizeForLogging(response?.candidates), null, 2)
      )

      let userExplanation = 'The AI Tutor was unable to complete the response for this query.'
      if (finishReason === 'SAFETY') {
        userExplanation = 'This response was stopped by safety filters. Please try rephrasing your question.'
      } else if (finishReason === 'RECITATION' || finishReason === 'BLOCKLIST') {
        userExplanation = 'This query touched restricted content guidelines. Please rephrase your question.'
      } else if (finishReason === 'SPII') {
        userExplanation = 'The response was filtered to protect sensitive personal identifiable information.'
      }

      return NextResponse.json(
        {
          error: 'AI_SAFETY_BLOCKED',
          message: userExplanation,
          finishReason: finishReason || 'EMPTY_RESPONSE',
        },
        { status: 422 }
      )
    }

    // Safely extract real-time search grounding metadata
    const { sources, searchQueries } = safeExtractGrounding(response)
    const isRealtime = sources.length > 0 || searchQueries.length > 0 || searchGroundingSucceeded
    const sourceLabel = isRealtime && sources.length > 0 ? 'Gemini 3.6 Flash + Google Search' : 'Gemini 3.6 Flash'

    // Persist AI message and update conversation in Supabase
    let savedAiMessageId: string | null = null
    if (supabase && userId && activeConversationId) {
      try {
        const { data: insertedMsg } = await supabase
          .from('messages')
          .insert({
            conversation_id: activeConversationId,
            user_id: userId,
            role: 'ai',
            content: replyText,
            source: sourceLabel,
            is_realtime: isRealtime,
            sources: sources || [],
            search_queries: searchQueries || [],
          })
          .select('id')
          .maybeSingle()

        if (insertedMsg) savedAiMessageId = insertedMsg.id

        // Auto-update conversation title and updated_at
        const convUpdates: Record<string, any> = {
          updated_at: new Date().toISOString(),
        }

        if (autoTitleNeeded) {
          convUpdates.title = message.trim().slice(0, 45).replace(/[\r\n]+/g, ' ')
        }

        await supabase
          .from('conversations')
          .update(convUpdates)
          .eq('id', activeConversationId)
          .eq('user_id', userId)
      } catch (saveErr) {
        console.warn('[AI Tutor] Could not persist AI message to database:', saveErr)
      }
    }

    const duration = Date.now() - startTime
    console.log(`[AI Tutor] Request succeeded in ${duration}ms (grounded: ${isRealtime})`)

    return NextResponse.json(
      {
        reply: replyText,
        source: sourceLabel,
        isRealtime,
        sources,
        searchQueries,
        conversationId: activeConversationId,
        messageId: savedAiMessageId,
        context: {
          studentName,
          careerGoal,
          subjectsCount: subjects.length,
          pendingTasksCount: pendingTasks.length,
          syllabusUnitsCount: syllabusKnowledge.length,
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
    const classification = classifyGeminiError(error)
    const sanitizedErrorMsg = sanitizeForLogging(error?.message || String(error))
    
    console.error(
      `[AI Tutor] Diagnostic error [${classification.status} - ${classification.error}]:`,
      sanitizedErrorMsg
    )

    // For 429 quota exhaustion, return strict structured response required by spec:
    // { error: "AI_QUOTA_EXCEEDED", message: "Gemini quota or rate limit reached. Please try again later." }
    if (classification.status === 429) {
      return NextResponse.json(
        {
          error: 'AI_QUOTA_EXCEEDED',
          message: 'Gemini quota or rate limit reached. Please try again later.',
        },
        { status: 429 }
      )
    }

    return NextResponse.json(
      {
        error: classification.error,
        message: classification.message,
        details: sanitizedErrorMsg,
      },
      { status: classification.status }
    )
  }
}



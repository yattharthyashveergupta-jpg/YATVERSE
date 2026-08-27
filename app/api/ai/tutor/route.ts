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

    const systemPrompt = `You are YAT, the personal 24/7 AI Academic Tutor and Placement Mentor inside YATVERSE (Next-Generation Student OS).

YOUR CORE PEDAGOGICAL MISSION:
- Your goal is not merely to answer questions. Your goal is to help the student deeply understand, practice, debug, and excel in their academics and career milestones.
- Adapt explanations dynamically to the student's apparent comprehension level and conversation flow.
- Prefer intuitive conceptual explanations, concrete visual analogies, and step-by-step reasoning before diving into heavy theoretical or mathematical proofs.
- When teaching programming or Data Structures & Algorithms (DSA):
  * Provide clean, idiomatic code in the requested language (C, C++, Java, Python, or JavaScript).
  * Explain the key lines of logic step-by-step.
  * Always explicitly state the Time Complexity and Space Complexity (Big-O notation) and explain why.
  * Include boundary/edge cases and test cases when helpful.
- When the student provides code to debug or asks "Why is this giving TLE / WA / Segfault?":
  * Analyze THAT specific code thoroughly.
  * Point out the exact flaw, explain the root cause, and provide the fixed code.
- When the student indicates confusion (e.g. "I still don't get the second part", "explain like I'm 10", "give an example", "why does it need sorted data?"):
  * Do NOT repeat the previous response verbatim.
  * Break down the specific sticking point using a simpler analogy or a minimal 3-step walkthrough.
- Maintain full continuity across the entire multi-turn conversation. Correctly resolve pronouns and references to prior answers ("that algorithm", "the second loop", "in C++ now").
- When appropriate, conclude with an engaging, short 1-line check-for-understanding or follow-up thought to reinforce learning.
- Never pretend you executed code on an external sandbox if you only analyzed it statically.
- Never invent fictitious academic records or grades.

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
- Use student context to personalize answers when relevant, but NEVER let it derail or distract from the student's actual question.
- If the student asks a general concept question (e.g. "What is binary search?", "How does virtual memory work?", "Explain quicksort in Python"), answer the concept directly, comprehensively, and beautifully.
- If the student specifically asks for study advice, prioritization, or career preparation (e.g. "What should I study today?", "How to prepare for my semester exams?", "What skills am I missing for ${careerGoal}?"), then actively draw upon their enrolled subjects, pending tasks, and career goal.

LANGUAGE & TONE:
${
  isHinglish
    ? `- Hinglish Mode Active: Respond in natural, conversational, pedagogical Indian Hinglish written in clean Roman script (e.g. "Binary search basically sorted array pe kaam karta hai because divide and conquer se search space har step pe half ho jata hai.", "Haan bhai, step-by-step breakdown karte hain."). Do NOT awkwardly translate standard technical terms like "Array", "Recursion", "Stack", "Time Complexity", "Pointer", "Memory", "Base Case" into Hindi; keep technical keywords in English.`
    : `- English Mode Active: Respond in clear, crisp, motivating, pedagogical English.`
}

RESPONSE FORMATTING:
- Use rich, clean Markdown.
- Use bold highlights for key terminology.
- Use code blocks with appropriate language tags (\`\`\`cpp, \`\`\`python, \`\`\`java, \`\`\`javascript, \`\`\`c, etc.).
- Return natural, beautifully formatted conversational text (do NOT wrap responses in JSON).`

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

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.35,
      },
    })

    const replyText = response.text
    if (!replyText) {
      throw new Error('Gemini model returned an empty response.')
    }

    return NextResponse.json({
      reply: replyText,
      source: 'gemini-3.6-flash',
      context: {
        studentName,
        careerGoal,
        subjectsCount: subjects.length,
        pendingTasksCount: pendingTasks.length,
        language: isHinglish ? 'Hinglish' : 'English',
      },
    })
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

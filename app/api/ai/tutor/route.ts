import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { GoogleGenAI } from '@google/genai'

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Authenticate session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to use the AI Tutor.' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { message, language = 'Hinglish', history = [] } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'A valid message string is required.' },
        { status: 400 }
      )
    }

    // Load rich student context safely in parallel
    const [profileRes, subjectsRes, tasksRes, skillsRes, careerRes, historyRes] = await Promise.all([
      supabase.from('profiles').select('full_name, college, branch, semester, cgpa, career_goal, preferred_language').eq('id', user.id).maybeSingle(),
      supabase.from('subjects').select('name, code, credits, progress').eq('user_id', user.id).limit(10),
      supabase.from('tasks').select('title, task_type, scheduled_date, duration_minutes, completed').eq('user_id', user.id).eq('completed', false).limit(10),
      supabase.from('skills').select('*').eq('user_id', user.id).limit(10),
      supabase.from('career_applications').select('company_name, role, application_status').eq('user_id', user.id).limit(5),
      supabase.from('academic_history').select('semester, sgpa, cgpa').eq('user_id', user.id).order('semester', { ascending: false }).limit(3),
    ])

    interface StudentProfile {
      full_name?: string | null
      college?: string | null
      branch?: string | null
      semester?: number | null
      cgpa?: number | null
      career_goal?: string | null
      preferred_language?: string | null
    }

    const profile = (profileRes.data as StudentProfile | null) || {}
    const subjects = subjectsRes.data || []
    const pendingTasks = tasksRes.data || []
    const skills = (skillsRes.data || []) as any[]
    const applications = careerRes.data || []
    const academicHistory = historyRes.data || []

    const studentName = profile.full_name || 'Student'
    const careerGoal = profile.career_goal || 'Software Engineer'
    const semester = profile.semester ? `Semester ${profile.semester}` : 'Current semester'
    const currentCgpa = profile.cgpa ? `CGPA: ${profile.cgpa}` : academicHistory[0]?.cgpa ? `CGPA: ${academicHistory[0].cgpa}` : 'Not set'
    const subjectList = subjects.map((s) => `${s.name} (${s.progress}% mastery)`).join(', ') || 'No subjects registered yet'
    const taskList = pendingTasks.map((t) => `${t.title} [${t.task_type || 'task'}${t.duration_minutes ? `, ${t.duration_minutes}m` : ''}]`).join(', ') || 'No pending tasks'
    const skillsList = skills.map((s) => `${s.name} (${s.category || 'Technical'}, ${s.proficiency || 'Intermediate'}, ${s.progress || 0}%)`).join(', ') || 'No skills logged'
    const targetCompanies = applications.map((a) => `${a.company_name} (${a.role} - ${a.application_status})`).join(', ') || 'None yet'

    const isHinglish = language.toLowerCase() === 'hinglish'

    const systemPrompt = `You are YAT, the personal AI Tutor and Academic Mentor for YATVERSE (a next-generation Student OS).
You are tutoring ${studentName}.

Student Context:
- Institution & Degree: ${profile.college || 'University'} | ${profile.branch || 'Computer Science'} (${semester})
- Academic Record: ${currentCgpa}
- Target Career Role: ${careerGoal}
- Enrolled Subjects: ${subjectList}
- Pending Academic Tasks: ${taskList}
- Tracked Skills: ${skillsList}
- Career Pipeline: ${targetCompanies}
- Preferred Language Mode: ${language}

Language & Tone Guidelines:
${isHinglish ? '- Respond in natural, encouraging conversational Hinglish using clean Roman script (e.g. "Bilkul!", "Haan bhai, step-by-step samajhte hain", "Yeh logic bahut simple hai").' : '- Respond in clear, crisp, motivating, pedagogical English.'}
- Teach with intuitive real-world analogies first, followed by clean code/syntax or step-by-step mathematical logic.
- Directly connect theoretical subject concepts to the student\'s target role (${careerGoal}) and exams.
- Keep your answers beautifully structured with bold titles, concise bullet points, and code blocks where helpful.`

    // Check for official GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey })

        // Format history for multi-turn if provided
        const contents: any[] = []
        if (Array.isArray(history) && history.length > 0) {
          for (const item of history.slice(-6)) {
            contents.push({
              role: item.from === 'user' ? 'user' : 'model',
              parts: [{ text: item.text }],
            })
          }
        }

        contents.push({
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nStudent asks: ${message}` }],
        })

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
        })

        const replyText = response.text
        if (replyText) {
          return NextResponse.json({
            reply: replyText,
            source: 'gemini-2.5-flash',
            context: {
              studentName,
              careerGoal,
              subjectsCount: subjects.length,
              pendingTasksCount: pendingTasks.length,
            },
          })
        }
      } catch (geminiError) {
        console.warn('Gemini generateContent call error:', geminiError)
      }
    }

    // High-yield contextual synthesis engine fallback
    const reply = generateContextualTutorResponse(message, {
      studentName,
      careerGoal,
      semester,
      subjects,
      pendingTasks,
      skills,
      language,
    })

    return NextResponse.json({
      reply,
      source: 'yatverse-engine',
      context: {
        studentName,
        careerGoal,
        subjectsCount: subjects.length,
        pendingTasksCount: pendingTasks.length,
      },
    })
  } catch (error: any) {
    console.error('AI Tutor API error:', error)
    return NextResponse.json(
      { error: error?.message || 'An error occurred while generating a response.' },
      { status: 500 }
    )
  }
}

function generateContextualTutorResponse(
  query: string,
  context: {
    studentName: string
    careerGoal: string
    semester: string
    subjects: any[]
    pendingTasks: any[]
    skills: any[]
    language: string
  }
): string {
  const q = query.toLowerCase()
  const isHinglish = context.language.toLowerCase() === 'hinglish'

  if (q.includes('binary search') || q.includes('search')) {
    return isHinglish
      ? `Haan ${context.studentName}! Binary Search ka core principle hai **Divide and Conquer**.\n\n` +
          `1. **Prerequisite:** Array must be sorted.\n` +
          `2. **Algorithm:** \n` +
          `   - \`low = 0\`, \`high = n - 1\`\n` +
          `   - Har iteration mein \`mid = low + Math.floor((high - low) / 2)\` calculate karo.\n` +
          `   - Agar \`arr[mid] === target\`, element mil gaya!\n` +
          `   - Agar \`target < arr[mid]\`, to \`high = mid - 1\` (left half).\n` +
          `   - Agar \`target > arr[mid]\`, to \`low = mid + 1\` (right half).\n\n` +
          `**Time Complexity:** O(log N) — har step pe half search space eliminate hota hai.\n\n` +
          `Yeh aapke ${context.careerGoal} roadmap aur technical interviews ke liye sabse foundational pattern hai! Ek quick problem solve karke test karein?`
      : `Great question, ${context.studentName}! Here is the intuition behind **Binary Search**:\n\n` +
          `1. **Condition:** The input array must be sorted in ascending order.\n` +
          `2. **How it works:** Instead of checking elements one by one (O(N)), you check the middle element \`mid = low + Math.floor((high - low) / 2)\`.\n` +
          `3. If target matches \`arr[mid]\`, return index.\n` +
          `4. If target is smaller, search left half (\`high = mid - 1\`). If larger, search right half (\`low = mid + 1\`).\n\n` +
          `**Time Complexity:** O(log N) with O(1) auxiliary space.\n\n` +
          `This is a mandatory pattern for your ${context.careerGoal} interviews and DSA assessments. Would you like a coding exercise on this?`
  }

  if (q.includes('recursion') || q.includes('recursive')) {
    return isHinglish
      ? `Bilkul ${context.studentName}! Recursion ka simple rule hai:\n\n` +
          `**"Ek problem ko uske smaller sub-problems mein todna, aur ek Base Case define karna taaki function infinite loop mein na phase."**\n\n` +
          `**Structure:**\n` +
          `1. **Base Case:** Kab rukna hai (e.g. \`if (n <= 1) return 1\`).\n` +
          `2. **Recursive Call:** Function khud ko smaller input ke saath call karta hai (e.g. \`n * factorial(n - 1)\`).\n` +
          `3. **Call Stack:** Har call memory ke stack frame mein jaati hai jab tak base case hit na ho.\n\n` +
          `Aapke subjects (${context.subjects.map((s) => s.name).slice(0, 2).join(', ') || 'DSA'}) ke Trees and Graphs concepts poore recursion pe based hain!`
      : `Here is how **Recursion** works, ${context.studentName}:\n\n` +
          `Recursion is when a function calls itself to solve smaller instances of the same problem.\n\n` +
          `**Key Components:**\n` +
          `1. **Base Case:** The terminating condition that prevents infinite stack overflow.\n` +
          `2. **Recursive Step:** Calling the function with a strictly smaller sub-problem.\n` +
          `3. **Stack Unwinding:** Results propagate back up the call stack to form the final solution.\n\n` +
          `Mastering recursion directly accelerates your understanding of Trees, Dynamic Programming, and Graph Traversals for ${context.careerGoal}.`
  }

  if (q.includes('quiz') || q.includes('test') || q.includes('practice')) {
    return isHinglish
      ? `Aao quick test karte hain, ${context.studentName}!\n\n` +
          `**Question:**\n` +
          `Given a sorted array of 1,000,000 elements, Binary Search maximum kitne comparisons karega target dhundhne ke liye?\n\n` +
          `A) 1000\n` +
          `B) 20\n` +
          `C) 500\n` +
          `D) 10\n\n` +
          `Apna answer send karo!`
      : `Quick Quiz for you, ${context.studentName}!\n\n` +
          `**Question:**\n` +
          `In a sorted array of 1,000,000 elements, what is the maximum number of comparisons Binary Search will make in the worst case?\n\n` +
          `A) 1,000\n` +
          `B) 20\n` +
          `C) 500\n` +
          `D) 10\n\n` +
          `Reply with your choice!`
  }

  if (q.includes('note') || q.includes('revision') || q.includes('summary')) {
    const topSubject = context.subjects[0]?.name || 'Core Computing'
    return isHinglish
      ? `Yeh raha aapka personalized revision sheet for **${topSubject}**:\n\n` +
          `📌 **Key Focus Areas:**\n` +
          `- Time vs Space Complexity trade-offs\n` +
          `- Core algorithmic patterns (Two Pointers, Sliding Window, Fast-Slow Pointers)\n` +
          `- Edge Cases: Empty input, single element, negative numbers, duplicates\n\n` +
          `⚡ **Next Action:** Schedule a 30-min focused session in your Study Planner to lock this in.`
      : `Here is your high-yield revision summary for **${topSubject}**:\n\n` +
          `📌 **Key Takeaways:**\n` +
          `- Time & Space Complexity Big-O bounds\n` +
          `- Foundational patterns: Two Pointers, Divide & Conquer, Sliding Window\n` +
          `- Edge Cases: Boundary checks, null inputs, overflow handling\n\n` +
          `⚡ **Recommended Next Step:** Add a quick 30-minute review block in your Study Planner today.`
  }

  // General response
  const nextTask = context.pendingTasks[0]?.title || 'study block'
  return isHinglish
    ? `Main samajh gaya ${context.studentName}! Aapka current target ${context.careerGoal} hai aur semester progress smooth chal rahi hai.\n\n` +
        `Aapka next priority task: **"${nextTask}"**.\n\n` +
        `Aap mujhse kisi bhi subject ke concept ki simple explanation, code walkthrough, quiz ya interview preparation ke questions pooch sakte hain. Kis topic pe help chahiye?`
    : `Understood, ${context.studentName}! I have synthesized your current coursework and career trajectory towards **${context.careerGoal}**.\n\n` +
        `Your immediate priority task: **"${nextTask}"**.\n\n` +
        `Feel free to ask me to break down any algorithm, generate practice quizzes, debug code patterns, or draft revision notes. What would you like to explore next?`
}

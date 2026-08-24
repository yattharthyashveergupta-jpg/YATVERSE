import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

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

    // Load student context safely in parallel
    const [profileRes, subjectsRes, tasksRes, skillsRes, careerRes] = await Promise.all([
      supabase.from('profiles').select('full_name, college, branch, semester, cgpa, career_goal, preferred_language').eq('id', user.id).maybeSingle(),
      supabase.from('subjects').select('name, code, credits, progress').eq('user_id', user.id).limit(10),
      supabase.from('tasks').select('title, task_type, scheduled_date, duration_minutes, completed').eq('user_id', user.id).eq('completed', false).limit(10),
      supabase.from('skills').select('*').eq('user_id', user.id).limit(10),
      supabase.from('career_applications').select('company_name, role, application_status').eq('user_id', user.id).limit(5),
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

    const studentName = profile.full_name || 'Student'
    const careerGoal = profile.career_goal || 'Software Engineer'
    const semester = profile.semester ? `Semester ${profile.semester}` : 'Current semester'
    const currentCgpa = profile.cgpa ? `CGPA: ${profile.cgpa}` : ''
    const subjectList = subjects.map((s) => `${s.name} (${s.progress}% mastery)`).join(', ') || 'No subjects registered yet'
    const taskList = pendingTasks.map((t) => `${t.title} [${t.task_type || 'task'}${t.duration_minutes ? `, ${t.duration_minutes}m` : ''}]`).join(', ') || 'No pending tasks'
    const skillsList = skills.map((s) => `${s.name} (${s.category || 'Technical'}${s.level != null ? `, Level ${s.level}` : s.proficiency ? `, ${s.proficiency}` : ''})`).join(', ') || 'No skills logged'
    const targetCompanies = applications.map((a) => `${a.company_name} (${a.role} - ${a.application_status})`).join(', ') || 'None yet'

    const systemPrompt = `You are YAT, the personal AI Tutor and Academic Mentor for YATVERSE (a next-generation Student OS).
You are tutoring ${studentName}.
Student Profile:
- College / Branch: ${profile.college || 'University'} | ${profile.branch || 'Computer Science'} (${semester})
- Current CGPA: ${currentCgpa || 'Not set'}
- Target Career Role: ${careerGoal}
- Current Enrolled Subjects: ${subjectList}
- Pending Academic Tasks: ${taskList}
- Tracked Skills: ${skillsList}
- Career & Company Pipeline: ${targetCompanies}
- Preferred Language: ${language} (if Hinglish, speak in natural conversational Hinglish using Roman script like "Bilkul!", "Haan bhai", "Samajhte hain step-by-step"; if English, speak in clear, crisp, encouraging English).

Guidelines:
1. Ground your answers in the student's actual enrolled subjects, tasks, and career goals when relevant.
2. Be direct, clear, highly encouraging, and pedagogically sound. Explain complex CS/engineering concepts using intuitive analogies first, followed by clear concise code or step-by-step logic.
3. Keep responses concise, structured, and easy to read on a mobile or laptop screen. Avoid generic fluff.
4. When appropriate, recommend how learning this topic helps their current semester subjects or career target (${careerGoal}).`

    // Check for external AI API key (e.g., GEMINI_API_KEY)
    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }],
                },
              ],
              generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.7,
              },
            }),
          }
        )

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json()
          const aiResponse =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
          if (aiResponse) {
            return NextResponse.json({
              reply: aiResponse,
              source: 'gemini',
              context: {
                studentName,
                careerGoal,
                subjectsCount: subjects.length,
                pendingTasksCount: pendingTasks.length,
              },
            })
          }
        }
      } catch (externalErr) {
        console.warn('External AI API call failed, falling back to local synthesis engine:', externalErr)
      }
    }

    // High-quality deterministic contextual synthesis fallback engine
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
  } catch (error) {
    console.error('AI Tutor API error:', error)
    return NextResponse.json(
      { error: 'An error occurred while generating a response. Please try again.' },
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

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
      if (user) userId = user.id
    } catch (authErr) {
      console.warn('Supabase auth in AI plan route:', authErr)
    }

    const body = await req.json().catch(() => ({}))
    const type = body.type || 'roadmap' // 'roadmap' | 'placement' | 'schedule'
    const customGoal = body.customGoal || ''

    // Load full student context from database
    const studentContext = await buildStudentContext(supabase, userId)
    const { profile, subjects, pendingTasks, skills, applications, contextSummary } = studentContext
    const studentName = profile.full_name || 'Student'
    const careerGoal = customGoal || profile.career_goal || 'Software Engineer'
    const branch = profile.branch || 'Engineering'
    const semester = profile.semester || 4

    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        })

        let systemPrompt = ''
        if (type === 'roadmap') {
          systemPrompt = `You are the chief academic and career strategist for YATVERSE.
Generate a tailored 5-stage career mastery roadmap for ${studentName} (${branch}, Semester ${semester}) aiming for "${careerGoal}".
You MUST ground every stage in their enrolled subjects (${subjects.map((s) => s.name).join(', ') || 'Core CS'}), tracked skills (${skills.map((s) => s.name).join(', ') || 'Programming foundations'}), and semester timeline.

Return pure JSON with no markdown wrapping:
{
  "title": "Role-Aligned Career Roadmap: ${careerGoal}",
  "estimatedCompletionWeeks": 16,
  "milestones": [
    {
      "stageNumber": 1,
      "title": "Milestone Title",
      "description": "Specific objectives connecting academic coursework to career requirements.",
      "domain": "e.g. Algorithms | Systems | Cloud | Portfolio",
      "estimatedHours": 20,
      "keyTopics": ["Topic 1", "Topic 2", "Topic 3"],
      "suggestedTasks": ["Build X", "Complete problem set Y"]
    }
  ],
  "strategicAdvice": "1-2 sentences of high-yield tactical advice."
}`
        } else if (type === 'placement') {
          systemPrompt = `You are a university placement coordinator and tech interview coach.
Generate a targeted Placement Sprint Plan for ${studentName} aiming for "${careerGoal}".
Current Applications: ${applications.map((a) => `${a.company_name} (${a.role})`).join(', ') || 'Preparing initial pipeline'}.
Skills: ${skills.map((s) => `${s.name} (${s.proficiency || 'Intermediate'})`).join(', ')}.

Return pure JSON with no markdown wrapping:
{
  "readinessScore": 75,
  "priorityFocusAreas": [
    {
      "area": "Area Name (e.g. System Design, DSA Patterns)",
      "importance": "High",
      "actionPlan": "Concrete steps to be interview-ready."
    }
  ],
  "sprintTimeline": [
    {
      "week": "Week 1-2",
      "focus": "Core Fundamentals & Resume Optimization",
      "deliverables": ["Deliverable 1", "Deliverable 2"]
    },
    {
      "week": "Week 3-4",
      "focus": "Company-Specific Mock Drills & Problem Sprints",
      "deliverables": ["Deliverable 1", "Deliverable 2"]
    }
  ],
  "mockInterviewQuestions": [
    "Technical or architectural question customized to ${careerGoal}",
    "Domain-specific problem statement"
  ]
}`
        } else {
          systemPrompt = `You are an expert academic time-blocking coach.
Generate an optimal weekly study schedule for ${studentName} based on their pending tasks (${pendingTasks.map((t) => t.title).join(', ') || 'Course assignments'}) and subjects (${subjects.map((s) => s.name).join(', ') || 'Current semester'}).

Return pure JSON with no markdown wrapping:
{
  "weeklyTotalHours": 18,
  "dailyBlocks": [
    {
      "day": "Monday",
      "focusSubject": "Subject or Project",
      "timeSlot": "6:00 PM - 8:30 PM",
      "task": "Specific task to accomplish",
      "durationMinutes": 150
    }
  ],
  "productivityTip": "Practical advice for sustaining deep focus."
}`
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: [
            {
              role: 'user',
              parts: [{ text: `Student Context:\n${contextSummary}\n\nGenerate the requested plan.` }],
            },
          ],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        })

        if (response.text) {
          const cleaned = response.text.replace(/^```json/i, '').replace(/```$/i, '').trim()
          const parsed = JSON.parse(cleaned)
          return NextResponse.json({
            success: true,
            source: 'gemini-3.6-flash',
            plan: parsed,
          })
        }
      } catch (geminiError: any) {
        console.warn('Gemini Plan generation error:', geminiError?.message || geminiError)
      }
    }

    // Contextual Fallback Generator
    const fallbackPlan = generateFallbackPlan(type, {
      studentName,
      careerGoal,
      branch,
      semester,
      subjects,
      skills,
      applications,
      pendingTasks,
    })

    return NextResponse.json({
      success: true,
      source: 'yatverse-engine',
      plan: fallbackPlan,
    })
  } catch (error: any) {
    console.error('Fatal plan generation error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate plan.' },
      { status: 500 }
    )
  }
}

function generateFallbackPlan(
  type: string,
  ctx: {
    studentName: string
    careerGoal: string
    branch: string
    semester: number
    subjects: any[]
    skills: any[]
    applications: any[]
    pendingTasks: any[]
  }
) {
  if (type === 'placement') {
    return {
      readinessScore: Math.min(90, Math.max(30, (ctx.skills.length + ctx.applications.length) * 12)),
      priorityFocusAreas: [
        {
          area: 'Data Structures & Algorithms',
          importance: 'Critical',
          actionPlan: 'Solve 2-3 medium LeetCode/GFG questions daily focusing on arrays, two pointers, and trees.',
        },
        {
          area: `${ctx.careerGoal} Domain Expertise`,
          importance: 'High',
          actionPlan: 'Consolidate 2 showcase portfolio projects with clean README and live deployment.',
        },
        {
          area: 'Core Computer Science Fundamentals',
          importance: 'High',
          actionPlan: `Review OS, DBMS, and Computer Networks concepts aligned with your ${ctx.branch} coursework.`,
        },
      ],
      sprintTimeline: [
        {
          week: 'Week 1-2: Foundations & Resume',
          focus: 'Master Top 50 LeetCode Patterns & Polish Technical Resume',
          deliverables: ['1-page ATS friendly resume', 'Review binary search, sliding window, and graph BFS/DFS'],
        },
        {
          week: 'Week 3-4: Company Targeting & Applications',
          focus: 'Targeted outreach & Technical Mock Drills',
          deliverables: ['Apply to 10 verified openings', 'Conduct 2 peer mock interviews with behavioral prep'],
        },
      ],
      mockInterviewQuestions: [
        `Explain how you would design a scalable backend or service for a high-traffic ${ctx.careerGoal} system.`,
        'Walk through the trade-offs between relational and NoSQL databases for real-time applications.',
      ],
    }
  }

  if (type === 'schedule') {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const blocks = days.map((day, i) => {
      const subj = ctx.subjects[i % (ctx.subjects.length || 1)]?.name || 'Technical Problem Solving'
      return {
        day,
        focusSubject: subj,
        timeSlot: i % 2 === 0 ? '6:00 PM - 8:00 PM' : '7:00 PM - 9:00 PM',
        task: `Deep study on ${subj} & ${ctx.careerGoal} skill practice`,
        durationMinutes: 120,
      }
    })

    return {
      weeklyTotalHours: 14,
      dailyBlocks: blocks,
      productivityTip: 'Use 50-minute focused Pomodoro blocks with 10-minute breaks to maintain peak retention.',
    }
  }

  // Default: Roadmap
  return {
    title: `Role-Aligned Roadmap: ${ctx.careerGoal}`,
    estimatedCompletionWeeks: 16,
    milestones: [
      {
        stageNumber: 1,
        title: 'Core Computational & Language Mastery',
        description: `Master core programming and object-oriented principles in your ${ctx.branch} curriculum.`,
        domain: 'Foundations',
        estimatedHours: 25,
        keyTopics: ['Memory management', 'Object-Oriented Design', 'Time and Space Complexity'],
        suggestedTasks: ['Implement standard data structures from scratch', 'Review college lab assignments'],
      },
      {
        stageNumber: 2,
        title: 'Algorithms & Problem Solving Rigor',
        description: 'Master medium-to-hard algorithmic patterns required for top engineering roles.',
        domain: 'DSA',
        estimatedHours: 35,
        keyTopics: ['Dynamic Programming', 'Graph Algorithms', 'Greedy Techniques'],
        suggestedTasks: ['Complete 75 curated algorithmic problems', 'Practice speed coding on YATVERSE'],
      },
      {
        stageNumber: 3,
        title: `${ctx.careerGoal} Systems & Frameworks`,
        description: `Hands-on expertise in industry-standard tools and frameworks for ${ctx.careerGoal}.`,
        domain: 'Architecture',
        estimatedHours: 30,
        keyTopics: ['REST & RPC APIs', 'Database indexing & transactions', 'System Modularity'],
        suggestedTasks: ['Build full-stack authenticated service', 'Integrate continuous testing'],
      },
      {
        stageNumber: 4,
        title: 'Production Capstone & Proof of Work',
        description: 'Ship an end-to-end deployed capstone project solving a real-world problem.',
        domain: 'Capstone',
        estimatedHours: 30,
        keyTopics: ['Production deployment', 'Telemetry & Performance tuning', 'Documentation'],
        suggestedTasks: ['Deploy project with live demo', 'Write detailed architectural case study'],
      },
      {
        stageNumber: 5,
        title: 'Placement Readiness & Interview Sprints',
        description: 'Company-specific prep, behavioral stories, and mock interview drills.',
        domain: 'Placement',
        estimatedHours: 20,
        keyTopics: ['System Design drills', 'Resume screening optimization', 'Behavioral STAR stories'],
        suggestedTasks: ['Conduct 3 live mock interviews', 'Submit applications to target companies'],
      },
    ],
    strategicAdvice: `Align your semester ${ctx.semester} project submissions directly with your ${ctx.careerGoal} portfolio to maximize efficiency.`,
  }
}

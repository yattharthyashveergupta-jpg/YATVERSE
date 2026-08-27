import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { GoogleGenAI } from '@google/genai'
import { buildStudentContext } from '@/lib/ai-student-context'

export async function GET(req: Request) {
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
      console.warn('Supabase auth in AI insights route:', authErr)
    }

    const studentContext = await buildStudentContext(supabase, userId)
    const { profile, subjects, pendingTasks, skills, careerGoal, contextSummary } = studentContext
    const studentName = profile.full_name || 'Student'

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

        const systemInstruction = `You are YAT Daily Focus Intelligence, an academic strategist for YATVERSE.
Based on the student's real context, determine today's #1 highest-leverage study priority.
Return pure JSON with no markdown wrapping:
{
  "focusSubject": "Subject name or skill",
  "headline": "Punchy 1-line reason why this is top priority today",
  "whyItMatters": "2-sentence strategic rationale connecting upcoming deadlines, semester exams, or career goal (${careerGoal})",
  "recommendedAction": "Exact concrete action to do right now (e.g. 'Solve 3 Dynamic Programming problems on LeetCode' or 'Complete Unit 3 notes on Virtual Memory')",
  "estimatedTimeMinutes": 45,
  "urgencyTier": "Critical" | "High" | "Medium",
  "keyDeliverable": "What they will have completed by end of session"
}`

        const promptText = `Analyze this student context and generate today's highest priority insight:\n${contextSummary}`

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          config: {
            systemInstruction,
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        })

        if (response.text) {
          const cleaned = response.text.replace(/^```json/i, '').replace(/```$/i, '').trim()
          const parsed = JSON.parse(cleaned)
          return NextResponse.json({
            success: true,
            source: 'gemini-3.6-flash',
            insight: parsed,
          })
        }
      } catch (err: any) {
        console.error('Gemini AI insights error:', err?.message || err)
      }
    }

    // Contextual fallback insight based on real data
    const topSubject = subjects[0]?.name || 'Core Engineering Coursework'
    const topTask = pendingTasks[0]?.title || 'Review pending semester syllabus topics'
    
    return NextResponse.json({
      success: true,
      source: 'yatverse-insight-engine',
      insight: {
        focusSubject: topSubject,
        headline: `Your highest priority today is ${topSubject} to maintain semester momentum.`,
        whyItMatters: `Aligns with your target role as a ${careerGoal}. Completing foundational modules early prevents exam cramming and strengthens your placement portfolio.`,
        recommendedAction: topTask,
        estimatedTimeMinutes: 45,
        urgencyTier: pendingTasks.length > 0 ? 'High' : 'Medium',
        keyDeliverable: `Finish active review and log progress in your Study Planner.`,
      },
    })
  } catch (error: any) {
    console.error('Fatal AI insights error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate daily AI insights.' },
      { status: 500 }
    )
  }
}

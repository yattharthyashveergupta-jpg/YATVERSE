import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { action, resumeData, targetRole, bulletPoint, projectItem } = body

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured.' },
        { status: 500 }
      )
    }

    const ai = new GoogleGenAI({ apiKey })

    if (action === 'ats_audit') {
      const prompt = `You are a Principal Tech Recruiter and ATS (Applicant Tracking System) Algorithm Auditor.
Analyze the following student resume data against the target role: "${targetRole || 'Software Engineer'}".

Resume Data:
${JSON.stringify(resumeData, null, 2)}

Provide a strict, data-driven ATS assessment in pure valid JSON with format:
{
  "atsScore": 82, // integer 0-100
  "summaryRating": "Strong / Competitive / Needs Work",
  "matchedKeywords": ["TypeScript", "Data Structures", "PostgreSQL", "REST APIs"],
  "missingKeywords": ["Docker", "CI/CD Pipelines", "System Design", "Unit Testing"],
  "strengths": ["Clear technical stack definition", "Good academic standing and relevant coursework"],
  "weaknesses": ["Lack of quantified metrics in project outcomes", "Action verbs need more impact"],
  "actionableImprovements": [
    "Add specific percentage latency reductions or user counts to projects.",
    "Include target keywords: ${targetRole} fundamentals in the skills section.",
    "Ensure contact details and GitHub URLs are formatted cleanly without special characters."
  ]
}`

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      })

      const text = response.text || '{}'
      const parsed = JSON.parse(text)
      return NextResponse.json({ audit: parsed })
    }

    if (action === 'polish_bullet') {
      const prompt = `You are an executive resume writing coach.
Transform the following raw resume bullet point into 3 distinct, high-impact versions using Google's XYZ Formula ("Accomplished [X] as measured by [Y], by doing [Z]") and strong action verbs (Architected, Engineered, Optimized, Spearheaded, Deployed).

Target Role: ${targetRole || 'Software Engineer'}
Original Bullet: "${bulletPoint}"

Return pure valid JSON:
{
  "improvedBullets": [
    "Option 1 using quantitative metrics and strong verb",
    "Option 2 focusing on system architecture & scalability",
    "Option 3 concise high-density ATS-optimized phrasing"
  ],
  "critique": "Brief 1-sentence note explaining what was enhanced."
}`

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      })

      const text = response.text || '{}'
      const parsed = JSON.parse(text)
      return NextResponse.json({ result: parsed })
    }

    if (action === 'project_polish') {
      const prompt = `You are a Senior Staff Engineer and Tech Lead.
Polish the description and bullet points of this student project for a software engineering resume targeting "${targetRole || 'Full Stack Engineer'}".

Project Name: ${projectItem?.name || 'Academic Project'}
Tech Stack: ${projectItem?.stack || 'TypeScript, React'}
Raw Description: ${projectItem?.desc || ''}

Return pure valid JSON:
{
  "polishedTitle": "Enhanced concise project title",
  "recommendedStack": "Optimized stack string with industry standard tools",
  "bulletPoints": [
    "Bullet 1: Architecture & core achievement with metrics",
    "Bullet 2: Implementation challenge, algorithms, or API design",
    "Bullet 3: Performance, testing, or deployment pipeline impact"
  ],
  "interviewTalkingPoints": [
    "Key engineering tradeoff to highlight during interviews",
    "How to explain the architecture cleanly"
  ]
}`

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      })

      const text = response.text || '{}'
      const parsed = JSON.parse(text)
      return NextResponse.json({ result: parsed })
    }

    if (action === 'generate_summary') {
      const prompt = `You are a professional resume writer for top tech universities.
Generate 2 tailored professional summaries (2-3 sentences max) for a student resume.

Candidate Profile:
- Role Target: ${targetRole || 'Software Engineer'}
- Major / Degree: ${resumeData?.education?.degree || 'Computer Science & Engineering'}
- Top Skills: ${(resumeData?.skills || []).slice(0, 8).join(', ')}
- CGPA: ${resumeData?.education?.cgpa || '8.5'}

Return pure valid JSON:
{
  "summaries": [
    "Professional summary 1 (focused on technical depth, problem solving, and impact)",
    "Professional summary 2 (focused on hands-on project execution, modern stack, and academic excellence)"
  ]
}`

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.5,
        },
      })

      const text = response.text || '{}'
      const parsed = JSON.parse(text)
      return NextResponse.json({ result: parsed })
    }

    return NextResponse.json({ error: 'Unknown action requested.' }, { status: 400 })
  } catch (err: any) {
    console.error('AI Resume API Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to process AI resume request.' },
      { status: 500 }
    )
  }
}

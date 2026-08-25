import { GoogleGenAI } from '@google/genai'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface StudentContextData {
  userId: string
  fullName: string
  college: string
  branch: string
  semester: string
  semesterNumber: number
  cgpa: string
  careerGoal: string
  preferredLanguage: string
  subjects: Array<{ id: string; name: string; code: string | null; credits: number; progress: number }>
  tasks: Array<{ id: string; subject_id: string | null; title: string; task_type: string | null; duration_minutes: number | null; scheduled_date: string | null; completed: boolean }>
  pendingTasks: Array<{ id: string; subject_id: string | null; title: string; task_type: string | null; duration_minutes: number | null; scheduled_date: string | null; completed: boolean }>
  skills: Array<{ id: string; name: string; category: string | null; proficiency: string | null; progress: number }>
  applications: Array<{ id: string; company_name: string; role: string; application_status: string; deadline: string | null }>
  projects: Array<{ id: string; title: string; tech_stack: string | null; status: string | null }>
  academicHistory: Array<{ semester: number; sgpa: number | null; cgpa: number | null }>
  profile: {
    full_name?: string | null
    college?: string | null
    branch?: string | null
    semester?: number | null
    cgpa?: number | null
    career_goal?: string | null
    preferred_language?: string | null
  }
  contextSummary: string
}

/**
 * Initializes the server-side Google GenAI client with official telemetry headers.
 */
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  })
}

/**
 * Loads sanitized student context from Supabase in parallel.
 * Supports both (supabase, userId) and (userId, supabase) parameter order.
 */
export async function buildStudentContext(param1: any, param2: any): Promise<StudentContextData> {
  const supabase: SupabaseClient = param1 && typeof param1.from === 'function' ? param1 : param2
  const userId: string = typeof param1 === 'string' ? param1 : typeof param2 === 'string' ? param2 : ''

  if (!supabase || !userId) {
    return {
      userId: userId || 'anonymous',
      fullName: 'Student',
      college: 'Engineering College',
      branch: 'Computer Science',
      semester: 'Semester 4',
      semesterNumber: 4,
      cgpa: 'Not specified',
      careerGoal: 'Software Engineer',
      preferredLanguage: 'Hinglish',
      subjects: [],
      tasks: [],
      pendingTasks: [],
      skills: [],
      applications: [],
      projects: [],
      academicHistory: [],
      profile: {
        full_name: 'Student',
        college: 'Engineering College',
        branch: 'Computer Science',
        semester: 4,
        career_goal: 'Software Engineer',
      },
      contextSummary: 'Student: Computer Science, Semester 4. Target: Software Engineer.',
    }
  }

  const [
    profileRes,
    subjectsRes,
    tasksRes,
    skillsRes,
    careerRes,
    projectsRes,
    historyRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('subjects').select('id, name, code, credits, progress').eq('user_id', userId).order('name'),
    supabase.from('tasks').select('id, subject_id, title, task_type, duration_minutes, scheduled_date, completed').eq('user_id', userId).order('completed').order('scheduled_date', { ascending: true, nullsFirst: false }),
    supabase.from('skills').select('id, name, category, proficiency, progress').eq('user_id', userId),
    supabase.from('career_applications').select('id, company_name, role, application_status, deadline').eq('user_id', userId),
    supabase.from('projects').select('id, title, tech_stack, status').eq('user_id', userId).catch(() => ({ data: [] })),
    supabase.from('academic_history').select('semester, sgpa, cgpa').eq('user_id', userId).order('semester', { ascending: false }),
  ])

  const profile = profileRes.data || {}
  const subjects = subjectsRes.data || []
  const tasks = tasksRes.data || []
  const pendingTasks = tasks.filter((t: any) => !t.completed)
  const skills = skillsRes.data || []
  const applications = careerRes.data || []
  const projects = (projectsRes && 'data' in projectsRes ? projectsRes.data : []) || []
  const academicHistory = historyRes.data || []

  const fullName = profile.full_name || 'Student'
  const college = profile.college || 'Engineering College'
  const branch = profile.branch || 'Computer Science'
  const semNum = Number(profile.semester) || 4
  const semester = `Semester ${semNum}`
  const cgpa = profile.cgpa ? String(profile.cgpa) : academicHistory[0]?.cgpa ? String(academicHistory[0].cgpa) : 'Not specified'
  const careerGoal = profile.career_goal || 'Software Engineer'
  const preferredLanguage = profile.preferred_language || 'Hinglish'

  const subjectList = subjects.map((s: any) => `${s.name} (${s.progress}% mastery, ${s.credits} cr)`).join(', ') || 'No subjects enrolled'
  const pendingTaskList = pendingTasks.slice(0, 8).map((t: any) => `${t.title} [${t.task_type || 'task'}${t.duration_minutes ? `, ${t.duration_minutes}m` : ''}]`).join(', ') || 'No pending tasks'
  const skillsList = skills.map((s: any) => `${s.name} (${s.proficiency || 'Intermediate'}, ${s.progress || 0}%)`).join(', ') || 'No skills logged'
  const targetCompanies = applications.map((a: any) => `${a.company_name} (${a.role} - ${a.application_status})`).join(', ') || 'No applications yet'
  const projectsList = projects.map((p: any) => `${p.title} (${p.tech_stack || 'Code'})`).join(', ') || 'No showcase projects'

  const contextSummary = `- Student: ${fullName} (${college}, ${branch}, ${semester})
- Academic Record: CGPA ${cgpa}
- Target Career Role: ${careerGoal}
- Enrolled Coursework: ${subjectList}
- Pending Academic Tasks: ${pendingTaskList}
- Tracked Skills: ${skillsList}
- Showcase Projects: ${projectsList}
- Placement Pipeline: ${targetCompanies}
- Preferred Language: ${preferredLanguage}`

  return {
    userId,
    fullName,
    college,
    branch,
    semester,
    semesterNumber: semNum,
    cgpa,
    careerGoal,
    preferredLanguage,
    subjects,
    tasks,
    pendingTasks,
    skills,
    applications,
    projects,
    academicHistory,
    profile,
    contextSummary,
  }
}

/**
 * Clean and parse JSON response from Gemini.
 */
export function parseGeminiJson<T>(rawText: string, fallback: T): T {
  try {
    if (!rawText) return fallback
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
    return JSON.parse(cleaned) as T
  } catch (err) {
    console.warn('Failed to parse Gemini JSON output:', err, rawText)
    return fallback
  }
}

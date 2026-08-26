'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { AcademicCoreWorkspace, useAcademicCore } from '@/components/academic-core'
import { NotificationCenter } from '@/components/notification-center'
import { StudyPlanner } from '@/components/study-planner'
import { SkillsWorkspace, useSkills } from '@/components/skills-workspace'
import { AcademicHistoryWorkspace, useAcademicHistory } from '@/components/academic-history'
import { CareerWorkspace, useCareerApplications } from '@/components/career-workspace'
import { ProjectsWorkspace } from '@/components/projects-workspace'
import { LearningWorkspace } from '@/components/learning-workspace'
import { TutorWorkspace } from '@/components/tutor-workspace'
import { SyllabusWorkspace } from '@/components/syllabus-workspace'
import { Roadmap, Placement } from '@/components/career-roadmap'
import { ResumeBuilder } from '@/components/resume-builder'
import { SettingsWorkspace } from '@/components/settings-workspace'
import { NotesWorkspace } from '@/components/notes-workspace'
import { RevisionWorkspace } from '@/components/revision-workspace'
import { CodePracticeWorkspace } from '@/components/code-practice-workspace'
import { predictAcademicPriorityBatch, MLPredictionResult } from '@/lib/ml-predictor'
import {
  Activity, ArrowRight, BarChart3, BookOpen, BrainCircuit, BriefcaseBusiness,
  CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Code2, Compass,
  FileText, FileUp, Flame, FolderGit2, GraduationCap, LayoutDashboard, ListChecks,
  MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings,
  Sparkles, Target, Trophy, X, Zap, RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pill } from '@/components/ui/pill'
import { Progress } from '@/components/ui/progress'

const initialProfile = {
  name: '',
  college: '',
  degree: 'B.Tech',
  branch: '',
  semester: '',
  cgpa: '',
  previousCgpa: '',
  targetCgpa: '',
  role: '',
  companies: '',
  interests: '',
  studyHours: '2-3 hours',
  language: 'Hinglish' as 'English' | 'Hinglish',
  email: '',
}

const initialNotifications = { study: true, revision: true, assignments: true, career: false }

function saveNotice(setToast: (value: string) => void, message: string) {
  setToast(message)
  window.setTimeout(() => setToast(''), 2500)
}

const navGroups = [
  {
    label: 'Workspace',
    items: [
      ['Dashboard', LayoutDashboard],
      ['My Academics', GraduationCap],
      ['Subjects', BookOpen],
      ['Syllabus', FileText],
    ],
  },
  {
    label: 'Learn',
    items: [
      ['Learn', Compass],
      ['Notes', FileText],
      ['Revision', Clock3],
      ['Code Practice', Code2],
    ],
  },
  {
    label: 'Career',
    items: [
      ['Career', BriefcaseBusiness],
      ['Roadmap', Target],
      ['Skills', Zap],
      ['Projects', FolderGit2],
      ['Resume Builder', FileText],
      ['Placement', Trophy],
    ],
  },
  {
    label: 'Manage',
    items: [
      ['Schedule', CalendarDays],
      ['Progress', BarChart3],
      ['AI Tutor', BrainCircuit],
      ['Settings', Settings],
    ],
  },
] as const

function Stat({ label, value, detail, icon: Icon, tone }: any) {
  return (
    <div className="surface stat-card">
      <div className={`icon-box icon-${tone}`}>
        <Icon />
      </div>
      <div>
        <p className="eyebrow">{label}</p>
        <p className="stat-value">{value}</p>
        <p className="muted text-xs">{detail}</p>
      </div>
    </div>
  )
}

export default function Page() {
  const [active, setActive] = useState('Dashboard')
  const [sidebar, setSidebar] = useState(true)
  const academic = useAcademicCore()
  const skillsHook = useSkills()
  const historyHook = useAcademicHistory()
  const careerHook = useCareerApplications()
  const [profile, setProfile] = useState(initialProfile)
  const [notifications, setNotifications] = useState(initialNotifications)
  const [language, setLanguage] = useState<'English' | 'Hinglish'>('Hinglish')
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<any>(null)
  const [profileStatus, setProfileStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [profileError, setProfileError] = useState('')
  const [mounted, setMounted] = useState(false)

  const studentSubjects = useMemo(
    () =>
      academic.subjects.map((subject, index) => ({
        ...subject,
        score: subject.progress,
        color: ['violet', 'blue', 'amber', 'cyan'][index % 4],
        topics: `${subject.progress}% progress`,
      })),
    [academic.subjects]
  )

  const tasks = useMemo(
    () =>
      academic.tasks
        .filter((task) => !task.completed)
        .slice(0, 5)
        .map((task, index) => ({
          id: task.id,
          type: (task.task_type || 'Task').toUpperCase(),
          title: task.title,
          meta: `${task.scheduled_date ? `Scheduled ${task.scheduled_date} · ` : ''}${
            academic.subjects.find((subject) => subject.id === task.subject_id)?.name || 'No subject'
          }${task.duration_minutes ? ` · ${task.duration_minutes}m` : ''}`,
          icon: Clock3,
          tone: ['violet', 'blue', 'cyan', 'amber'][index % 4],
        })),
    [academic.subjects, academic.tasks]
  )

  const completedCount = useMemo(
    () => academic.tasks.filter((task) => task.completed).length,
    [academic.tasks]
  )

  const calculatedStreak = useMemo(() => {
    if (completedCount === 0) return 0
    return Math.min(30, Math.max(1, Math.floor(completedCount * 1.5)))
  }, [completedCount])

  const completeTask = async (id: string) => {
    if (academic.busy) {
      saveNotice(setToast, 'Please wait for the current action to finish.')
      return
    }
    const task = academic.tasks.find((item) => item.id === id)
    if (!task) return
    try {
      await academic.toggleTask(task)
      saveNotice(setToast, 'Task completed.')
    } catch (error) {
      console.error('Unable to complete task:', error)
      saveNotice(setToast, 'We could not update this task.')
    }
  }

  const addSubject = () => setActive('Subjects')

  const deleteSubject = async (identifier: string) => {
    const subject = academic.subjects.find((item) => item.id === identifier || item.code === identifier)
    if (!subject) return
    if (!window.confirm(`Delete ${subject.name}? Assigned tasks will remain without this subject.`)) return
    if (academic.busy) {
      saveNotice(setToast, 'Please wait for the current action to finish.')
      return
    }
    try {
      await academic.deleteSubject(subject.id)
      saveNotice(setToast, 'Subject deleted.')
    } catch (error) {
      console.error('Unable to delete subject:', error)
      saveNotice(setToast, 'We could not delete this subject.')
    }
  }

  useEffect(() => {
    setMounted(true)
    const supabase = createClient()

    async function loadProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error('Failed to load authenticated user for dashboard:', userError)
        setProfileError('We could not verify your session. Please refresh and try again.')
        setProfileStatus('error')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, college, branch, semester, cgpa, career_goal, preferred_language')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Failed to load dashboard profile:', JSON.stringify(error, null, 2))
        setProfileError('We could not load your profile. Please refresh and try again.')
        setProfileStatus('error')
        return
      }

      if (!data) {
        setProfile((current) => ({ ...current, email: user.email ?? '' }))
        setProfileStatus('missing')
        return
      }

      const preferred = data.preferred_language?.toLowerCase() === 'english' ? 'English' : 'Hinglish'

      setLanguage(preferred)
      setProfile((current) => ({
        ...current,
        name: data.full_name?.trim() || '',
        college: data.college?.trim() || '',
        branch: data.branch?.trim() || '',
        semester: data.semester != null ? String(data.semester) : '',
        cgpa: data.cgpa != null ? String(data.cgpa) : '',
        role: data.career_goal?.trim() || '',
        language: preferred,
        email: user.email ?? '',
      }))
      setProfileStatus('ready')
    }

    void loadProfile()
  }, [])

  const pageTitle = active === 'Dashboard' ? `Good morning, ${profile.name || 'there'}.` : active
  const avatarLetter = (profile.name || 'Y').slice(0, 1).toUpperCase()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className={`sidebar ${sidebar ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="brand">
          <div className="brand-mark">
            <Sparkles />
          </div>
          {sidebar && (
            <div>
              <div className="brand-name">YATVERSE</div>
              <div className="brand-sub">STUDENT OS</div>
            </div>
          )}
        </div>
        <nav className="nav-scroll">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              {sidebar && <p className="nav-label">{group.label}</p>}
              {group.items.map(([label, Icon]) => (
                <button
                  key={label}
                  onClick={() => {
                    setActive(label)
                    setSelectedSubject(null)
                  }}
                  className={`nav-item ${active === label ? 'nav-active' : ''}`}
                  title={label}
                >
                  <Icon />
                  <span>{sidebar && label}</span>
                  {label === 'AI Tutor' && sidebar && <span className="new-dot">AI</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        {sidebar && (
          <div className="sidebar-bottom">
            <div className="streak">
              <Flame />
              <div>
                <strong>{calculatedStreak} day streak</strong>
                <small>{calculatedStreak > 0 ? 'Consistent learner' : 'Start today'}</small>
              </div>
            </div>
            <button className="profile-mini" onClick={() => setActive('Settings')}>
              <div className="avatar">{avatarLetter}</div>
              <div>
                <strong>{profile.name || 'Student'}</strong>
                <small>{profile.branch || profile.college || 'Complete profile'}</small>
              </div>
              <MoreHorizontal />
            </button>
          </div>
        )}
      </aside>

      <div className={`main-shell ${sidebar ? 'shell-open' : 'shell-closed'}`}>
        <header className="topbar">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebar(!sidebar)}
            aria-label="Toggle sidebar"
          >
            {sidebar ? <PanelLeftClose /> : <PanelLeftOpen />}
          </Button>
          <div className="breadcrumb">
            <span className="brand-word">YATVERSE</span>
            <ChevronRight />
            <strong>{active}</strong>
          </div>
          <div className="top-actions">
            <div className="search-wrap">
              <Search />
              <input
                placeholder={`Search ${active.toLowerCase()}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  className="text-xs text-muted-foreground hover:text-white px-1"
                  onClick={() => setQuery('')}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <NotificationCenter
              tasks={academic.tasks}
              notify={(message) => saveNotice(setToast, message)}
            />
            <div className="avatar" title={profile.name || 'Student'}>
              {avatarLetter}
            </div>
          </div>
        </header>

        <main className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow accent">
                {active === 'Dashboard'
                  ? 'STUDENT COMMAND CENTER'
                  : active === 'Settings'
                  ? 'PERSONALIZE YOUR STUDENT OS'
                  : 'YATVERSE WORKSPACE'}
              </p>
              <h1>{pageTitle}</h1>
              <p className="muted">
                {!mounted || profileStatus === 'loading'
                  ? 'Loading your profile…'
                  : active === 'Dashboard'
                  ? "Let's make today count. Your personalized learning trajectory is ready."
                  : active === 'Settings'
                  ? 'Manage your saved profile, learning preferences, goals, and YATVERSE account.'
                  : `Everything you need for your ${active.toLowerCase()} journey.`}
              </p>
            </div>
            {active === 'Dashboard' && (
              <Button className="primary-btn" onClick={() => setShowQuickAdd(true)}>
                <Plus data-icon="inline-start" /> Add to YATVERSE
              </Button>
            )}
          </div>

          {profileStatus === 'error' && (
            <div className="surface panel mb-5">
              <strong>Profile unavailable</strong>
              <p className="muted">{profileError}</p>
            </div>
          )}

          {profileStatus === 'missing' && (
            <div className="surface panel mb-5 flex items-center justify-between">
              <div>
                <strong>Complete your profile</strong>
                <p className="muted">
                  Your profile record is not set up yet. Add your college and semester to unlock personalized recommendations.
                </p>
              </div>
              <Button className="primary-btn" onClick={() => setActive('Settings')}>
                Open Profile Settings <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          )}

          {profileStatus === 'ready' && active === 'Dashboard' && (
            <div className="surface panel mb-5">
              <span className="eyebrow accent">YOUR STUDENT PROFILE</span>
              <h3>{profile.name || 'Not set'}</h3>
              <p className="muted">
                {profile.college || 'Add your college'} · {profile.branch || 'Program not set'} ·{' '}
                {profile.semester ? `Semester ${profile.semester}` : 'Semester not set'} · CGPA{' '}
                {profile.cgpa || 'Not set'} · Target: {profile.role || 'Career goal not set'}
              </p>
            </div>
          )}

          {active === 'Dashboard' ? (
            <Dashboard
              tasks={tasks}
              completed={completedCount}
              completeTask={completeTask}
              setActive={setActive}
              subjects={studentSubjects}
              profile={profile}
              academic={academic}
              skillsHook={skillsHook}
              historyHook={historyHook}
              careerHook={careerHook}
              query={query}
              notify={(msg: string) => saveNotice(setToast, msg)}
            />
          ) : active === 'My Academics' || active === 'Progress' ? (
            <AcademicHistoryWorkspace
              historyHook={historyHook}
              profileCgpa={profile.cgpa}
              notify={(msg) => saveNotice(setToast, msg)}
            />
          ) : active === 'Subjects' ? (
            <AcademicCoreWorkspace
              academic={academic}
              query={query}
              notify={(message) => saveNotice(setToast, message)}
            />
          ) : active === 'Syllabus' ? (
            <SyllabusWorkspace
              academic={academic}
              notify={(msg: string) => saveNotice(setToast, msg)}
              onOpenSubject={(subj: any) => setSelectedSubject(subj)}
            />
          ) : selectedSubject ? (
            <SubjectDetail subject={selectedSubject} tasks={academic.tasks} onBack={() => setSelectedSubject(null)} />
          ) : active === 'Notes' ? (
            <NotesWorkspace
              subjects={academic.subjects}
              notify={(msg: string) => saveNotice(setToast, msg)}
            />
          ) : active === 'Revision' ? (
            <RevisionWorkspace
              subjects={academic.subjects}
              notify={(msg: string) => saveNotice(setToast, msg)}
            />
          ) : active === 'Code Practice' ? (
            <CodePracticeWorkspace
              notify={(msg: string) => saveNotice(setToast, msg)}
            />
          ) : active === 'Career' ? (
            <CareerWorkspace
              careerHook={careerHook}
              desiredRole={profile.role}
              notify={(msg) => saveNotice(setToast, msg)}
            />
          ) : active === 'Roadmap' ? (
            <Roadmap
              profile={profile}
              skills={skillsHook.skills}
              subjects={academic.subjects}
              academic={academic}
              skillsHook={skillsHook}
              notify={(msg: string) => saveNotice(setToast, msg)}
            />
          ) : active === 'Placement' ? (
            <Placement careerHook={careerHook} skills={skillsHook.skills} profile={profile} notify={(msg: string) => saveNotice(setToast, msg)} />
          ) : active === 'Resume' || active === 'Resume Builder' ? (
            <ResumeBuilder
              profile={profile}
              skills={skillsHook.skills}
              academic={academic}
              notify={(msg: string) => saveNotice(setToast, msg)}
            />
          ) : active === 'Projects' ? (
            <ProjectsWorkspace notify={(msg: string) => saveNotice(setToast, msg)} />
          ) : active === 'Schedule' ? (
            <StudyPlanner academic={academic} notify={(msg) => saveNotice(setToast, msg)} />
          ) : active === 'Skills' || active === 'Practice' ? (
            <SkillsWorkspace skillsHook={skillsHook} notify={(msg) => saveNotice(setToast, msg)} />
          ) : active === 'AI Tutor' ? (
            <TutorWorkspace
              language={language}
              setLanguage={setLanguage}
              profile={profile}
              subjects={academic.subjects}
              tasks={academic.tasks}
              skills={skillsHook.skills}
            />
          ) : active === 'Settings' ? (
            <SettingsWorkspace
              profile={profile}
              setProfile={setProfile}
              subjects={studentSubjects}
              addSubject={addSubject}
              deleteSubject={deleteSubject}
              skillsHook={skillsHook}
              notifications={notifications}
              setNotifications={setNotifications}
              language={language}
              setLanguage={setLanguage}
              toast={toast}
              setToast={setToast}
            />
          ) : active === 'Learn' ? (
            <LearningWorkspace
              active={active}
              subjects={academic.subjects}
              notify={(msg: string) => saveNotice(setToast, msg)}
            />
          ) : (
            <Generic active={active} />
          )}
        </main>
      </div>

      {toast && (
        <div className="toast">
          <Check /> {toast}
        </div>
      )}

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div className="modal-backdrop">
          <div className="modal surface">
            <button
              className="modal-close"
              onClick={() => setShowQuickAdd(false)}
              aria-label="Close modal"
            >
              <X />
            </button>
            <div className="eyebrow accent">QUICK SHORTCUTS</div>
            <h2>Add to YATVERSE</h2>
            <p className="muted">Choose what you want to add to your student workspace.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <button
                className="surface p-4 rounded-xl text-left border border-white/5 hover:border-violet-500/40 transition flex items-center justify-between"
                onClick={() => {
                  setShowQuickAdd(false)
                  setActive('Subjects')
                }}
              >
                <div>
                  <strong className="block text-white">Add Subject</strong>
                  <small className="text-zinc-400">Track credits, teacher & progress</small>
                </div>
                <BookOpen className="w-5 h-5 text-violet-400" />
              </button>

              <button
                className="surface p-4 rounded-xl text-left border border-white/5 hover:border-violet-500/40 transition flex items-center justify-between"
                onClick={() => {
                  setShowQuickAdd(false)
                  setActive('Schedule')
                }}
              >
                <div>
                  <strong className="block text-white">Add Study Task</strong>
                  <small className="text-zinc-400">Plan session with scheduled date</small>
                </div>
                <Clock3 className="w-5 h-5 text-blue-400" />
              </button>

              <button
                className="surface p-4 rounded-xl text-left border border-white/5 hover:border-violet-500/40 transition flex items-center justify-between"
                onClick={() => {
                  setShowQuickAdd(false)
                  setActive('Practice')
                }}
              >
                <div>
                  <strong className="block text-white">Add Skill</strong>
                  <small className="text-zinc-400">Log tech tool or framework</small>
                </div>
                <Zap className="w-5 h-5 text-amber-400" />
              </button>

              <button
                className="surface p-4 rounded-xl text-left border border-white/5 hover:border-violet-500/40 transition flex items-center justify-between"
                onClick={() => {
                  setShowQuickAdd(false)
                  setActive('Career')
                }}
              >
                <div>
                  <strong className="block text-white">Add Job Application</strong>
                  <small className="text-zinc-400">Track company interview status</small>
                </div>
                <BriefcaseBusiness className="w-5 h-5 text-cyan-400" />
              </button>

              <button
                className="surface p-4 rounded-xl text-left border border-white/5 hover:border-violet-500/40 transition flex items-center justify-between sm:col-span-2"
                onClick={() => {
                  setShowQuickAdd(false)
                  setActive('Syllabus')
                }}
              >
                <div>
                  <strong className="block text-white">Upload Syllabus PDF</strong>
                  <small className="text-zinc-400">Extract units & topics automatically with AI</small>
                </div>
                <FileUp className="w-5 h-5 text-violet-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Dashboard({
  tasks,
  completed,
  completeTask,
  setActive,
  subjects,
  profile,
  academic,
  skillsHook,
  historyHook,
  careerHook,
  query,
  notify,
}: any) {
  const [aiInsight, setAiInsight] = useState<any>(null)
  const [loadingAiInsight, setLoadingAiInsight] = useState(false)

  const totalSubjects = academic.subjects.length
  const pendingTasks = academic.tasks.filter((task: any) => !task.completed).length
  const completedTasks = academic.tasks.filter((task: any) => task.completed).length
  const latestCgpa = historyHook?.records?.length
    ? historyHook.records[historyHook.records.length - 1].cgpa
    : profile?.cgpa || '—'

  // Fetch contextual AI Daily Priority Insights
  const fetchAiInsight = useCallback(async () => {
    setLoadingAiInsight(true)
    try {
      const res = await fetch('/api/ai/insights')
      if (res.ok) {
        const data = await res.json()
        if (data.insight) {
          setAiInsight(data.insight)
        }
      }
    } catch (err) {
      console.warn('Could not fetch daily AI insights:', err)
    } finally {
      setLoadingAiInsight(false)
    }
  }, [])

  useEffect(() => {
    fetchAiInsight()
  }, [fetchAiInsight])

  // Machine Learning Inference for Task Completion Likelihood & Study Priority
  const mlPredictions: MLPredictionResult[] = useMemo(() => {
    const activeTasks = academic.tasks.filter((t: any) => !t.completed)
    if (activeTasks.length === 0) return []
    return predictAcademicPriorityBatch(
      academic.tasks,
      academic.subjects,
      profile?.cgpa ? Number(profile.cgpa) : undefined
    )
  }, [academic.tasks, academic.subjects, profile?.cgpa])

  // Filter tasks if topbar search is used
  const filteredTasks = useMemo(() => {
    if (!query) return tasks
    const q = query.toLowerCase()
    return tasks.filter(
      (t: any) => t.title.toLowerCase().includes(q) || t.meta.toLowerCase().includes(q)
    )
  }, [tasks, query])

  return (
    <>
      {/* AI Daily Focus Intelligence Banner */}
      {aiInsight && (
        <div className="surface p-4 md:p-5 rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-950/40 via-zinc-950 to-zinc-950 mb-5 relative overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-300 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" /> AI DAILY FOCUS INTELLIGENCE
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-bold ${
                    aiInsight.urgencyTier === 'Critical'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : aiInsight.urgencyTier === 'High'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {aiInsight.urgencyTier} Priority
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  ⏱️ ~{aiInsight.estimatedTimeMinutes || 45} mins
                </span>
              </div>

              <h3 className="text-base md:text-lg font-bold text-white leading-snug">
                {aiInsight.headline}
              </h3>
              <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
                {aiInsight.whyItMatters}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                <div className="bg-black/50 px-3 py-1.5 rounded-xl border border-white/10 text-zinc-300">
                  <strong className="text-violet-300 mr-1.5">Action:</strong>
                  {aiInsight.recommendedAction}
                </div>
                {aiInsight.keyDeliverable && (
                  <div className="bg-black/50 px-3 py-1.5 rounded-xl border border-white/10 text-zinc-300 hidden sm:block">
                    <strong className="text-emerald-400 mr-1.5">Deliverable:</strong>
                    {aiInsight.keyDeliverable}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-violet-500/30 text-violet-200 hover:bg-violet-900/30"
                onClick={() => setActive('Schedule')}
              >
                Plan Session <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-zinc-400 hover:text-white"
                onClick={fetchAiInsight}
                disabled={loadingAiInsight}
                title="Refresh AI Analysis"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${loadingAiInsight ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="hero-grid">
        <div className="journey surface">
          <div className="journey-top">
            <div>
              <Pill tone="violet">YOUR DAILY JOURNEY</Pill>
              <h2>Built around your goals.</h2>
            </div>
            <div className="journey-orbit">
              <div className="orbit-core">
                <Sparkles />
                <strong>
                  {academic.tasks.length
                    ? Math.round((completedTasks / academic.tasks.length) * 100)
                    : 0}
                  %
                </strong>
                <small>completed</small>
              </div>
            </div>
          </div>
          <p className="muted">
            College foundations, AI skills and placement readiness — connected in one focused plan.
          </p>
          <Progress
            value={
              academic.tasks.length
                ? Math.round((completedTasks / academic.tasks.length) * 100)
                : 0
            }
          />

          <div className="task-list">
            {filteredTasks.map((task: any) => (
              <div className="task-row" key={task.id}>
                <div className={`task-icon task-${task.tone}`}>
                  <task.icon />
                </div>
                <div className="task-copy">
                  <span className="eyebrow">{task.type}</span>
                  <strong>{task.title}</strong>
                  <small>{task.meta}</small>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => completeTask(task.id)}
                  aria-label={`Complete ${task.title}`}
                >
                  <Check />
                </Button>
              </div>
            ))}
          </div>

          {filteredTasks.length === 0 && (
            <div className="empty-state">
              <Check />
              <strong>
                {academic.loading
                  ? 'Loading tasks...'
                  : query
                  ? 'No matching tasks'
                  : 'All clear for now'}
              </strong>
              <span>
                {academic.loading
                  ? 'Getting your saved tasks.'
                  : 'Add a task in Subjects or Schedule to plan your next study block.'}
              </span>
            </div>
          )}
        </div>

        <div className="side-stack">
          <div className="surface focus-card">
            <div className="card-head">
              <span className="eyebrow">FOCUS SIGNAL</span>
              <Activity />
            </div>
            <h3>Protect your momentum.</h3>
            <p className="muted">
              {skillsHook?.skills?.length
                ? `${skillsHook.skills.length} skills tracked · ${
                    careerHook?.applications?.length || 0
                  } companies in pipeline.`
                : 'Your saved study plan is ready when you are.'}
            </p>
            <Button variant="outline" onClick={() => setActive('Schedule')}>
              Open Planner <ArrowRight data-icon="inline-end" />
            </Button>
          </div>

          <div className="surface streak-card">
            <div className="streak-number">{completedTasks}</div>
            <div>
              <span className="eyebrow">COMPLETED TASKS</span>
              <p>Every finished task accelerates your readiness.</p>
            </div>
            <Flame />
          </div>
        </div>
      </div>

      {/* Machine Learning Priority Intelligence Panel */}
      {mlPredictions.length > 0 && (
        <div className="surface panel my-5">
          <div className="section-head mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="eyebrow accent">ML INFERENCE ENGINE</span>
                <span className="pill pill-violet text-[10px] px-2 py-0.5 uppercase tracking-wider font-mono">
                  Logistic Regression + Bayesian Prior
                </span>
              </div>
              <h2>Study Priority & Task Completion Predictor</h2>
              <p className="muted text-xs">
                Statistical risk scoring computed across 6 dimensions: urgency, duration load, subject mastery, historical velocity, and academic momentum.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActive('Schedule')}>
              View Planner <ArrowRight data-icon="inline-end" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mlPredictions.slice(0, 3).map((pred) => {
              const tierColor =
                pred.riskTier === 'Low Risk'
                  ? 'emerald'
                  : pred.riskTier === 'Moderate Risk'
                  ? 'amber'
                  : 'red'
              return (
                <div
                  key={pred.taskId}
                  className="surface p-4 rounded-xl border border-white/5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`pill pill-${tierColor} text-xs font-semibold`}>
                        {pred.riskTier}
                      </span>
                      <span className="text-xs font-mono text-zinc-400">
                        {pred.completionLikelihood}% likelihood
                      </span>
                    </div>
                    <strong className="block text-sm text-white mb-1">{pred.taskTitle}</strong>
                    <p className="text-xs text-zinc-400 mb-3">{pred.recommendedAction}</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                      <span>Completion probability</span>
                      <span className="font-mono">{pred.completionLikelihood}%</span>
                    </div>
                    <Progress value={pred.completionLikelihood} color={tierColor} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="section-head mt-6">
        <div>
          <span className="eyebrow">AT A GLANCE</span>
          <h2>Your universe, in numbers.</h2>
        </div>
        <button className="text-btn" onClick={() => setActive('Subjects')}>
          Manage academics <ArrowRight />
        </button>
      </div>

      <div className="stats-grid">
        <Stat
          label="Current CGPA"
          value={String(latestCgpa)}
          detail="From academic records"
          icon={GraduationCap}
          tone="violet"
        />
        <Stat
          label="Subjects"
          value={String(totalSubjects)}
          detail="Active courses"
          icon={BookOpen}
          tone="blue"
        />
        <Stat
          label="Pending tasks"
          value={String(pendingTasks)}
          detail="Still to complete"
          icon={Clock3}
          tone="cyan"
        />
        <Stat
          label="Tracked skills"
          value={String(skillsHook?.skills?.length || 0)}
          detail="Mastery portfolio"
          icon={Zap}
          tone="amber"
        />
      </div>

      <div className="lower-grid">
        <div className="surface panel">
          <div className="card-head">
            <div>
              <span className="eyebrow">ACADEMIC PULSE</span>
              <h3>Subject progress</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActive('Subjects')}
              aria-label="View all subjects"
            >
              <ArrowRight />
            </Button>
          </div>
          {academic.subjects.length === 0 ? (
            <div className="empty-state">
              <BookOpen />
              <strong>No subjects logged yet</strong>
              <span>Add your semester subjects to visualize mastery.</span>
            </div>
          ) : (
            <div className="chart">
              <div className="chart-y">
                <span>100</span>
                <span>75</span>
                <span>50</span>
                <span>25</span>
              </div>
              <div className="bars">
                {academic.subjects.slice(0, 7).map((subject: any) => (
                  <div
                    className="bar-col"
                    key={subject.id}
                    title={`${subject.name}: ${subject.progress}%`}
                  >
                    <div
                      className="bar"
                      style={{ height: `${Math.max(8, subject.progress)}%` }}
                    />
                    <small>{(subject.code || subject.name).slice(0, 4).toUpperCase()}</small>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="surface panel">
          <div className="card-head">
            <div>
              <span className="eyebrow">UP NEXT</span>
              <h3>Your next tasks</h3>
            </div>
            <CalendarDays />
          </div>
          <div className="timeline">
            {tasks.length ? (
              tasks.slice(0, 3).map((task: any) => (
                <div key={task.id}>
                  <span>Task</span>
                  <strong>{task.title}</strong>
                  <small>{task.meta}</small>
                </div>
              ))
            ) : (
              <div>
                <strong>No upcoming tasks</strong>
                <small>Add a task in Subjects or Planner to stay ahead.</small>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function SubjectDetail({ subject, tasks = [], onBack }: any) {
  const subjectTasks = tasks.filter((t: any) => t.subject_id === subject.id)
  const completedTasks = subjectTasks.filter((t: any) => t.completed)
  const derivedProgress = subjectTasks.length > 0 ? Math.round((completedTasks.length / subjectTasks.length) * 100) : subject.progress || 0
  const hasTasks = subjectTasks.length > 0

  return (
    <>
      <Button variant="ghost" onClick={onBack}>
        <ChevronLeft data-icon="inline-start" /> Back to subjects
      </Button>
      <div className="academic-banner surface mt-4">
        <div>
          <Pill tone="violet">
            {subject.code || 'CODE'} · {subject.credits} CREDITS · {subject.status || 'Active'}
          </Pill>
          <h2>{subject.name}</h2>
          <p className="muted">
            {subject.teacher ? `Instructor: ${subject.teacher} · ` : ''}Curriculum overview, tasks, practice, and revision notes.
          </p>
        </div>
        <div className="big-progress">
          <strong>{hasTasks ? `${derivedProgress}%` : 'Not started'}</strong>
          <span>
            {hasTasks ? `${completedTasks.length}/${subjectTasks.length} tasks completed` : '0 tasks logged yet'}
          </span>
          <Progress value={derivedProgress} />
        </div>
      </div>
      <div className="lower-grid mt-5">
        <div className="surface panel">
          <div className="card-head">
            <h3>Subject Tasks & Milestones</h3>
            <ListChecks />
          </div>
          {subjectTasks.length === 0 ? (
            <div className="text-xs text-zinc-400 p-4 rounded-xl bg-white/5 border border-white/10">
              No specific tasks scheduled for this subject yet. You can add tasks from Academic Core or import a syllabus to auto-populate units!
            </div>
          ) : (
            subjectTasks.map((t: any) => (
              <div className="milestone" key={t.id}>
                <Check className={t.completed ? 'text-emerald-400' : 'text-zinc-500'} />
                <span>{t.title}</span>
                <strong>{t.completed ? 'Completed' : t.scheduled_date ? `Due ${t.scheduled_date}` : 'Pending'}</strong>
              </div>
            ))
          )}
        </div>
        <div className="surface panel">
          <div className="card-head">
            <h3>Study Tools</h3>
            <Sparkles />
          </div>
          {['Review Notes', 'Interactive Practice', 'Flashcard Revision', 'Formula Sheet'].map((x) => (
            <Button variant="outline" className="w-full mb-2 justify-between" key={x}>
              <span>{x}</span>
              <ArrowRight data-icon="inline-end" />
            </Button>
          ))}
        </div>
      </div>
    </>
  )
}

function Generic({ active }: { active: string }) {
  return (
    <div className="surface empty-page">
      <div className="empty-orbit">
        <Sparkles />
      </div>
      <span className="eyebrow accent">{active.toUpperCase()}</span>
      <h2>Your {active.toLowerCase()} space is ready.</h2>
      <p className="muted">This workspace is connected to your academic and career journey.</p>
    </div>
  )
}

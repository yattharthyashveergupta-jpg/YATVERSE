'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { hasRequiredProfileFields } from '@/lib/profile'
import { AcademicCoreWorkspace, useAcademicCore } from '@/components/academic-core'
import { NotificationCenter } from '@/components/notification-center'
import { StudyPlanner } from '@/components/study-planner'
import { SkillsWorkspace, useSkills } from '@/components/skills-workspace'
import { AcademicHistoryWorkspace, useAcademicHistory } from '@/components/academic-history'
import { CareerWorkspace, useCareerApplications } from '@/components/career-workspace'
// Centralized demo profile model; a future database adapter can replace this object without changing the UI.
const initialProfile = {
  name: '', college: '', degree: 'B.Tech', branch: '', semester: '', cgpa: '', previousCgpa: '', targetCgpa: '', role: '', companies: '', interests: '', studyHours: '', language: 'Hinglish' as 'English' | 'Hinglish', email: '',
}

const initialNotifications = { study: true, revision: true, assignments: true, career: false }
const initialSkills = ['Python', 'Data Structures', 'Machine Learning']

function saveNotice(setToast: (value: string) => void, message: string) { setToast(message); window.setTimeout(() => setToast(''), 2500) }
import {
  Activity, ArrowRight, BarChart3, Bell, BookOpen, BrainCircuit, BriefcaseBusiness,
  CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3,
  Code2, Compass, FileText, Flame, GraduationCap, LayoutDashboard, Menu, MoreHorizontal,
  PanelLeftClose, PanelLeftOpen, Play, Plus, Search, Settings, Sparkles, Target, Trophy,
  Upload, UserRound, X, Zap, Pencil, Trash2, Filter, FileUp, ListChecks,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navGroups = [
  { label: 'Workspace', items: [['Dashboard', LayoutDashboard], ['My Academics', GraduationCap], ['Subjects', BookOpen], ['Syllabus', FileText]] },
  { label: 'Learn', items: [['Learn', Compass], ['Notes', FileText], ['Revision', Clock3], ['Practice', Code2]] },
  { label: 'Career', items: [['Career', BriefcaseBusiness], ['Roadmap', Target], ['Projects', Zap], ['Placement', Trophy]] },
  { label: 'Manage', items: [['Schedule', CalendarDays], ['Progress', BarChart3], ['AI Tutor', BrainCircuit], ['Settings', Settings]] },
] as const


function Progress({ value, color = 'violet' }: { value: number; color?: string }) {
  return <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className={`h-full rounded-full bg-${color}-400 transition-all`} style={{ width: `${value}%` }} /></div>
}
function Pill({ children, tone = 'violet' }: { children: React.ReactNode; tone?: string }) { return <span className={`pill pill-${tone}`}>{children}</span> }
function Stat({ label, value, detail, icon: Icon, tone }: any) { return <div className="surface stat-card"><div className={`icon-box icon-${tone}`}><Icon /></div><div><p className="eyebrow">{label}</p><p className="stat-value">{value}</p><p className="muted text-xs">{detail}</p></div></div> }

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
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardStep, setOnboardStep] = useState(1)
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<any>(null)
  const [profileStatus, setProfileStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [profileError, setProfileError] = useState('')
  const [mounted, setMounted] = useState(false)
  const studentSubjects = useMemo(() => academic.subjects.map((subject, index) => ({ ...subject, score: subject.progress, color: ['violet', 'blue', 'amber', 'cyan'][index % 4], topics: `${subject.progress}% progress` })), [academic.subjects])
  const tasks = useMemo(() => academic.tasks.filter((task) => !task.completed).slice(0, 4).map((task, index) => ({ id: task.id, type: (task.task_type || 'Task').toUpperCase(), title: task.title, meta: `${task.scheduled_date ? `Scheduled ${task.scheduled_date} · ` : ''}${academic.subjects.find((subject) => subject.id === task.subject_id)?.name || 'No subject'}`, icon: Clock3, tone: ['violet', 'blue', 'cyan', 'amber'][index % 4] })), [academic.subjects, academic.tasks])
  const completed = Math.min(4, academic.tasks.filter((task) => task.completed).length)
  const filteredSubjects = useMemo(() => studentSubjects.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()) || (s.code ?? '').toLowerCase().includes(query.toLowerCase())), [studentSubjects, query])
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
    if (!window.confirm(`Delete ${subject.name}? Assigned tasks will stay, without this subject.`)) return
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
        console.error('Failed to load the authenticated user for the dashboard:', userError)
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
        console.error('Failed to load dashboard profile:', error)
        setProfileError('We could not load your profile. Please refresh and try again.')
        setProfileStatus('error')
        return
      }

      if (!data) {
        setProfile((current) => ({ ...current, email: user.email ?? '' }))
        setProfileStatus('missing')
        return
      }

      const preferred =
        data.preferred_language?.toLowerCase() === 'english' ? 'English' : 'Hinglish'

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
  return <div className="min-h-screen bg-background text-foreground">
    <aside className={`sidebar ${sidebar ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="brand"><div className="brand-mark"><Sparkles /></div>{sidebar && <div><div className="brand-name">YATVERSE</div><div className="brand-sub">STUDENT OS</div></div>}</div>
      <nav className="nav-scroll">{navGroups.map((group) => <div className="nav-group" key={group.label}>{sidebar && <p className="nav-label">{group.label}</p>}{group.items.map(([label, Icon]) => <button key={label} onClick={() => setActive(label)} className={`nav-item ${active === label ? 'nav-active' : ''}`} title={label}><Icon /><span>{sidebar && label}</span>{label === 'AI Tutor' && sidebar && <span className="new-dot">NEW</span>}</button>)}</div>)}</nav>
      {sidebar && <div className="sidebar-bottom"><div className="streak"><Flame /><div><strong>12 day streak</strong><small>Demo streak</small></div></div><button className="profile-mini" onClick={() => setActive('Settings')}><div className="avatar">{avatarLetter}</div><div><strong>{profile.name || 'Student'}</strong><small>{profile.branch || profile.college || 'Complete your profile'}</small></div><MoreHorizontal /></button></div>}
    </aside>
    <div className={`main-shell ${sidebar ? 'shell-open' : 'shell-closed'}`}>
      <header className="topbar"><Button variant="ghost" size="icon" onClick={() => setSidebar(!sidebar)} aria-label="Toggle sidebar">{sidebar ? <PanelLeftClose /> : <PanelLeftOpen />}</Button><div className="breadcrumb"><span className="brand-word">YATVERSE</span><ChevronRight /><strong>{active}</strong></div><div className="top-actions"><div className="search-wrap"><Search /><input placeholder="Search anything..." value={query} onChange={(e) => setQuery(e.target.value)} /></div><NotificationCenter tasks={academic.tasks} notify={(message) => saveNotice(setToast, message)} /><div className="avatar">{avatarLetter}</div></div></header>
      <main className="content">
        <div className="page-heading"><div><p className="eyebrow accent">{active === 'Dashboard' ? 'THURSDAY, 22 AUGUST 2026' : active === 'Settings' ? 'PERSONALIZE YOUR STUDENT OS' : 'YATVERSE WORKSPACE'}</p><h1>{pageTitle}</h1><p className="muted">{!mounted || profileStatus === 'loading' ? 'Loading your profile…' : active === 'Dashboard' ? "Let's make today count. Your personalized journey is ready." : active === 'Settings' ? 'Manage your saved profile, learning preferences, goals, and YATVERSE account.' : `Everything you need for your ${active.toLowerCase()} journey.`}</p></div><Button className="primary-btn" onClick={() => setShowOnboarding(true)}><Plus data-icon="inline-start" /> Add to YATVERSE</Button></div>
        {profileStatus === 'error' && <div className="surface panel mb-5"><strong>Profile unavailable</strong><p className="muted">{profileError}</p></div>}
        {profileStatus === 'missing' && <div className="surface panel mb-5"><strong>Complete your profile</strong><p className="muted">Your profile record is not available yet. Open onboarding to add your required details.</p></div>}
        {profileStatus === 'ready' && active === 'Dashboard' && <div className="surface panel mb-5"><span className="eyebrow accent">YOUR PROFILE</span><h3>{profile.name || 'Not set'}</h3><p className="muted">{profile.college || 'Add your college'} · {profile.branch || 'Program not set'} · {profile.semester ? `Semester ${profile.semester}` : 'Semester not set'} · CGPA {profile.cgpa || 'Not set'} · {profile.role || 'Career goal not set'}</p></div>}
        {active === 'My Academics' && <div className="surface panel mb-5"><strong>Academic overview</strong><p className="muted">Current CGPA and semester come from your profile. Subject progress comes from your saved records. Manage subjects and tasks in the Subjects workspace. Target CGPA and history remain local until those fields are stored.</p></div>}
        {active === 'Dashboard' ? (
          <Dashboard
            tasks={tasks}
            completed={completed}
            completeTask={completeTask}
            setActive={setActive}
            subjects={studentSubjects}
            profile={profile}
            academic={academic}
            skillsHook={skillsHook}
            historyHook={historyHook}
            careerHook={careerHook}
          />
        ) : active === 'My Academics' ? (
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
          <SyllabusWorkspace subjects={studentSubjects} />
        ) : selectedSubject ? (
          <SubjectDetail subject={selectedSubject} onBack={() => setSelectedSubject(null)} />
        ) : active === 'Career' ? (
          <CareerWorkspace
            careerHook={careerHook}
            desiredRole={profile.role}
            notify={(msg) => saveNotice(setToast, msg)}
          />
        ) : active === 'Roadmap' ? (
          <Roadmap profile={profile} skills={skillsHook.skills} subjects={academic.subjects} />
        ) : active === 'Placement' ? (
          <Placement careerHook={careerHook} skills={skillsHook.skills} />
        ) : active === 'Schedule' ? (
          <StudyPlanner academic={academic} notify={(msg) => saveNotice(setToast, msg)} />
        ) : active === 'Progress' ? (
          <AcademicHistoryWorkspace
            historyHook={historyHook}
            profileCgpa={profile.cgpa}
            notify={(msg) => saveNotice(setToast, msg)}
          />
        ) : active === 'Practice' ? (
          <SkillsWorkspace skillsHook={skillsHook} notify={(msg) => saveNotice(setToast, msg)} />
        ) : active === 'AI Tutor' ? (
          <Tutor
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
        ) : active === 'Learn' || active === 'Notes' || active === 'Revision' ? (
          <Learning active={active} />
        ) : (
          <Generic active={active} />
        )}
      </main>
    </div>
    {toast && <div className="toast"><Check /> {toast}</div>}
    {showOnboarding && <div className="modal-backdrop"><div className="modal surface"><button className="modal-close" onClick={() => setShowOnboarding(false)}><X /></button><div className="eyebrow accent">BUILD YOUR UNIVERSE · 0{onboardStep} / 03</div><h2>{onboardStep === 1 ? 'Tell us about you.' : onboardStep === 2 ? 'Shape your academic orbit.' : 'Choose your direction.'}</h2><p className="muted">Personalize YATVERSE so every recommendation feels made for you.</p><div className="stepper"><span className={onboardStep >= 1 ? 'step-on' : ''}>About you</span><i /><span className={onboardStep >= 2 ? 'step-on' : ''}>Academics</span><i /><span className={onboardStep >= 3 ? 'step-on' : ''}>Career goals</span></div>{onboardStep === 1 && <div className="form-grid"><label>What should we call you?<input defaultValue="Yattharth" /></label><label>College / University<input placeholder="Your college name" /></label></div>}{onboardStep === 2 && <div className="form-grid"><label>Degree<select defaultValue="B.Tech"><option>B.Tech</option><option>BCA</option><option>B.Sc.</option></select></label><label>Branch<input defaultValue="CSE — AI & ML" /></label><label>Current semester<select defaultValue="2"><option>2</option><option>4</option><option>6</option></select></label><label>Target CGPA<input defaultValue="9.2" /></label></div>}{onboardStep === 3 && <div className="career-picks">{['AI/ML Engineer','Software Engineer','Data Scientist','Product Builder'].map((x, i) => <button key={x} className={`career-pick ${i === 0 ? 'pick-on' : ''}`}>{x}<ArrowRight /></button>)}<button className="upload-box"><Upload /> Upload your syllabus <small>PDF, JPG or PNG</small></button></div>}<div className="modal-footer"><Button variant="ghost" onClick={() => setShowOnboarding(false)}>Maybe later</Button><Button className="primary-btn" onClick={() => onboardStep < 3 ? setOnboardStep(onboardStep + 1) : setShowOnboarding(false)}>{onboardStep < 3 ? 'Continue' : 'Enter YATVERSE'} <ArrowRight data-icon="inline-end" /></Button></div></div></div>}
  </div>
}

function Dashboard({ tasks, completed, completeTask, setActive, profile, academic, skillsHook, historyHook, careerHook }: any) {
  const totalSubjects = academic.subjects.length;
  const pendingTasks = academic.tasks.filter((task: any) => !task.completed).length;
  const completedTasks = academic.tasks.filter((task: any) => task.completed).length;
  const latestCgpa = historyHook?.records?.length ? historyHook.records[historyHook.records.length - 1].cgpa : (profile?.cgpa || '—');
  return <>
    <div className="hero-grid">
      <div className="journey surface">
        <div className="journey-top">
          <div><Pill tone="violet">YOUR DAILY JOURNEY</Pill><h2>Built around your goals.</h2></div>
          <div className="journey-orbit"><div className="orbit-core"><Sparkles /><strong>{Math.round((completed / 4) * 100)}%</strong><small>today</small></div></div>
        </div>
        <p className="muted">College foundations, AI skills and placement readiness — connected in one focused plan.</p>
        <Progress value={completed * 25} />
        <div className="task-list">
          {tasks.map((task: any) => (
            <div className="task-row" key={task.id}>
              <div className={`task-icon task-${task.tone}`}><task.icon /></div>
              <div className="task-copy"><span className="eyebrow">{task.type}</span><strong>{task.title}</strong><small>{task.meta}</small></div>
              <Button variant="ghost" size="icon" onClick={() => completeTask(task.id)} aria-label={`Complete ${task.title}`}><Check /></Button>
            </div>
          ))}
        </div>
        {tasks.length === 0 && <div className="empty-state"><Check /><strong>{academic.loading ? 'Loading tasks' : 'No pending tasks'}</strong><span>{academic.loading ? 'Getting your saved tasks.' : 'Add a task in Subjects or Schedule to plan your next study session.'}</span></div>}
      </div>
      <div className="side-stack">
        <div className="surface focus-card">
          <div className="card-head"><span className="eyebrow">FOCUS SIGNAL</span><Activity /></div>
          <h3>Protect your momentum.</h3>
          <p className="muted">{skillsHook?.skills?.length ? `${skillsHook.skills.length} skills tracked · ${careerHook?.applications?.length || 0} companies in pipeline.` : 'Your saved task plan is ready when you are.'}</p>
          <Button variant="outline" onClick={() => setActive('Schedule')}>Open Planner <ArrowRight data-icon="inline-end" /></Button>
        </div>
        <div className="surface streak-card">
          <div className="streak-number">{completedTasks}</div>
          <div><span className="eyebrow">COMPLETED TASKS</span><p>Every finished task counts.</p></div>
          <Flame />
        </div>
      </div>
    </div>
    <div className="section-head">
      <div><span className="eyebrow">AT A GLANCE</span><h2>Your universe, in numbers.</h2></div>
      <button className="text-btn" onClick={() => setActive('Subjects')}>Manage academics <ArrowRight /></button>
    </div>
    <div className="stats-grid">
      <Stat label="Current CGPA" value={String(latestCgpa)} detail="From academic records" icon={GraduationCap} tone="violet" />
      <Stat label="Subjects" value={String(totalSubjects)} detail="Saved subjects" icon={BookOpen} tone="blue" />
      <Stat label="Pending tasks" value={String(pendingTasks)} detail="Still to complete" icon={Clock3} tone="cyan" />
      <Stat label="Tracked skills" value={String(skillsHook?.skills?.length || 0)} detail="Mastery portfolio" icon={Zap} tone="amber" />
    </div>
    <div className="lower-grid">
      <div className="surface panel">
        <div className="card-head"><div><span className="eyebrow">ACADEMIC PULSE</span><h3>Subject progress</h3></div><Button variant="ghost" size="icon" onClick={() => setActive('Subjects')}><ArrowRight /></Button></div>
        <div className="chart">
          <div className="chart-y"><span>100</span><span>75</span><span>50</span><span>25</span></div>
          <div className="bars">
            {academic.subjects.slice(0, 7).map((subject: any) => (
              <div className="bar-col" key={subject.id}>
                <div className="bar" style={{ height: `${subject.progress}%` }} />
                <small>{subject.name.slice(0, 4)}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="surface panel">
        <div className="card-head"><div><span className="eyebrow">UP NEXT</span><h3>Your next tasks</h3></div><CalendarDays /></div>
        <div className="timeline">
          {tasks.length ? tasks.slice(0, 3).map((task: any) => (
            <div key={task.id}><span>Task</span><strong>{task.title}</strong><small>{task.meta}</small></div>
          )) : <div><strong>No upcoming tasks</strong><small>Add a task in Subjects or Planner.</small></div>}
        </div>
      </div>
    </div>
  </>
}

function SubjectDetail({ subject, onBack }: any) {
  return <>
    <Button variant="ghost" onClick={onBack}><ChevronLeft data-icon="inline-start" /> Back to subjects</Button>
    <div className="academic-banner surface mt-4">
      <div>
        <Pill tone="violet">{subject.code} · {subject.credits} CREDITS</Pill>
        <h2>{subject.name}</h2>
        <p className="muted">Subject overview, syllabus, practice, notes and revision in one place.</p>
      </div>
      <div className="big-progress">
        <strong>{subject.score}%</strong>
        <span>Learning progress</span>
        <Progress value={subject.score} />
      </div>
    </div>
    <div className="lower-grid mt-5">
      <div className="surface panel">
        <div className="card-head"><h3>Units & topics</h3><ListChecks /></div>
        {['Foundations and terminology','Core problem-solving patterns','Applied practice set','Revision and exam prep'].map((x,i) => (
          <div className="milestone" key={x}><Check /><span>{x}</span><strong>{i < 2 ? 'Complete' : 'Upcoming'}</strong></div>
        ))}
      </div>
      <div className="surface panel">
        <div className="card-head"><h3>Study tools</h3><Sparkles /></div>
        {['Notes','Practice','Revision','Exam information'].map((x) => (
          <Button variant="outline" className="w-full mb-2" key={x}>{x}<ArrowRight data-icon="inline-end" /></Button>
        ))}
      </div>
    </div>
  </>
}

function SyllabusWorkspace({ subjects }: any) {
  const [extracting, setExtracting] = useState(false);
  const startExtraction = () => { setExtracting(true); setTimeout(() => setExtracting(false), 1800) };
  return <>
    <div className="surface panel">
      <div className="section-head">
        <div><span className="eyebrow">SYLLABUS INTELLIGENCE</span><h2>Turn your syllabus into a plan.</h2><p className="muted">Upload a PDF or image, or build the topic structure manually.</p></div>
        <Button className="primary-btn" onClick={startExtraction}><FileUp data-icon="inline-start" /> {extracting ? 'Extracting…' : 'Upload syllabus'}</Button>
      </div>
      <div className="career-picks">
        <button className="upload-box" onClick={startExtraction}><Upload /> Upload syllabus PDF</button>
        <button className="upload-box" onClick={startExtraction}><FileText /> Upload syllabus image</button>
        <button className="upload-box"><Plus /> Add syllabus manually</button>
      </div>
      {extracting && <p className="muted mt-4">AI is extracting units, topics and exam relevance…</p>}
    </div>
    <div className="subject-grid mt-5">
      {subjects.map((s: any) => (
        <div className="surface subject-card" key={s.code}>
          <Pill tone="blue">{s.code}</Pill>
          <h3>{s.name} syllabus</h3>
          <p className="muted">{s.topics} mapped into learning and revision.</p>
          <Progress value={s.score} color={s.color} />
          <div className="milestone"><ListChecks /><span>Units extracted</span><strong>{s.score > 0 ? 'Ready' : 'Pending'}</strong></div>
          <Button variant="outline" className="w-full">View topic map <ArrowRight data-icon="inline-end" /></Button>
        </div>
      ))}
    </div>
  </>
}

function Roadmap({ profile, skills }: any) {
  const targetRole = profile?.role || 'AI/ML Engineer'
  const items = [
    ['Core Programming & Foundations', 'Master Python, C++, or Java fundamentals.', skills?.length > 0 ? 'complete' : 'active'],
    ['Data Structures & Algorithms', 'Build problem-solving instincts for technical interviews.', 'active'],
    ['Specialized Frameworks & Systems', `Key libraries and toolchains required for ${targetRole}.`, 'next'],
    ['Portfolio Projects & Proof of Work', 'Ship production-ready projects to demonstrate capability.', 'next'],
    ['Interview Readiness & Communication', 'Mock interviews, pattern recognition sprints, and placement launch.', 'next'],
  ]
  return <>
    <div className="roadmap-hero surface">
      <div>
        <Pill tone="violet">{targetRole.toUpperCase()} · ROADMAP</Pill>
        <h2>Your path has a shape.</h2>
        <p className="muted">A role-aware roadmap connecting your college syllabus directly to target job competencies.</p>
      </div>
      <div className="roadmap-score">
        <strong>{Math.min(90, (skills?.length || 1) * 15)}%</strong>
        <span>roadmap complete</span>
        <Progress value={Math.min(90, (skills?.length || 1) * 15)} />
      </div>
    </div>
    <div className="roadmap-layout">
      <div className="surface roadmap-list">
        {items.map(([title, desc, state], i) => (
          <div className={`road-step step-${state}`} key={title}>
            <div className="step-line">
              <div className="step-dot">{state === 'complete' ? <Check /> : i + 1}</div>
              {i < items.length - 1 && <i />}
            </div>
            <div>
              <div className="step-meta">
                <span>{state === 'complete' ? 'COMPLETED' : state === 'active' ? 'IN PROGRESS' : 'UP NEXT'}</span>
                {state === 'active' && <Pill tone="blue">CURRENT SPRINT</Pill>}
              </div>
              <h3>{title}</h3>
              <p className="muted">{desc}</p>
              {state === 'active' && (
                <div className="step-progress"><Progress value={65} color="blue" /><span>65%</span></div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="surface gap-card">
        <span className="eyebrow accent">AI INSIGHT</span>
        <Sparkles />
        <h3>Your syllabus is doing double duty.</h3>
        <p className="muted">Your core coursework aligns with {targetRole} foundation requirements. One focused session, double the value.</p>
      </div>
    </div>
  </>
}

function Placement({ careerHook, skills }: any) {
  const apps = careerHook?.applications || []
  const totalApps = apps.length
  const interviewing = apps.filter((a: any) => a.application_status === 'Interviewing').length
  const offered = apps.filter((a: any) => a.application_status === 'Offered').length
  const avgSkillMastery = skills?.length ? Math.round(skills.reduce((acc: number, s: any) => acc + s.progress, 0) / skills.length) : 65

  const readiness = [
    ['DSA readiness', Math.min(95, avgSkillMastery + 5), 'violet'],
    ['Projects & Portfolio', Math.min(90, avgSkillMastery - 5), 'blue'],
    ['CS fundamentals', Math.min(92, avgSkillMastery), 'cyan'],
    ['Interview Practice', interviewing > 0 ? 80 : 55, 'amber'],
    ['Applications Sent', Math.min(100, totalApps * 20), 'amber'],
  ]

  const readyPct = Math.round(readiness.reduce((acc, r) => acc + (r[1] as number), 0) / readiness.length)

  return <>
    <div className="placement-hero surface">
      <div>
        <Pill tone="violet">PLACEMENT COMMAND CENTER</Pill>
        <h2>Ready when opportunity arrives.</h2>
        <p className="muted">{totalApps} companies tracked · {interviewing} active interview rounds · {offered} offers received.</p>
      </div>
      <div className="readiness-ring">
        <strong>{readyPct}%</strong>
        <span>ready</span>
      </div>
    </div>
    <div className="readiness-grid">
      <div className="surface panel">
        <div className="card-head"><div><span className="eyebrow">READINESS BREAKDOWN</span><h3>Where to focus next</h3></div><Target /></div>
        {readiness.map(([label, val, tone]) => (
          <div className="readiness-row" key={label as string}>
            <div><span>{label}</span><strong>{val}%</strong></div>
            <Progress value={val as number} color={tone as string} />
          </div>
        ))}
      </div>
      <div className="surface panel interview-card">
        <Pill tone="blue">TARGET PIPELINE</Pill>
        <h3>Active Opportunities</h3>
        {apps.slice(0, 3).map((app: any) => (
          <div className="milestone" key={app.id}>
            <Check />
            <span>{app.company_name} · {app.role}</span>
            <strong>{app.application_status}</strong>
          </div>
        ))}
        {apps.length === 0 && (
          <p className="muted text-xs my-4">No companies in tracker. Open Career to add target companies.</p>
        )}
      </div>
    </div>
  </>
}

function Tutor({ language, setLanguage, profile, subjects, tasks, skills }: any) {
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<Array<{ from: 'ai' | 'user'; text: string }>>(() => [
    {
      from: 'ai',
      text: `Hey ${profile?.name || 'there'}! I’m YAT, your personal AI Tutor. I'm connected to your ${subjects?.length || 0} subjects and ${tasks?.length || 0} tasks. What should we learn or practice today?`,
    },
  ])

  const send = async (textToSend?: string) => {
    const text = (textToSend || msg).trim()
    if (!text || sending) return
    const newHistory = [...messages, { from: 'user' as const, text }]
    setMessages(newHistory)
    setMsg('')
    setSending(true)

    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, language }),
      })

      if (!res.ok) throw new Error('AI response error')
      const data = await res.json()
      if (data.reply) {
        setMessages([...newHistory, { from: 'ai', text: data.reply }])
      } else {
        setMessages([...newHistory, { from: 'ai', text: 'Error generating response. Please try again.' }])
      }
    } catch (err) {
      console.error('Tutor error:', err)
      setMessages([...newHistory, { from: 'ai', text: 'Could not connect to YAT AI. Please check your network and try again.' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="tutor-layout">
      <div className="surface tutor-chat">
        <div className="tutor-head">
          <div className="ai-face"><Sparkles /></div>
          <div><strong>YAT · your AI teacher</strong><small>Online · understands your student journey</small></div>
          <div className="language-toggle">
            <button className={language === 'English' ? 'selected' : ''} onClick={() => setLanguage('English')}>EN</button>
            <button className={language === 'Hinglish' ? 'selected' : ''} onClick={() => setLanguage('Hinglish')}>HI</button>
          </div>
        </div>
        <div className="messages">
          {messages.map((m, i) => (
            <div className={`message ${m.from}`} key={i}>
              <div style={{ whiteSpace: 'pre-line' }}>{m.text}</div>
            </div>
          ))}
          {sending && (
            <div className="message ai">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-violet-400" />
                <span>YAT is thinking…</span>
              </div>
            </div>
          )}
        </div>
        <div className="suggestions">
          <button onClick={() => void send('Explain recursion with an intuitive example')}>Explain recursion</button>
          <button onClick={() => void send('Break down Binary Search algorithm')}>Binary search intuition</button>
          <button onClick={() => void send('Quiz me on core DSA patterns')}>Quiz me on DSA</button>
          <button onClick={() => void send('Make quick revision notes for my subjects')}>Make revision notes</button>
        </div>
        <div className="composer">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && void send()}
            placeholder={sending ? 'YAT is generating response…' : 'Ask YAT anything about code, math, or exams...'}
            disabled={sending}
          />
          <Button className="primary-btn" size="icon" onClick={() => void send()} disabled={sending || !msg.trim()} aria-label="Send">
            <ArrowRight />
          </Button>
        </div>
      </div>
      <div className="surface tutor-context">
        <span className="eyebrow accent">YAT KNOWS YOUR CONTEXT</span>
        <h3>Today’s learning context</h3>
        {[
          ['Current focus', subjects?.[0]?.name || 'Computer Science'],
          ['Target role', profile.role || 'AI/ML Engineer'],
          ['Pending tasks', `${tasks?.filter((t: any) => !t.completed)?.length || 0} sessions`],
          ['Tracked skills', `${skills?.length || 0} skills`],
          ['Language mode', language],
        ].map(([a, b]) => (
          <div className="context-row" key={a}>
            <span>{a}</span>
            <strong>{b}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function Learning({ active }: { active: string }) {
  return (
    <div className="learning-layout">
      <div className="surface learning-feature">
        <div className="learning-art"><BrainCircuit /></div>
        <Pill tone="blue">CONTINUE LEARNING</Pill>
        <h2>Machine Learning Basics</h2>
        <p className="muted">Understand the intuition behind models before you meet the math.</p>
        <Progress value={34} color="blue" />
        <div className="learning-foot"><span>34% complete · 3 of 9 lessons</span><Button className="primary-btn"><Play data-icon="inline-start" /> Continue</Button></div>
      </div>
      <div className="learning-list surface">
        <div className="card-head"><div><span className="eyebrow">{active.toUpperCase()}</span><h3>Made for your momentum</h3></div><Search /></div>
        {['What is supervised learning?','Linear regression intuition','Your first classification model','Practice: choose the right model'].map((x,i) => (
          <div className="lesson-row" key={x}>
            <div className={`lesson-num ${i < 2 ? 'done' : ''}`}>{i < 2 ? <Check /> : i + 1}</div>
            <div><strong>{x}</strong><small>{i < 2 ? 'Completed' : `${12 + i * 8} min`}</small></div>
            <ChevronRight />
          </div>
        ))}
      </div>
    </div>
  )
}

function SettingsWorkspace({
  profile,
  setProfile,
  subjects,
  addSubject,
  deleteSubject,
  skillsHook,
  notifications,
  setNotifications,
  language,
  setLanguage,
  toast,
  setToast,
}: any) {
  const router = useRouter()
  const update = (key: string, value: string) => setProfile((current: any) => ({ ...current, [key]: value }))
  
  const addSkillPrompt = async () => {
    const name = window.prompt('Enter skill name (e.g. Next.js, Python, System Design):')
    if (!name?.trim()) return
    try {
      await skillsHook.createSkill({
        name: name.trim(),
        category: 'Technical',
        proficiency: 'Intermediate',
        progress: 40,
        target_level: 'Advanced',
      })
      saveNotice(setToast, `Skill "${name.trim()}" added.`)
    } catch {
      saveNotice(setToast, 'Could not add skill.')
    }
  }

  const removeSkill = async (id: string, name: string) => {
    try {
      await skillsHook.deleteSkill(id)
      saveNotice(setToast, `Skill "${name}" removed.`)
    } catch {
      saveNotice(setToast, 'Could not remove skill.')
    }
  }

  const save = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const fullName = profile.name.trim()
    const college = profile.college.trim()
    const semesterNumber = Number(profile.semester)
    const cgpaNumber = profile.cgpa === '' ? null : Number(profile.cgpa)

    if (!hasRequiredProfileFields({ full_name: fullName, college })) {
      saveNotice(setToast, 'Name and college or university are required.')
      return
    }

    if (!Number.isInteger(semesterNumber) || semesterNumber < 1 || semesterNumber > 8) {
      saveNotice(setToast, 'Please select a valid semester.')
      return
    }

    if (cgpaNumber !== null && (!Number.isFinite(cgpaNumber) || cgpaNumber < 0 || cgpaNumber > 10)) {
      saveNotice(setToast, 'Please enter a CGPA between 0 and 10.')
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        college,
        branch: profile.branch.trim() || null,
        semester: semesterNumber,
        cgpa: cgpaNumber,
        career_goal: profile.role.trim() || null,
        preferred_language: language === 'English' ? 'english' : 'hinglish',
      })
      .eq('id', user.id)
      .select('full_name, college, branch, semester, cgpa, career_goal, preferred_language')
      .maybeSingle()

    if (error || !data) {
      console.error('Failed to save profile settings:', error)
      saveNotice(setToast, 'We could not save your profile. Please try again.')
      return
    }

    const preferred = data.preferred_language?.toLowerCase() === 'english' ? 'English' : 'Hinglish'
    setLanguage(preferred)
    setProfile((current: any) => ({
      ...current,
      name: data.full_name?.trim() || '',
      college: data.college?.trim() || '',
      branch: data.branch?.trim() || '',
      semester: data.semester != null ? String(data.semester) : '',
      cgpa: data.cgpa != null ? String(data.cgpa) : '',
      role: data.career_goal?.trim() || '',
      language: preferred,
    }))
    saveNotice(setToast, 'Profile settings saved.')
  }

  return (
    <div className="settings-page">
      <div className="settings-intro">
        <div><span className="eyebrow accent">YATVERSE CONTROL CENTER</span><h2>Make YATVERSE yours.</h2><p className="muted">Your preferences power every recommendation, task, and career signal.</p></div>
        <Button className="primary-btn" onClick={save}><Check data-icon="inline-start" /> Save changes</Button>
      </div>
      <div className="settings-grid">
        <section className="surface settings-card">
          <div className="settings-heading"><UserRound /><div><span className="eyebrow">PROFILE</span><h3>Your identity</h3></div></div>
          <div className="settings-fields">
            <label>Name<input value={profile.name} onChange={e => update('name', e.target.value)} /></label>
            <label>College / University<input value={profile.college} onChange={e => update('college', e.target.value)} /></label>
            <label>Email<input value={profile.email || ''} readOnly /></label>
            <label>Profile photo<div className="profile-upload"><div className="avatar">{(profile.name || 'Y').slice(0,1).toUpperCase()}</div><span>Connected account avatar</span></div></label>
          </div>
        </section>

        <section className="surface settings-card">
          <div className="settings-heading"><GraduationCap /><div><span className="eyebrow">ACADEMICS</span><h3>Your academic signal</h3></div></div>
          <div className="settings-fields">
            <label>Degree<select value={profile.degree} onChange={e => update('degree', e.target.value)}><option>B.Tech</option><option>BCA</option><option>B.Sc.</option></select></label>
            <label>Branch / Program<input value={profile.branch} onChange={e => update('branch', e.target.value)} /></label>
            <label>Current semester<select value={profile.semester} onChange={e => update('semester', e.target.value)}><option value="">Select semester</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option></select></label>
            <label>Current CGPA<input value={profile.cgpa} onChange={e => update('cgpa', e.target.value)} /></label>
            <label>Previous semester CGPA<input value={profile.previousCgpa} onChange={e => update('previousCgpa', e.target.value)} /></label>
            <label>Target CGPA<input value={profile.targetCgpa} onChange={e => update('targetCgpa', e.target.value)} /></label>
          </div>
          <p className="muted settings-help">Branch, semester, and current CGPA are saved to your profile record.</p>
        </section>

        <section className="surface settings-card">
          <div className="settings-heading"><BookOpen /><div><span className="eyebrow">SUBJECTS</span><h3>Current semester ({subjects.length})</h3></div><Button variant="outline" size="sm" onClick={addSubject}><Plus data-icon="inline-start" /> Manage</Button></div>
          <div className="settings-list">
            {subjects.map((subject: any) => (
              <div className="settings-row" key={subject.id}>
                <div><strong>{subject.name}</strong><small>{subject.code || 'No code'} · {subject.credits} credits</small></div>
                <div className="row-actions"><Button variant="ghost" size="icon" aria-label={`Delete ${subject.name}`} onClick={() => deleteSubject(subject.id)}><Trash2 /></Button></div>
              </div>
            ))}
          </div>
          <p className="muted settings-help">Edit, add, and track subject progress in the Subjects workspace.</p>
        </section>

        <section className="surface settings-card">
          <div className="settings-heading"><Target /><div><span className="eyebrow">CAREER GOALS</span><h3>Where you are headed</h3></div></div>
          <div className="settings-fields">
            <label className="field-wide">Desired role<input value={profile.role} onChange={e => update('role', e.target.value)} /></label>
            <label>Target companies<input value={profile.companies} onChange={e => update('companies', e.target.value)} /></label>
            <label>Career interests<input value={profile.interests} onChange={e => update('interests', e.target.value)} /></label>
          </div>
        </section>

        <section className="surface settings-card">
          <div className="settings-heading"><Zap /><div><span className="eyebrow">SKILLS</span><h3>Your tracked skills ({skillsHook?.skills?.length || 0})</h3></div><Button variant="outline" size="sm" onClick={addSkillPrompt}><Plus data-icon="inline-start" /> Add</Button></div>
          <div className="skill-pills">
            {skillsHook?.skills?.map((skill: any) => (
              <button className="skill-pill" key={skill.id} onClick={() => void removeSkill(skill.id, skill.name)}>
                {skill.name} <X />
              </button>
            ))}
            {(!skillsHook?.skills || skillsHook.skills.length === 0) && (
              <p className="muted text-xs">No skills tracked yet. Click Add to log your first skill.</p>
            )}
          </div>
          <p className="muted settings-help">Skills are persisted in Supabase with RLS. Click a skill to remove it.</p>
        </section>

        <section className="surface settings-card">
          <div className="settings-heading"><CalendarDays /><div><span className="eyebrow">SCHEDULE</span><h3>Design your rhythm</h3></div></div>
          <div className="settings-fields">
            <label>Preferred study hours<input value={profile.studyHours} onChange={e => update('studyHours', e.target.value)} /></label>
            <label>Available study days<select defaultValue="Weekdays"><option>Weekdays</option><option>Weekends</option><option>Every day</option></select></label>
          </div>
        </section>

        <section className="surface settings-card">
          <div className="settings-heading"><Sparkles /><div><span className="eyebrow">LANGUAGE</span><h3>Tutor language</h3></div></div>
          <div className="choice-row">
            <button className={language === 'English' ? 'choice-on' : ''} onClick={() => { setLanguage('English'); update('language', 'English') }}>English</button>
            <button className={language === 'Hinglish' ? 'choice-on' : ''} onClick={() => { setLanguage('Hinglish'); update('language', 'Hinglish') }}>Hinglish</button>
          </div>
        </section>

        <section className="surface settings-card">
          <div className="settings-heading"><Bell /><div><span className="eyebrow">NOTIFICATIONS</span><h3>Stay in the loop</h3></div></div>
          <div className="toggle-list">
            {[['study','Study reminders'],['revision','Revision reminders'],['assignments','Assignment / exam reminders'],['career','Career reminders']].map(([key,label]) => (
              <label className="toggle-row" key={key}>
                <span>{label}</span>
                <input type="checkbox" checked={notifications[key]} onChange={e => setNotifications((current: any) => ({ ...current, [key]: e.target.checked }))} />
              </label>
            ))}
          </div>
        </section>

        <section className="surface settings-card account-card">
          <div className="settings-heading"><Settings /><div><span className="eyebrow">ACCOUNT</span><h3>Account access</h3></div></div>
          <div className="account-actions">
            <Button variant="outline" onClick={() => saveNotice(setToast, 'Password reset email can be requested at login.')}>Change password</Button>
            <Button variant="outline" onClick={async () => {
              const supabase = createClient()
              await supabase.auth.signOut()
              router.push('/login')
              router.refresh()
            }}>Logout</Button>
          </div>
        </section>

        <section className="surface settings-card danger-card">
          <div className="settings-heading"><Trash2 /><div><span className="eyebrow">DANGER ZONE</span><h3>Reset your journey</h3></div></div>
          <p className="muted">These actions clear current workspace state.</p>
          <div className="account-actions">
            <Button variant="outline" onClick={() => saveNotice(setToast, 'Journey reset requested.')}>Reset session cache</Button>
          </div>
        </section>
      </div>
    </div>
  )
}

function Generic({ active }: { active: string }) {
  return (
    <div className="surface empty-page">
      <div className="empty-orbit"><Sparkles /></div>
      <span className="eyebrow accent">{active.toUpperCase()}</span>
      <h2>Your {active.toLowerCase()} space is ready.</h2>
      <p className="muted">This workspace is connected to your academic and career journey.</p>
      <Button className="primary-btn"><Plus data-icon="inline-start" /> Add item</Button>
    </div>
  )
}


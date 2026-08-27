'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  Award,
  BookOpen,
  Briefcase,
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileDown,
  FileText,
  GraduationCap,
  HelpCircle,
  Layers,
  Lightbulb,
  Loader2,
  Mail,
  Maximize2,
  Pencil,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  User,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pill } from '@/components/ui/pill'
import { Progress } from '@/components/ui/progress'

interface ResumeBuilderProps {
  profile: any
  skills: any[]
  academic: any
  notify: (msg: string) => void
}

type ResumeTheme = 'modern' | 'classic' | 'minimalist' | 'compact'

export function ResumeBuilder({
  profile,
  skills,
  academic,
  notify,
}: ResumeBuilderProps) {
  const targetRole = profile?.role || profile?.career_goal || 'Software Engineer'
  const [selectedTheme, setSelectedTheme] = useState<ResumeTheme>('modern')
  const [activeTab, setActiveTab] = useState<'editor' | 'ai_tools' | 'preview'>('editor')

  // Editable Resume State
  const [personalInfo, setPersonalInfo] = useState({
    name: profile?.name || profile?.full_name || 'Alex Morgan',
    email: profile?.email || 'alex.morgan@university.edu',
    phone: '+91 98765 43210',
    location: 'Bangalore, India',
    github: 'github.com/alex-morgan',
    linkedin: 'linkedin.com/in/alexmorgan-dev',
    portfolio: 'alexmorgan.dev',
    summary:
      'Computer Science undergraduate with solid algorithmic problem-solving and full-stack engineering foundations. Experienced in building performant TypeScript/Python systems, database optimization, and modern distributed web architectures.',
  })

  const [education, setEducation] = useState({
    college: profile?.college || 'National Institute of Technology',
    degree: profile?.branch ? `B.Tech in ${profile.branch}` : 'B.Tech in Computer Science & Engineering',
    semester: profile?.semester ? `Semester ${profile.semester}` : 'Semester 4',
    cgpa: profile?.cgpa ? `${profile.cgpa} / 10.0` : '8.8 / 10.0',
    duration: '2023 – 2027',
    coursework: 'Data Structures & Algorithms, Operating Systems, Database Management Systems, Computer Networks, System Design',
  })

  const [skillCategories, setSkillCategories] = useState({
    languages: 'TypeScript, JavaScript, Python, C++, Java, SQL',
    frameworks: 'React.js, Next.js 15, Node.js, Express, Tailwind CSS, Fastify',
    databases: 'PostgreSQL, Supabase, Redis, MongoDB, SQLite',
    developerTools: 'Git, GitHub, Docker, Linux, Postman, Vercel, RESTful APIs',
  })

  const [experiences, setExperiences] = useState([
    {
      id: 'exp-1',
      role: 'Software Engineering Intern',
      company: 'TechCorp Innovations',
      location: 'Remote',
      duration: 'Jun 2025 – Aug 2025',
      bullets: [
        'Engineered responsive full-stack dashboards using Next.js 15 and PostgreSQL, reducing average query response time by 35%.',
        'Implemented Redis caching layer for high-frequency analytical endpoints, sustaining 5,000+ concurrent requests.',
        'Collaborated in Agile sprints with Senior Engineers, contributing 20+ reviewed pull requests and unit test suites.',
      ],
    },
  ])

  const [projects, setProjects] = useState([
    {
      id: 'p1',
      title: 'YATVERSE Student OS & Learning Hub',
      stack: 'Next.js 15, TypeScript, Supabase, Gemini 3.6 Flash, Tailwind CSS',
      link: 'github.com/alex-morgan/yatverse',
      bullets: [
        'Architected full-stack academic operating system with automated syllabus unit progress tracking and role-aware career roadmaps.',
        'Engineered an isolated multilingual code sandbox executing JavaScript, Python, C++, and Java with sub-200ms latency.',
        'Integrated Gemini AI for real-time Socratic learning, automated study scheduling, and ATS career readiness auditing.',
      ],
    },
    {
      id: 'p2',
      title: 'Distributed Key-Value Cache Engine',
      stack: 'Go, Raft Consensus, gRPC, Docker, Protocol Buffers',
      link: 'github.com/alex-morgan/distributed-kv',
      bullets: [
        'Built high-throughput in-memory key-value database implementing Raft distributed consensus for fault-tolerant state replication.',
        'Optimized log compaction and snapshotting, reducing memory overhead by 40% under sustained 20k QPS write loads.',
      ],
    },
  ])

  const [certifications, setCertifications] = useState([
    { id: 'c1', name: 'Meta Full-Stack Developer Professional Certificate', issuer: 'Coursera / Meta', year: '2025' },
    { id: 'c2', name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', year: '2025' },
  ])

  // AI Assistant State
  const [loadingAts, setLoadingAts] = useState(false)
  const [atsAuditResult, setAtsAuditResult] = useState<any | null>(null)
  const [rawBullet, setRawBullet] = useState('')
  const [loadingBullet, setLoadingBullet] = useState(false)
  const [bulletSuggestions, setBulletSuggestions] = useState<any | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [jobDescriptionInput, setJobDescriptionInput] = useState('')
  const [loadingJdMatch, setLoadingJdMatch] = useState(false)
  const [jdMatchResult, setJdMatchResult] = useState<any | null>(null)

  // Assemble full resume payload
  const buildResumePayload = () => ({
    personalInfo,
    education,
    skills: skillCategories,
    experiences,
    projects,
    certifications,
    targetRole,
  })

  // Run ATS Audit
  const runAtsAudit = async () => {
    setLoadingAts(true)
    try {
      const res = await fetch('/api/ai/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ats_audit',
          resumeData: buildResumePayload(),
          targetRole,
        }),
      })

      const data = await res.json()
      if (data.audit) {
        setAtsAuditResult(data.audit)
        notify(`ATS Audit completed: Score ${data.audit.atsScore}/100!`)
      } else {
        notify('ATS audit completed with heuristics.')
      }
    } catch (err) {
      console.error('ATS audit error:', err)
      notify('Failed to complete ATS audit.')
    } finally {
      setLoadingAts(false)
    }
  }

  // Match with JD
  const runJdMatch = async () => {
    if (!jobDescriptionInput.trim()) {
      notify('Please paste a job description first.')
      return
    }
    setLoadingJdMatch(true)
    try {
      const res = await fetch('/api/ai/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'match_jd',
          resumeData: buildResumePayload(),
          targetRole,
          jobDescription: jobDescriptionInput,
        }),
      })

      const data = await res.json()
      if (data.result) {
        setJdMatchResult(data.result)
        notify(`Job Match Analysis: ${data.result.matchPercentage}% Alignment!`)
      }
    } catch (err) {
      console.error('JD Match error:', err)
      notify('Failed to run job description analysis.')
    } finally {
      setLoadingJdMatch(false)
    }
  }

  // Polish Bullet Point with XYZ Formula
  const polishBulletPoint = async () => {
    if (!rawBullet.trim()) return
    setLoadingBullet(true)
    try {
      const res = await fetch('/api/ai/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'polish_bullet',
          bulletPoint: rawBullet,
          targetRole,
        }),
      })

      const data = await res.json()
      if (data.result) {
        setBulletSuggestions(data.result)
        notify('AI formulated 3 high-impact XYZ bullet options!')
      }
    } catch (err) {
      console.error('Bullet polish error:', err)
      notify('Could not polish bullet point.')
    } finally {
      setLoadingBullet(false)
    }
  }

  // Generate Professional Summary
  const generateAiSummary = async () => {
    setLoadingSummary(true)
    try {
      const res = await fetch('/api/ai/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_summary',
          resumeData: buildResumePayload(),
          targetRole,
        }),
      })

      const data = await res.json()
      if (data.result?.summaries?.[0]) {
        setPersonalInfo((prev) => ({
          ...prev,
          summary: data.result.summaries[0],
        }))
        notify('Applied AI-optimized professional summary!')
      }
    } catch (err) {
      console.error('Summary error:', err)
      notify('Could not generate summary.')
    } finally {
      setLoadingSummary(false)
    }
  }

  // Print isolation execution
  const handlePrint = () => {
    window.print()
  }

  // Add new project
  const handleAddProject = () => {
    const newProj = {
      id: `p-${Date.now()}`,
      title: 'New Technical Project',
      stack: 'TypeScript, React, Node.js',
      link: 'github.com/alex-morgan/project',
      bullets: [
        'Engineered core architecture delivering high reliability and responsive UI performance.',
        'Integrated RESTful APIs and state management with comprehensive test coverage.',
      ],
    }
    setProjects((prev) => [...prev, newProj])
    notify('Added new project block.')
  }

  // Add new experience
  const handleAddExperience = () => {
    const newExp = {
      id: `exp-${Date.now()}`,
      role: 'Software Developer Intern',
      company: 'Organization Name',
      location: 'City, Country',
      duration: 'Summer 2025',
      bullets: [
        'Developed features and optimized code quality following modern engineering standards.',
      ],
    }
    setExperiences((prev) => [...prev, newExp])
    notify('Added new experience block.')
  }

  // Theme styling helpers
  const getThemeClass = () => {
    switch (selectedTheme) {
      case 'classic':
        return 'font-serif bg-white text-zinc-900 leading-normal'
      case 'minimalist':
        return 'font-mono bg-white text-zinc-950 leading-snug tracking-tight text-xs'
      case 'compact':
        return 'font-sans bg-white text-zinc-900 leading-tight text-xs'
      case 'modern':
      default:
        return 'font-sans bg-white text-zinc-900 leading-relaxed'
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="surface p-5 rounded-2xl border border-white/5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-white">Professional ATS Resume Engine</h2>
            <Pill tone="violet" className="text-[10px] uppercase font-mono">
              Role: {targetRole}
            </Pill>
            <Pill tone="emerald" className="text-[10px] uppercase font-mono hidden sm:inline-flex">
              A4 Clean Print Ready
            </Pill>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Build, audit, and export an industry-standard, ATS-optimized one-page resume with verified student context.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Theme Selector */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5 text-xs">
            {(['modern', 'classic', 'minimalist', 'compact'] as ResumeTheme[]).map((theme) => (
              <button
                key={theme}
                onClick={() => setSelectedTheme(theme)}
                className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                  selectedTheme === theme
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={runAtsAudit}
            disabled={loadingAts}
            className="text-xs h-8 bg-violet-600 hover:bg-violet-500 text-white font-medium"
          >
            {loadingAts ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Auditing ATS…
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Run ATS Audit
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            className="text-xs h-8 border-white/10 hover:bg-white/5 text-zinc-200"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Print / Save PDF
          </Button>
        </div>
      </div>

      {/* ATS Audit Score Banner */}
      {atsAuditResult && (
        <div className="surface p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold text-lg font-mono shadow-inner">
                {atsAuditResult.atsScore}
              </div>
              <div>
                <strong className="text-sm font-semibold text-white block">
                  ATS Match Score: {atsAuditResult.summaryRating || 'Competitive'}
                </strong>
                <span className="text-xs text-zinc-400">
                  Targeted benchmark: {targetRole} · Evaluated with Gemini 3.6 Flash
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill tone="emerald" className="text-xs font-mono">
                {atsAuditResult.matchedKeywords?.length || 0} Matched Keywords
              </Pill>
              <Pill tone="amber" className="text-xs font-mono">
                {atsAuditResult.missingKeywords?.length || 0} Missing Target Terms
              </Pill>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
              <strong className="text-emerald-300 font-mono flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> High-Yield Keywords Found:
              </strong>
              <div className="flex flex-wrap gap-1">
                {(atsAuditResult.matchedKeywords || []).map((kw: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[11px] font-mono border border-emerald-500/20">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
              <strong className="text-amber-300 font-mono flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" /> Recommended Keywords to Add:
              </strong>
              <div className="flex flex-wrap gap-1">
                {(atsAuditResult.missingKeywords || []).map((kw: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[11px] font-mono border border-amber-500/20">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {atsAuditResult.actionableImprovements && atsAuditResult.actionableImprovements.length > 0 && (
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-zinc-300 space-y-1">
              <strong className="text-violet-300 font-mono block">Actionable ATS Recommendations:</strong>
              <ul className="list-disc pl-4 space-y-0.5 text-zinc-300">
                {atsAuditResult.actionableImprovements.map((imp: string, i: number) => (
                  <li key={i}>{imp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Controls & AI Tools (Left) + Clean A4 Printable Sheet (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Editor & AI Suite */}
        <div className="lg:col-span-5 space-y-5">
          {/* Navigation Tabs */}
          <div className="flex bg-zinc-900 border border-white/10 rounded-xl p-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'editor' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Pencil className="w-3.5 h-3.5 inline mr-1" /> Resume Details
            </button>
            <button
              onClick={() => setActiveTab('ai_tools')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'ai_tools' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 inline mr-1 text-violet-300" /> AI Enhancers
            </button>
          </div>

          {activeTab === 'editor' && (
            <div className="space-y-4">
              {/* Personal Info Form */}
              <div className="surface p-4 rounded-xl border border-white/5 space-y-3">
                <strong className="text-xs font-mono uppercase text-violet-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Contact & Header Info
                </strong>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Full Name</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white"
                      value={personalInfo.name}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white"
                      value={personalInfo.email}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Phone</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white"
                      value={personalInfo.phone}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Location</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white"
                      value={personalInfo.location}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, location: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">GitHub</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white"
                      value={personalInfo.github}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, github: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">LinkedIn</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white"
                      value={personalInfo.linkedin}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, linkedin: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-zinc-400">Professional Summary</label>
                    <button
                      onClick={generateAiSummary}
                      disabled={loadingSummary}
                      className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      {loadingSummary ? 'Writing…' : 'AI Rewrite'}
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    className="w-full bg-black/40 border border-white/10 rounded p-2 text-xs text-white resize-none"
                    value={personalInfo.summary}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, summary: e.target.value })}
                  />
                </div>
              </div>

              {/* Education Form */}
              <div className="surface p-4 rounded-xl border border-white/5 space-y-3">
                <strong className="text-xs font-mono uppercase text-violet-300 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" /> Education & Coursework
                </strong>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="col-span-2">
                    <label className="text-[10px] text-zinc-400 block mb-1">University / College</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white"
                      value={education.college}
                      onChange={(e) => setEducation({ ...education, college: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Degree & Major</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white"
                      value={education.degree}
                      onChange={(e) => setEducation({ ...education, degree: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Duration / Years</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white"
                      value={education.duration}
                      onChange={(e) => setEducation({ ...education, duration: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">CGPA / Percentage</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white"
                      value={education.cgpa}
                      onChange={(e) => setEducation({ ...education, cgpa: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Semester</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white"
                      value={education.semester}
                      onChange={(e) => setEducation({ ...education, semester: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-zinc-400 block mb-1">Relevant Core Coursework</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white"
                      value={education.coursework}
                      onChange={(e) => setEducation({ ...education, coursework: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Technical Skills Form */}
              <div className="surface p-4 rounded-xl border border-white/5 space-y-3">
                <strong className="text-xs font-mono uppercase text-violet-300 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5" /> Technical Skills Categorization
                </strong>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Languages & Core CS</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white font-mono text-[11px]"
                      value={skillCategories.languages}
                      onChange={(e) => setSkillCategories({ ...skillCategories, languages: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Frameworks & Libraries</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white font-mono text-[11px]"
                      value={skillCategories.frameworks}
                      onChange={(e) => setSkillCategories({ ...skillCategories, frameworks: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Databases & Storage</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white font-mono text-[11px]"
                      value={skillCategories.databases}
                      onChange={(e) => setSkillCategories({ ...skillCategories, databases: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Developer Tools & Methodologies</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white font-mono text-[11px]"
                      value={skillCategories.developerTools}
                      onChange={(e) => setSkillCategories({ ...skillCategories, developerTools: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Projects List & Add Button */}
              <div className="surface p-4 rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-mono uppercase text-violet-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Technical Projects ({projects.length})
                  </strong>
                  <button
                    onClick={handleAddProject}
                    className="text-xs text-violet-300 hover:text-white flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Project
                  </button>
                </div>

                <div className="space-y-3">
                  {projects.map((proj, pIdx) => (
                    <div key={proj.id} className="p-3 bg-black/40 border border-white/5 rounded-lg space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={proj.title}
                          onChange={(e) => {
                            const updated = [...projects]
                            updated[pIdx].title = e.target.value
                            setProjects(updated)
                          }}
                          className="bg-transparent font-semibold text-white border-b border-transparent focus:border-violet-500 focus:outline-none flex-1"
                        />
                        <button
                          onClick={() => setProjects(projects.filter((p) => p.id !== proj.id))}
                          className="text-zinc-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Tech stack (e.g. Next.js, Go, Docker)"
                        value={proj.stack}
                        onChange={(e) => {
                          const updated = [...projects]
                          updated[pIdx].stack = e.target.value
                          setProjects(updated)
                        }}
                        className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-300 font-mono"
                      />

                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 block">Bullet Points</label>
                        {proj.bullets.map((b, bIdx) => (
                          <div key={bIdx} className="flex items-start gap-1">
                            <textarea
                              rows={2}
                              value={b}
                              onChange={(e) => {
                                const updated = [...projects]
                                updated[pIdx].bullets[bIdx] = e.target.value
                                setProjects(updated)
                              }}
                              className="w-full bg-black/60 border border-white/10 rounded p-1.5 text-xs text-zinc-200 resize-none leading-tight"
                            />
                            <button
                              onClick={() => {
                                const updated = [...projects]
                                updated[pIdx].bullets = updated[pIdx].bullets.filter((_, i) => i !== bIdx)
                                setProjects(updated)
                              }}
                              className="text-zinc-500 hover:text-red-400 p-1 mt-1"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const updated = [...projects]
                            updated[pIdx].bullets.push('Accomplished outcome by executing specific technical method.')
                            setProjects(updated)
                          }}
                          className="text-[10px] text-violet-400 hover:text-violet-300 mt-1 block"
                        >
                          + Add bullet point
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai_tools' && (
            <div className="space-y-4">
              {/* AI Bullet Point Enhancer */}
              <div className="surface p-4 rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <strong className="text-xs font-mono uppercase text-violet-300">
                    XYZ Formula Bullet Point Enhancer
                  </strong>
                </div>
                <p className="text-xs text-zinc-400">
                  Transform raw task notes into impactful resume statements: &ldquo;Accomplished [X] as measured by [Y], by doing [Z]&rdquo;.
                </p>
                <textarea
                  className="w-full h-20 p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 font-mono"
                  placeholder="e.g. Worked on database queries and made backend API faster."
                  value={rawBullet}
                  onChange={(e) => setRawBullet(e.target.value)}
                />
                <Button
                  size="sm"
                  className="w-full text-xs bg-violet-600 hover:bg-violet-500 text-white"
                  onClick={polishBulletPoint}
                  disabled={loadingBullet}
                >
                  {loadingBullet ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Formulating High-Impact Bullets…
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Enhance Bullet with Gemini
                    </>
                  )}
                </Button>

                {bulletSuggestions && (
                  <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/20 space-y-2 mt-2">
                    <span className="block text-[11px] font-mono text-violet-300 font-semibold">
                      AI Suggested Variations:
                    </span>
                    {bulletSuggestions.improvedBullets?.map((b: string, i: number) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-black/50 border border-white/5 text-xs text-zinc-200 flex items-start justify-between gap-2"
                      >
                        <span className="leading-relaxed flex-1">{b}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                          onClick={() => {
                            navigator.clipboard.writeText(b)
                            notify('Copied enhanced bullet to clipboard!')
                          }}
                          title="Copy bullet"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Match Against Job Description */}
              <div className="surface p-4 rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-violet-400" />
                  <strong className="text-xs font-mono uppercase text-violet-300">
                    Target Job Description Matcher
                  </strong>
                </div>
                <p className="text-xs text-zinc-400">
                  Paste the specific job description or requirements to identify critical missing skills and tailored resume tweaks.
                </p>
                <textarea
                  className="w-full h-24 p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                  placeholder="Paste Job Description / Requirements here…"
                  value={jobDescriptionInput}
                  onChange={(e) => setJobDescriptionInput(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={runJdMatch}
                  disabled={loadingJdMatch}
                >
                  {loadingJdMatch ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Analyzing Job Alignment…
                    </>
                  ) : (
                    <>
                      <Target className="w-3.5 h-3.5 mr-1.5 text-violet-400" /> Match with Job Description
                    </>
                  )}
                </Button>

                {jdMatchResult && (
                  <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <strong className="text-white font-mono">
                        Job Alignment Score: {jdMatchResult.matchPercentage}%
                      </strong>
                      <Pill tone={jdMatchResult.matchPercentage >= 70 ? 'emerald' : 'amber'}>
                        {jdMatchResult.verdict || 'Analysis Complete'}
                      </Pill>
                    </div>
                    {jdMatchResult.criticalMissingSkills && (
                      <div>
                        <span className="text-[10px] text-amber-400 block font-mono">Missing from JD:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {jdMatchResult.criticalMissingSkills.map((sk: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px]">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Clean A4 ATS Resume Sheet (True White Paper Document) */}
        <div className="lg:col-span-7 flex justify-center">
          {/* Printable Resume Container with Strict Print Isolation ID */}
          <div
            id="resume-document-to-print"
            className={`w-full max-w-[800px] min-h-[1050px] shadow-2xl p-8 sm:p-10 rounded-sm border border-zinc-300 print:border-none print:shadow-none print:p-0 ${getThemeClass()}`}
          >
            {/* Header / Contact Info */}
            <div className="text-center pb-3 border-b-2 border-zinc-900 mb-4">
              <h1 className="text-2xl font-bold tracking-tight uppercase text-zinc-950">
                {personalInfo.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-[11px] text-zinc-700 mt-1">
                <span>{personalInfo.location}</span>
                <span>•</span>
                <span>{personalInfo.email}</span>
                <span>•</span>
                <span>{personalInfo.phone}</span>
                <span>•</span>
                <span className="font-semibold text-zinc-900">{personalInfo.github}</span>
                <span>•</span>
                <span className="font-semibold text-zinc-900">{personalInfo.linkedin}</span>
              </div>
            </div>

            {/* Professional Summary */}
            {personalInfo.summary && (
              <div className="mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 border-b border-zinc-300 pb-0.5 mb-1.5">
                  Professional Summary
                </h2>
                <p className="text-[11.5px] text-zinc-800 leading-relaxed">
                  {personalInfo.summary}
                </p>
              </div>
            )}

            {/* Education */}
            <div className="mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 border-b border-zinc-300 pb-0.5 mb-2">
                Education
              </h2>
              <div className="space-y-1.5 text-[11.5px]">
                <div className="flex items-baseline justify-between">
                  <strong className="font-bold text-zinc-950">{education.college}</strong>
                  <span className="text-zinc-600 font-mono text-[11px]">{education.duration}</span>
                </div>
                <div className="flex items-baseline justify-between text-zinc-800">
                  <span>{education.degree} ({education.semester})</span>
                  <span className="font-semibold text-zinc-950">CGPA: {education.cgpa}</span>
                </div>
                {education.coursework && (
                  <p className="text-[10.5px] text-zinc-600 leading-snug">
                    <strong className="text-zinc-800">Coursework:</strong> {education.coursework}
                  </p>
                )}
              </div>
            </div>

            {/* Technical Skills */}
            <div className="mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 border-b border-zinc-300 pb-0.5 mb-2">
                Technical Skills
              </h2>
              <div className="space-y-1 text-[11px] text-zinc-800">
                <div>
                  <strong className="text-zinc-950 font-semibold">Languages & Core CS:</strong>{' '}
                  <span>{skillCategories.languages}</span>
                </div>
                <div>
                  <strong className="text-zinc-950 font-semibold">Frameworks & Libraries:</strong>{' '}
                  <span>{skillCategories.frameworks}</span>
                </div>
                <div>
                  <strong className="text-zinc-950 font-semibold">Databases & Storage:</strong>{' '}
                  <span>{skillCategories.databases}</span>
                </div>
                <div>
                  <strong className="text-zinc-950 font-semibold">Developer Tools:</strong>{' '}
                  <span>{skillCategories.developerTools}</span>
                </div>
              </div>
            </div>

            {/* Experience / Internships */}
            {experiences.length > 0 && (
              <div className="mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 border-b border-zinc-300 pb-0.5 mb-2">
                  Work Experience & Internships
                </h2>
                <div className="space-y-3">
                  {experiences.map((exp) => (
                    <div key={exp.id} className="text-[11.5px]">
                      <div className="flex items-baseline justify-between">
                        <strong className="font-bold text-zinc-950">
                          {exp.role} <span className="font-normal text-zinc-700">| {exp.company}</span>
                        </strong>
                        <span className="text-zinc-600 font-mono text-[11px]">{exp.duration}</span>
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5 text-zinc-800 mt-1 leading-relaxed">
                        {exp.bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Technical Projects */}
            <div className="mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 border-b border-zinc-300 pb-0.5 mb-2">
                Technical Projects
              </h2>
              <div className="space-y-3">
                {projects.map((proj) => (
                  <div key={proj.id} className="text-[11.5px]">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <strong className="font-bold text-zinc-950">{proj.title}</strong>
                        {proj.stack && (
                          <span className="text-zinc-600 text-[10.5px] ml-2">
                            | <em>{proj.stack}</em>
                          </span>
                        )}
                      </div>
                      {proj.link && (
                        <span className="text-zinc-700 font-mono text-[10.5px]">{proj.link}</span>
                      )}
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-zinc-800 mt-1 leading-relaxed">
                      {proj.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Certifications & Honors */}
            {certifications.length > 0 && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 border-b border-zinc-300 pb-0.5 mb-1.5">
                  Certifications & Honors
                </h2>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-zinc-800">
                  {certifications.map((c) => (
                    <li key={c.id}>
                      <strong className="text-zinc-950">{c.name}</strong> – {c.issuer} ({c.year})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

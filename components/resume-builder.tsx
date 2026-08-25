'use client'

import { useMemo, useState } from 'react'
import {
  Award,
  BookOpen,
  Briefcase,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileCheck,
  FileDown,
  FileText,
  GraduationCap,
  HelpCircle,
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

export function ResumeBuilder({
  profile,
  skills,
  academic,
  notify,
}: ResumeBuilderProps) {
  const targetRole = profile?.role || profile?.career_goal || 'Software Engineer'

  // Editable Resume State
  const [personalInfo, setPersonalInfo] = useState({
    name: profile?.name || 'Alex Morgan',
    email: profile?.email || 'alex.morgan@university.edu',
    phone: '+91 98765 43210',
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
  })

  const [resumeSkills, setResumeSkills] = useState<string[]>(
    skills?.length
      ? skills.map((s) => s.name)
      : ['TypeScript', 'React.js', 'Next.js', 'Python', 'Node.js', 'PostgreSQL', 'Data Structures & Algorithms', 'Git / GitHub', 'RESTful APIs', 'Docker']
  )

  const [newSkillInput, setNewSkillInput] = useState('')

  const [projects, setProjects] = useState([
    {
      id: 'p1',
      title: 'YATVERSE Student OS & Learning Hub',
      stack: 'Next.js 15, TypeScript, Supabase, Gemini 2.5 Flash, Tailwind CSS',
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
      bullets: [
        'Built high-throughput in-memory key-value database implementing Raft distributed consensus for fault-tolerant state replication.',
        'Optimized log compaction and snapshotting, reducing memory overhead by 40% under sustained 20k QPS write loads.',
      ],
    },
  ])

  // AI State
  const [loadingAts, setLoadingAts] = useState(false)
  const [atsAuditResult, setAtsAuditResult] = useState<any | null>(null)

  // AI Bullet Enhancer State
  const [rawBullet, setRawBullet] = useState('')
  const [loadingBullet, setLoadingBullet] = useState(false)
  const [bulletSuggestions, setBulletSuggestions] = useState<any | null>(null)

  // AI Summary Generator State
  const [loadingSummary, setLoadingSummary] = useState(false)

  // Run ATS Audit
  const runAtsAudit = async () => {
    setLoadingAts(true)
    try {
      const res = await fetch('/api/ai/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ats_audit',
          targetRole,
          resumeData: {
            personalInfo,
            education,
            skills: resumeSkills,
            projects,
          },
        }),
      })

      if (!res.ok) throw new Error('ATS Audit failed')
      const data = await res.json()
      if (data.audit) {
        setAtsAuditResult(data.audit)
        notify(`ATS Analysis Complete: ${data.audit.atsScore}% Compatibility Score!`)
      }
    } catch {
      notify('Could not run ATS audit. Please try again.')
    } finally {
      setLoadingAts(false)
    }
  }

  // Polish Bullet Point
  const polishBulletPoint = async () => {
    if (!rawBullet.trim()) {
      notify('Please enter a bullet point to enhance.')
      return
    }
    setLoadingBullet(true)
    try {
      const res = await fetch('/api/ai/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'polish_bullet',
          targetRole,
          bulletPoint: rawBullet,
        }),
      })

      if (!res.ok) throw new Error('Failed to polish bullet')
      const data = await res.json()
      if (data.result) {
        setBulletSuggestions(data.result)
        notify('Generated high-impact XYZ formula bullets with Gemini!')
      }
    } catch {
      notify('Could not enhance bullet point.')
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
          targetRole,
          resumeData: {
            education,
            skills: resumeSkills,
          },
        }),
      })

      if (!res.ok) throw new Error('Failed to generate summary')
      const data = await res.json()
      if (data.result?.summaries?.[0]) {
        setPersonalInfo((prev) => ({ ...prev, summary: data.result.summaries[0] }))
        notify('Generated ATS-optimized executive summary!')
      }
    } catch {
      notify('Could not generate summary.')
    } finally {
      setLoadingSummary(false)
    }
  }

  // Print / Export
  const handlePrint = () => {
    window.print()
  }

  const addSkill = () => {
    if (!newSkillInput.trim()) return
    if (resumeSkills.includes(newSkillInput.trim())) {
      notify('Skill already present.')
      return
    }
    setResumeSkills([...resumeSkills, newSkillInput.trim()])
    setNewSkillInput('')
  }

  const removeSkill = (sk: string) => {
    setResumeSkills(resumeSkills.filter((s) => s !== sk))
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="surface panel">
        <div className="section-head mt-0 mb-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Pill tone="violet">AI RESUME & ATS ENGINE</Pill>
              <Pill tone="emerald">TARGET: {targetRole.toUpperCase()}</Pill>
            </div>
            <h2>Professional Tech Resume Builder</h2>
            <p className="muted">
              ATS keyword optimization, Google XYZ bullet formulation, and career-aligned skill matching powered by Gemini.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={runAtsAudit}
              disabled={loadingAts}
              className="text-xs"
            >
              {loadingAts ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Auditing ATS…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-violet-400" /> Run AI ATS Audit
                </>
              )}
            </Button>
            <Button
              className="primary-btn text-xs"
              onClick={handlePrint}
            >
              <Printer data-icon="inline-start" /> Print / Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* ATS Audit Results Banner */}
      {atsAuditResult && (
        <div className="surface panel border border-violet-500/30 bg-violet-950/20 p-5 rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center font-mono font-bold text-lg text-violet-300">
                {atsAuditResult.atsScore}%
              </div>
              <div>
                <strong className="block text-sm text-white">
                  ATS Score: {atsAuditResult.summaryRating || 'Competitive'}
                </strong>
                <span className="text-xs text-zinc-400">
                  Target Role: {targetRole} · Formatted for modern ATS parsers
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-zinc-400 hover:text-white"
              onClick={() => setAtsAuditResult(null)}
            >
              <X className="w-3.5 h-3.5 mr-1" /> Dismiss
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
              <strong className="block text-emerald-400 uppercase font-mono tracking-wider">
                ✓ Matched ATS Keywords
              </strong>
              <div className="flex flex-wrap gap-1">
                {atsAuditResult.matchedKeywords?.map((kw: string) => (
                  <span key={kw} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px]">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
              <strong className="block text-amber-400 uppercase font-mono tracking-wider">
                ⚠ Recommended Keywords
              </strong>
              <div className="flex flex-wrap gap-1">
                {atsAuditResult.missingKeywords?.map((kw: string) => (
                  <span
                    key={kw}
                    className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] cursor-pointer hover:bg-amber-500/20"
                    onClick={() => {
                      if (!resumeSkills.includes(kw)) {
                        setResumeSkills([...resumeSkills, kw])
                        notify(`Added "${kw}" to your skills!`)
                      }
                    }}
                    title="Click to add to skills"
                  >
                    + {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
              <strong className="block text-violet-400 uppercase font-mono tracking-wider">
                💡 Key Improvements
              </strong>
              <ul className="text-zinc-300 space-y-1 list-disc list-inside">
                {atsAuditResult.actionableImprovements?.map((imp: string, idx: number) => (
                  <li key={idx} className="leading-snug">
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: AI Assistant Tools on Left, Live Resume Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: AI Power Tools */}
        <div className="lg:col-span-5 space-y-5">
          {/* AI Bullet Point Enhancer */}
          <div className="surface panel space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <strong className="text-xs font-mono uppercase text-violet-300">
                AI Bullet Point Enhancer (XYZ Formula)
              </strong>
            </div>
            <p className="text-xs text-zinc-400">
              Transform basic task statements into quantitative accomplishments (&ldquo;Accomplished X as measured by Y, by doing Z&rdquo;).
            </p>
            <textarea
              className="w-full h-20 p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 font-mono"
              placeholder="e.g. Worked on database queries and made backend API faster."
              value={rawBullet}
              onChange={(e) => setRawBullet(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={polishBulletPoint}
              disabled={loadingBullet}
            >
              {loadingBullet ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Formulating High-Impact Bullets…
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 mr-1.5 text-violet-400" /> Enhance Bullet with Gemini
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
                    className="p-2 rounded-lg bg-black/50 border border-white/5 text-xs text-zinc-200 flex items-start justify-between gap-2"
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

          {/* Quick Skill Tags Editor */}
          <div className="surface panel space-y-3">
            <div className="flex items-center justify-between">
              <strong className="text-xs font-mono uppercase text-zinc-300">
                Skills & Technical Competencies ({resumeSkills.length})
              </strong>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                placeholder="Add technology (e.g. Redis, Kubernetes)"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addSkill()
                }}
              />
              <Button size="sm" variant="outline" className="text-xs" onClick={addSkill}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
              {resumeSkills.map((sk) => (
                <span
                  key={sk}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-zinc-300 border border-white/10 font-mono"
                >
                  {sk}
                  <button
                    className="text-zinc-500 hover:text-red-400 ml-1"
                    onClick={() => removeSkill(sk)}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Printable ATS Resume Preview */}
        <div className="lg:col-span-7">
          <div className="surface panel p-6 md:p-8 rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl text-zinc-100 font-sans print:bg-white print:text-black print:p-0 print:border-none">
            {/* Resume Header */}
            <div className="text-center pb-4 border-b border-zinc-800 print:border-black/30">
              <h1 className="text-2xl font-bold tracking-tight text-white print:text-black">
                {personalInfo.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-zinc-400 print:text-zinc-700 mt-1 font-mono">
                <span>{personalInfo.email}</span>
                <span>•</span>
                <span>{personalInfo.phone}</span>
                <span>•</span>
                <span>{personalInfo.github}</span>
                <span>•</span>
                <span>{personalInfo.linkedin}</span>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="mt-4 pb-4 border-b border-zinc-800 print:border-black/30">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-violet-400 print:text-black">
                  Professional Summary
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[11px] h-6 text-zinc-400 hover:text-white print:hidden"
                  onClick={generateAiSummary}
                  disabled={loadingSummary}
                >
                  <Sparkles className="w-3 h-3 mr-1 text-violet-400" />
                  {loadingSummary ? 'Polishing…' : 'AI Rewrite'}
                </Button>
              </div>
              <p className="text-xs text-zinc-300 print:text-zinc-800 leading-relaxed">
                {personalInfo.summary}
              </p>
            </div>

            {/* Education */}
            <div className="mt-4 pb-4 border-b border-zinc-800 print:border-black/30">
              <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-violet-400 print:text-black mb-2">
                Education
              </h3>
              <div className="flex items-start justify-between text-xs">
                <div>
                  <strong className="text-white print:text-black block">{education.college}</strong>
                  <span className="text-zinc-400 print:text-zinc-700">{education.degree}</span>
                </div>
                <div className="text-right font-mono text-zinc-400 print:text-zinc-700">
                  <div>{education.duration}</div>
                  <div className="text-violet-300 print:text-black font-semibold">CGPA: {education.cgpa}</div>
                </div>
              </div>
            </div>

            {/* Technical Skills */}
            <div className="mt-4 pb-4 border-b border-zinc-800 print:border-black/30">
              <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-violet-400 print:text-black mb-1.5">
                Technical Skills
              </h3>
              <p className="text-xs text-zinc-300 print:text-zinc-800 leading-relaxed font-mono">
                {resumeSkills.join(' • ')}
              </p>
            </div>

            {/* Key Technical Projects */}
            <div className="mt-4">
              <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-violet-400 print:text-black mb-3">
                Key Technical Projects
              </h3>
              <div className="space-y-4">
                {projects.map((proj) => (
                  <div key={proj.id} className="text-xs">
                    <div className="flex items-baseline justify-between mb-1">
                      <strong className="text-white print:text-black font-semibold text-sm">
                        {proj.title}
                      </strong>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {proj.stack}
                      </span>
                    </div>
                    <ul className="text-zinc-300 print:text-zinc-800 space-y-1 list-disc list-inside leading-relaxed">
                      {proj.bullets.map((b, idx) => (
                        <li key={idx}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

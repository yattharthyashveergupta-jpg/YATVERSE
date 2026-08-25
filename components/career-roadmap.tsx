'use client'

import { useState } from 'react'
import { ArrowRight, Check, Loader2, Plus, RefreshCw, Sparkles, Target, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pill } from '@/components/ui/pill'
import { Progress } from '@/components/ui/progress'

export function Roadmap({
  profile,
  skills,
  subjects,
  academic,
  notify,
}: {
  profile: any
  skills: any[]
  subjects: any[]
  academic: any
  skillsHook?: any
  notify: (msg: string) => void
}) {
  const targetRole = profile?.role || profile?.career_goal || 'Software Engineer'
  const [loadingAi, setLoadingAi] = useState(false)
  const [aiPlan, setAiPlan] = useState<any>(null)

  const defaultItems = [
    {
      title: 'Core Programming & Computational Foundations',
      desc: 'Master memory, runtime fundamentals, and clean object-oriented code.',
      domain: 'Programming',
    },
    {
      title: 'Data Structures & Algorithmic Patterns',
      desc: 'Two Pointers, Sliding Window, Graph Traversals, and Dynamic Programming.',
      domain: 'DSA',
    },
    {
      title: 'Specialized Frameworks & Systems Design',
      desc: `Key production toolchains, APIs, and systems required for ${targetRole}.`,
      domain: 'Systems',
    },
    {
      title: 'Portfolio Projects & Applied Proof of Work',
      desc: 'Ship production-ready full stack/AI projects to demonstrate capability.',
      domain: 'Projects',
    },
    {
      title: 'Interview Readiness & Placement Sprints',
      desc: 'Mock interviews, pattern recognition sprints, and company applications.',
      domain: 'Placement',
    },
  ]

  const items = aiPlan?.milestones
    ? aiPlan.milestones.map((m: any) => ({
        title: m.title,
        desc: m.description,
        domain: m.domain,
        keyTopics: m.keyTopics,
      }))
    : defaultItems

  const roadmapScore = Math.min(95, Math.max(15, (skills?.length || 1) * 16))

  const generateAiRoadmap = async () => {
    setLoadingAi(true)
    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'roadmap',
          customGoal: targetRole,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to generate roadmap')
      }

      const data = await res.json()
      if (data.plan) {
        setAiPlan(data.plan)
        notify(`Generated personalized roadmap for ${targetRole} via Gemini!`)
      }
    } catch {
      notify('Could not generate AI roadmap. Using baseline roadmap.')
    } finally {
      setLoadingAi(false)
    }
  }

  const addMilestoneTask = async (title: string, desc?: string) => {
    const taskTitle = `Roadmap: ${title}`
    // Prevent duplicate tasks
    const existing = academic?.tasks?.some(
      (t: any) => t.title.toLowerCase().trim() === taskTitle.toLowerCase().trim()
    )
    if (existing) {
      notify(`"${taskTitle}" is already in your Study Planner!`)
      return
    }

    try {
      await academic.createTask({
        title: taskTitle,
        task_type: 'study',
        duration_minutes: 60,
        scheduled_date: new Date().toISOString().slice(0, 10),
        subject_id: subjects?.[0]?.id || null,
        description: desc || `Aligned with target career goal: ${targetRole}`,
      })
      notify(`Added "${title}" to your Study Planner!`)
    } catch {
      notify('Could not add milestone task.')
    }
  }

  return (
    <>
      <div className="roadmap-hero surface">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Pill tone="violet">{targetRole.toUpperCase()} · CAREER ROADMAP</Pill>
            {aiPlan && <Pill tone="emerald">AI PERSONALIZED</Pill>}
          </div>
          <h2>Your path has a shape.</h2>
          <p className="muted">
            A role-aware roadmap connecting your college syllabus directly to target job competencies.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Button
            size="sm"
            onClick={generateAiRoadmap}
            disabled={loadingAi}
            className="primary-btn bg-violet-600 hover:bg-violet-500 text-xs text-white"
          >
            {loadingAi ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Tailoring with Gemini…
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate AI Roadmap
              </>
            )}
          </Button>

          <div className="roadmap-score">
            <strong>{roadmapScore}%</strong>
            <span>roadmap complete</span>
            <Progress value={roadmapScore} />
          </div>
        </div>
      </div>

      <div className="roadmap-layout">
        <div className="surface roadmap-list">
          {items.map((item: any, i: number) => {
            const isComplete = i === 0 && skills?.length > 0
            const isActive = i === 1 || (i === 0 && skills?.length === 0)
            const state = isComplete ? 'complete' : isActive ? 'active' : 'next'
            const isAdded = academic?.tasks?.some(
              (t: any) => t.title.toLowerCase().trim() === `Roadmap: ${item.title}`.toLowerCase().trim()
            )

            return (
              <div className={`road-step step-${state}`} key={item.title}>
                <div className="step-line">
                  <div className="step-dot">{state === 'complete' ? <Check /> : i + 1}</div>
                  {i < items.length - 1 && <i />}
                </div>
                <div className="flex-1">
                  <div className="step-meta">
                    <span>
                      {state === 'complete'
                        ? 'COMPLETED'
                        : state === 'active'
                        ? 'IN PROGRESS'
                        : 'UP NEXT'}
                    </span>
                    {item.domain && <Pill tone="blue">{item.domain}</Pill>}
                  </div>
                  <h3>{item.title}</h3>
                  <p className="muted">{item.desc}</p>

                  {item.keyTopics && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {item.keyTopics.map((t: string) => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-zinc-300 font-mono">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {state === 'active' && (
                    <div className="step-progress mt-2">
                      <Progress value={65} color="blue" />
                      <span>65%</span>
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant={isAdded ? 'ghost' : 'outline'}
                      size="sm"
                      onClick={() => addMilestoneTask(item.title, item.desc)}
                      disabled={isAdded}
                      className="text-xs"
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> In Planner
                        </>
                      ) : (
                        <>
                          <Plus data-icon="inline-start" /> Add to Study Planner
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="surface gap-card">
          <span className="eyebrow accent">AI STRATEGY</span>
          <Sparkles />
          <h3>{aiPlan?.strategicAdvice ? 'Personalized Blueprint Insight' : 'Your syllabus is doing double duty.'}</h3>
          <p className="muted">
            {aiPlan?.strategicAdvice ||
              `Your enrolled coursework (${subjects?.map((s: any) => s.name).slice(0, 2).join(', ') || 'CS Fundamentals'}) aligns directly with ${targetRole} foundation requirements. One focused session, double the value.`}
          </p>
          <div className="mt-4 pt-3 border-t border-white/5">
            <strong className="block text-xs text-white mb-1">Target Role:</strong>
            <p className="text-xs text-zinc-400 font-mono">
              {targetRole} · {subjects?.length || 0} enrolled subjects synced
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export function Placement({
  careerHook,
  skills,
  profile,
  notify,
}: {
  careerHook: any
  skills: any[]
  profile: any
  notify?: (msg: string) => void
}) {
  const apps = careerHook?.applications || []
  const totalApps = apps.length
  const interviewing = apps.filter((a: any) => a.application_status === 'Interviewing').length
  const offered = apps.filter((a: any) => a.application_status === 'Offered').length
  const targetRole = profile?.role || profile?.career_goal || 'Software Engineer'

  const [loadingAiAnalysis, setLoadingAiAnalysis] = useState(false)
  const [aiCareerData, setAiCareerData] = useState<any>(null)

  const avgSkillMastery = skills?.length
    ? Math.round(skills.reduce((acc: number, s: any) => acc + s.progress, 0) / skills.length)
    : 60

  const readiness = [
    ['DSA & Problem Solving', Math.min(95, avgSkillMastery + 5), 'violet'],
    ['Projects & Portfolio', Math.min(90, avgSkillMastery - 5), 'blue'],
    ['Core CS Fundamentals', Math.min(92, avgSkillMastery), 'cyan'],
    ['Interview Practice', interviewing > 0 ? 80 : 55, 'amber'],
    ['Applications Sent', Math.min(100, totalApps * 20), 'emerald'],
  ]

  const readyPct = aiCareerData?.readinessScore
    ? aiCareerData.readinessScore
    : Math.round(readiness.reduce((acc, r) => acc + (r[1] as number), 0) / readiness.length)

  const runAiCareerAnalysis = async () => {
    setLoadingAiAnalysis(true)
    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'placement',
          customGoal: targetRole,
        }),
      })

      if (!res.ok) throw new Error('Analysis failed')
      const data = await res.json()
      if (data.plan) {
        setAiCareerData(data.plan)
        if (notify) notify('Generated deep AI Career Analysis with Gemini!')
      }
    } catch {
      if (notify) notify('Could not generate AI Career Analysis.')
    } finally {
      setLoadingAiAnalysis(false)
    }
  }

  return (
    <>
      <div className="placement-hero surface">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Pill tone="violet">PLACEMENT COMMAND CENTER</Pill>
            {aiCareerData && <Pill tone="emerald">AI ANALYZED</Pill>}
          </div>
          <h2>Ready when opportunity arrives.</h2>
          <p className="muted">
            {totalApps} companies tracked · {interviewing} active interview rounds · {offered} offers received.
          </p>
          <div className="mt-3">
            <Button
              size="sm"
              onClick={runAiCareerAnalysis}
              disabled={loadingAiAnalysis}
              className="primary-btn bg-violet-600 hover:bg-violet-500 text-xs text-white"
            >
              {loadingAiAnalysis ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Analyzing with Gemini…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI Career Analysis
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="readiness-ring">
          <strong>{readyPct}%</strong>
          <span>ready</span>
        </div>
      </div>

      {/* Deep AI Career Analysis Breakdown */}
      {aiCareerData && (
        <div className="surface panel my-4 border border-violet-500/20 bg-violet-950/20 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <strong className="text-xs font-mono text-violet-300">
                Gemini AI Career Analysis · Target: {targetRole}
              </strong>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-zinc-400 hover:text-white"
              onClick={() => setAiCareerData(null)}
            >
              <X className="w-3.5 h-3.5 mr-1" /> Close
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-black/40 border border-white/5">
              <strong className="block text-xs text-zinc-200 mb-2 font-mono uppercase">
                Priority Action Plan
              </strong>
              <div className="space-y-2">
                {aiCareerData.priorityFocusAreas?.map((area: any, idx: number) => (
                  <div key={idx} className="text-xs">
                    <div className="flex items-center justify-between text-violet-300 font-semibold">
                      <span>{area.area}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-950/60 border border-violet-500/20">
                        {area.importance}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-[11px] mt-0.5">{area.actionPlan}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-black/40 border border-white/5">
              <strong className="block text-xs text-zinc-200 mb-2 font-mono uppercase">
                Target Interview Questions
              </strong>
              <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                {aiCareerData.mockInterviewQuestions?.map((q: string, idx: number) => (
                  <li key={idx} className="text-[11px] leading-relaxed">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="readiness-grid">
        <div className="surface panel">
          <div className="card-head">
            <div>
              <span className="eyebrow">READINESS BREAKDOWN</span>
              <h3>Where to focus next</h3>
            </div>
            <Target />
          </div>
          {readiness.map(([label, val, tone]) => (
            <div className="readiness-row" key={label as string}>
              <div>
                <span>{label}</span>
                <strong>{val}%</strong>
              </div>
              <Progress value={val as number} color={tone as string} />
            </div>
          ))}
        </div>

        <div className="surface panel interview-card">
          <Pill tone="blue">TARGET PIPELINE</Pill>
          <h3>Active Opportunities</h3>
          {apps.slice(0, 4).map((app: any) => (
            <div className="milestone" key={app.id}>
              <Check />
              <span>
                {app.company_name} · {app.role}
              </span>
              <strong>{app.application_status}</strong>
            </div>
          ))}
          {apps.length === 0 && (
            <p className="muted text-xs my-4">
              No companies in tracker. Open Career workspace to log your target applications.
            </p>
          )}
        </div>
      </div>
    </>
  )
}

'use client'

import { ArrowRight, Check, Plus, Sparkles, Target } from 'lucide-react'
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
  const targetRole = profile?.role || 'AI/ML Engineer'
  const items = [
    {
      title: 'Core Programming & Computational Foundations',
      desc: 'Master Python, C++, or Java memory and runtime fundamentals.',
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

  const roadmapScore = Math.min(95, Math.max(15, (skills?.length || 1) * 16))

  const addMilestoneTask = async (title: string) => {
    try {
      await academic.createTask({
        title: `Roadmap: ${title}`,
        task_type: 'study',
        duration_minutes: 60,
        scheduled_date: new Date().toISOString().slice(0, 10),
        subject_id: subjects?.[0]?.id || null,
        description: `Aligned with target career goal: ${targetRole}`,
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
          <Pill tone="violet">{targetRole.toUpperCase()} · CAREER ROADMAP</Pill>
          <h2>Your path has a shape.</h2>
          <p className="muted">
            A role-aware roadmap connecting your college syllabus directly to target job competencies.
          </p>
        </div>
        <div className="roadmap-score">
          <strong>{roadmapScore}%</strong>
          <span>roadmap complete</span>
          <Progress value={roadmapScore} />
        </div>
      </div>

      <div className="roadmap-layout">
        <div className="surface roadmap-list">
          {items.map((item, i) => {
            const isComplete = i === 0 && skills?.length > 0
            const isActive = i === 1 || (i === 0 && skills?.length === 0)
            const state = isComplete ? 'complete' : isActive ? 'active' : 'next'
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
                    {state === 'active' && <Pill tone="blue">CURRENT SPRINT</Pill>}
                  </div>
                  <h3>{item.title}</h3>
                  <p className="muted">{item.desc}</p>
                  {state === 'active' && (
                    <div className="step-progress mt-2">
                      <Progress value={65} color="blue" />
                      <span>65%</span>
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => addMilestoneTask(item.title)}>
                      <Plus data-icon="inline-start" /> Add to Study Planner
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="surface gap-card">
          <span className="eyebrow accent">AI INSIGHT</span>
          <Sparkles />
          <h3>Your syllabus is doing double duty.</h3>
          <p className="muted">
            Your enrolled coursework ({subjects?.map((s: any) => s.name).slice(0, 2).join(', ') || 'CS Fundamentals'}) aligns directly with {targetRole} foundation requirements. One focused session, double the value.
          </p>
          <div className="mt-4 pt-3 border-t border-white/5">
            <strong className="block text-xs text-white mb-1">Recommended Next Step:</strong>
            <p className="text-xs text-zinc-400">
              Complete 3 practice problems in your current sprint to advance your readiness score.
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
}: {
  careerHook: any
  skills: any[]
  profile: any
}) {
  const apps = careerHook?.applications || []
  const totalApps = apps.length
  const interviewing = apps.filter((a: any) => a.application_status === 'Interviewing').length
  const offered = apps.filter((a: any) => a.application_status === 'Offered').length
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

  const readyPct = Math.round(
    readiness.reduce((acc, r) => acc + (r[1] as number), 0) / readiness.length
  )

  return (
    <>
      <div className="placement-hero surface">
        <div>
          <Pill tone="violet">PLACEMENT COMMAND CENTER</Pill>
          <h2>Ready when opportunity arrives.</h2>
          <p className="muted">
            {totalApps} companies tracked · {interviewing} active interview rounds · {offered} offers received.
          </p>
        </div>
        <div className="readiness-ring">
          <strong>{readyPct}%</strong>
          <span>ready</span>
        </div>
      </div>

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

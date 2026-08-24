'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BrainCircuit,
  Check,
  Filter,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'

export type Skill = {
  id: string
  user_id: string
  name: string
  category: string
  proficiency: string
  progress: number
  target_level: string
  level?: number | null
  created_at: string
  updated_at: string
}

export type SkillInput = {
  name: string
  category: string
  proficiency: string
  progress: number
  target_level: string
}

export const SKILL_CATEGORIES = ['Technical', 'Core CS', 'Framework / Tool', 'Soft Skill'] as const
export const PROFICIENCY_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Master'] as const

function proficiencyToLevel(proficiency?: string, progress?: number): number {
  if (typeof progress === 'number' && Number.isFinite(progress) && progress > 0) {
    return Math.min(100, Math.max(0, Math.round(progress)))
  }
  switch (proficiency) {
    case 'Master':
      return 100
    case 'Advanced':
      return 75
    case 'Intermediate':
      return 50
    case 'Beginner':
    default:
      return 25
  }
}

function levelToProficiency(level?: number | null, explicitProficiency?: string): { proficiency: string; progress: number } {
  if (explicitProficiency) {
    const prog = typeof level === 'number' && level > 0 ? (level <= 5 ? level * 20 : level) : 50
    return { proficiency: explicitProficiency, progress: prog }
  }
  if (typeof level !== 'number' || !Number.isFinite(level)) {
    return { proficiency: 'Intermediate', progress: 50 }
  }
  if (level <= 5) {
    if (level >= 5) return { proficiency: 'Master', progress: 100 }
    if (level === 4) return { proficiency: 'Advanced', progress: 80 }
    if (level === 3) return { proficiency: 'Intermediate', progress: 60 }
    if (level === 2) return { proficiency: 'Beginner', progress: 40 }
    return { proficiency: 'Beginner', progress: 20 }
  }
  if (level >= 90) return { proficiency: 'Master', progress: level }
  if (level >= 70) return { proficiency: 'Advanced', progress: level }
  if (level >= 40) return { proficiency: 'Intermediate', progress: level }
  return { proficiency: 'Beginner', progress: level }
}

function normalizeSkillRow(row: any): Skill {
  const { proficiency, progress } = levelToProficiency(row.level, row.proficiency)
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    category: row.category || 'Technical',
    proficiency: row.proficiency || proficiency,
    progress: typeof row.progress === 'number' ? row.progress : progress,
    target_level: row.target_level || 'Advanced',
    level: row.level,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  }
}

export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Skills load failed: user unavailable.', {
        message: userError?.message,
        name: userError?.name,
        status: userError?.status,
        code: userError?.code,
      })
      setError('We could not verify your session.')
      setLoading(false)
      return
    }

    const { data, error: skillsError } = await supabase
      .from('skills')
      .select('*')
      .eq('user_id', user.id)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (skillsError) {
      console.error('Skills load failed:', {
        message: skillsError.message,
        details: skillsError.details,
        hint: skillsError.hint,
        code: skillsError.code,
      })
      setError(skillsError.message || 'We could not load your skills.')
    } else {
      setSkills((data ?? []).map(normalizeSkillRow))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function authenticatedClient() {
    const supabase = createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error || !user) throw new Error('Session unavailable.')
    return { supabase, userId: user.id }
  }

  async function run<T>(work: () => Promise<T>): Promise<T> {
    if (lock.current) throw new Error('Please wait for the current action to finish.')
    lock.current = true
    setBusy(true)
    try {
      return await work()
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  const createSkill = (input: SkillInput) =>
    run(async () => {
      const { supabase, userId } = await authenticatedClient()
      const numericLevel = proficiencyToLevel(input.proficiency, input.progress)

      const payload: Record<string, any> = {
        name: input.name.trim(),
        category: input.category || 'Technical',
        proficiency: input.proficiency || 'Beginner',
        progress: input.progress ?? 0,
        target_level: input.target_level,
        level: numericLevel,
        user_id: userId,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('skills')
        .insert(payload)
        .select('*')
        .single()

      if (error || !data) {
        console.error('Create skill failed:', {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
        })
        throw error ?? new Error('Skill was not created.')
      }

      const created = normalizeSkillRow(data)
      if (input.target_level) {
        created.target_level = input.target_level
      }
      setSkills((current) => [...current, created])
      return created
    })

  const updateSkill = (id: string, input: Partial<SkillInput>) =>
    run(async () => {
      const { supabase, userId } = await authenticatedClient()
      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      }
      if (input.name !== undefined) payload.name = input.name.trim()
      if (input.category !== undefined) payload.category = input.category
      if (input.proficiency !== undefined) payload.proficiency = input.proficiency
      if (input.progress !== undefined) payload.progress = input.progress
      if (input.target_level !== undefined) payload.target_level = input.target_level
      if (input.progress !== undefined || input.proficiency !== undefined) {
        payload.level = proficiencyToLevel(input.proficiency, input.progress)
      }

      const { data, error } = await supabase
        .from('skills')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .maybeSingle()

      if (error || !data) {
        console.error('Update skill failed:', {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
        })
        throw error ?? new Error('Skill not found.')
      }

      const updated = normalizeSkillRow(data)
      if (input.target_level) {
        updated.target_level = input.target_level
      }
      setSkills((current) =>
        current.map((skill) => (skill.id === id ? updated : skill))
      )
      return updated
    })

  const deleteSkill = (id: string) =>
    run(async () => {
      const { supabase, userId } = await authenticatedClient()
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) {
        console.error('Delete skill failed:', {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
        })
        throw error
      }
      setSkills((current) => current.filter((skill) => skill.id !== id))
    })

  return {
    skills,
    loading,
    error,
    busy,
    load,
    createSkill,
    updateSkill,
    deleteSkill,
  }
}

export function SkillsWorkspace({
  skillsHook,
  notify,
}: {
  skillsHook: ReturnType<typeof useSkills>
  notify: (message: string) => void
}) {
  const { skills, loading, error, busy, createSkill, updateSkill, deleteSkill, load } = skillsHook
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [modalSkill, setModalSkill] = useState<Skill | 'new' | null>(null)

  const filteredSkills = useMemo(() => {
    return skills.filter((skill) => {
      const matchesCategory =
        categoryFilter === 'all' || skill.category === categoryFilter
      const matchesSearch =
        !searchQuery.trim() ||
        skill.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        skill.category.toLowerCase().includes(searchQuery.toLowerCase().trim())
      return matchesCategory && matchesSearch
    })
  }, [skills, categoryFilter, searchQuery])

  const averageProgress = useMemo(() => {
    if (!skills.length) return 0
    return Math.round(
      skills.reduce((acc, s) => acc + s.progress, 0) / skills.length
    )
  }, [skills])

  const masteredCount = useMemo(
    () => skills.filter((s) => s.proficiency === 'Master' || s.progress >= 90).length,
    [skills]
  )

  return (
    <div className="skills-workspace-container">
      {/* Header Banner */}
      <div className="surface panel mb-5">
        <div className="section-head mt-0 mb-0">
          <div>
            <span className="eyebrow accent">CAPABILITIES MATRIX</span>
            <h2>Skills & Mastery Orbit</h2>
            <p className="muted">
              Track programming languages, CS foundations, machine learning tools, and career competencies.
            </p>
          </div>
          <Button
            className="primary-btn"
            onClick={() => setModalSkill('new')}
            disabled={busy}
          >
            <Plus data-icon="inline-start" /> Add new skill
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="stats-grid mb-5">
        <div className="surface stat-card">
          <div className="icon-box icon-violet">
            <Zap />
          </div>
          <div>
            <p className="eyebrow">TOTAL SKILLS</p>
            <p className="stat-value">{skills.length}</p>
            <p className="muted text-xs">Tracked in your OS</p>
          </div>
        </div>

        <div className="surface stat-card">
          <div className="icon-box icon-blue">
            <Sparkles />
          </div>
          <div>
            <p className="eyebrow">AVG MASTERY</p>
            <p className="stat-value">{averageProgress}%</p>
            <p className="muted text-xs">Across all categories</p>
          </div>
        </div>

        <div className="surface stat-card">
          <div className="icon-box icon-amber">
            <Target />
          </div>
          <div>
            <p className="eyebrow">NEAR MASTERY</p>
            <p className="stat-value">{masteredCount}</p>
            <p className="muted text-xs">90%+ or Master tier</p>
          </div>
        </div>

        <div className="surface stat-card">
          <div className="icon-box icon-cyan">
            <BrainCircuit />
          </div>
          <div>
            <p className="eyebrow">CATEGORIES</p>
            <p className="stat-value">{new Set(skills.map((s) => s.category)).size}</p>
            <p className="muted text-xs">Distinct domains</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="surface panel mb-5">
        <div className="form-grid">
          <label>
            Search skills
            <input
              placeholder="Search by skill name or domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <label>
            Filter by category
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All categories</option>
              {SKILL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Skills Grid */}
      {loading ? (
        <div className="surface panel">
          <strong>Loading skills…</strong>
          <p className="muted">Retrieving your saved skill profile.</p>
        </div>
      ) : error ? (
        <div className="surface panel">
          <p className="feedback-error">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void load()} className="mt-2">
            Try again
          </Button>
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="surface empty-page">
          <Zap className="w-10 h-10 text-violet-400 mb-2" />
          <h3>{skills.length === 0 ? 'No skills tracked yet' : 'No matching skills found'}</h3>
          <p className="muted">
            {skills.length === 0
              ? 'Add your programming languages, frameworks, core concepts, and tools to track your growth.'
              : 'Try selecting another category filter or changing your search query.'}
          </p>
          {skills.length === 0 && (
            <Button className="primary-btn mt-2" onClick={() => setModalSkill('new')}>
              <Plus data-icon="inline-start" /> Add your first skill
            </Button>
          )}
        </div>
      ) : (
        <div className="subject-grid">
          {filteredSkills.map((skill) => (
            <div className="surface subject-card" key={skill.id}>
              <div className="subject-top">
                <span className="pill pill-violet">{skill.category}</span>
                <div className="flex gap-1">
                  <button
                    aria-label={`Edit ${skill.name}`}
                    onClick={() => setModalSkill(skill)}
                    disabled={busy}
                  >
                    <Pencil />
                  </button>
                  <button
                    aria-label={`Delete ${skill.name}`}
                    disabled={busy}
                    onClick={async () => {
                      if (!window.confirm(`Delete skill "${skill.name}"?`)) return
                      try {
                        await deleteSkill(skill.id)
                        notify('Skill removed.')
                      } catch {
                        notify('Could not delete skill.')
                      }
                    }}
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>

              <h3>{skill.name}</h3>

              <div className="flex justify-between items-center text-xs text-muted-foreground mb-3">
                <span>Tier: <strong className="text-foreground">{skill.proficiency}</strong></span>
                <span>Target: <strong className="text-violet-400">{skill.target_level}</strong></span>
              </div>

              <div className="subject-progress">
                <div>
                  <span>Mastery progress</span>
                  <strong>{skill.progress}%</strong>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full bg-violet-400 transition-all"
                    style={{ width: `${skill.progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Adjust</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs"
                    disabled={busy || skill.progress <= 0}
                    onClick={async () => {
                      const newProg = Math.max(0, skill.progress - 10)
                      await updateSkill(skill.id, { progress: newProg })
                      notify(`${skill.name} progress updated.`)
                    }}
                  >
                    -10%
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs text-violet-400"
                    disabled={busy || skill.progress >= 100}
                    onClick={async () => {
                      const newProg = Math.min(100, skill.progress + 10)
                      await updateSkill(skill.id, { progress: newProg })
                      notify(`${skill.name} progress updated.`)
                    }}
                  >
                    +10%
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Add / Edit Skill */}
      {modalSkill && (
        <SkillModal
          skill={modalSkill === 'new' ? undefined : modalSkill}
          busy={busy}
          onClose={() => setModalSkill(null)}
          onSave={async (input) => {
            if (modalSkill === 'new') {
              await createSkill(input)
              notify('Skill added.')
            } else {
              await updateSkill(modalSkill.id, input)
              notify('Skill updated.')
            }
            setModalSkill(null)
          }}
        />
      )}
    </div>
  )
}

function SkillModal({
  skill,
  busy,
  onClose,
  onSave,
}: {
  skill?: Skill
  busy: boolean
  onClose: () => void
  onSave: (input: SkillInput) => Promise<void>
}) {
  const [name, setName] = useState(skill?.name || '')
  const [category, setCategory] = useState(skill?.category || 'Technical')
  const [proficiency, setProficiency] = useState(skill?.proficiency || 'Beginner')
  const [progress, setProgress] = useState(skill?.progress != null ? String(skill.progress) : '20')
  const [targetLevel, setTargetLevel] = useState(skill?.target_level || 'Advanced')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving || busy) return
    if (!name.trim()) {
      setError('Please enter a skill name.')
      return
    }

    const progNum = Number(progress)
    if (!Number.isInteger(progNum) || progNum < 0 || progNum > 100) {
      setError('Progress must be an integer between 0 and 100.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        name: name.trim(),
        category,
        proficiency,
        progress: progNum,
        target_level: targetLevel,
      })
    } catch (err) {
      console.error('Failed to save skill:', err)
      setError('We could not save this skill. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal surface">
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X />
        </button>
        <div className="eyebrow accent">{skill ? 'EDIT SKILL' : 'ADD SKILL'}</div>
        <h2>{skill ? `Update ${skill.name}` : 'Track a new skill'}</h2>
        <p className="muted">
          Add technical tools, frameworks, and core skills to shape your learning trajectory.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="field-wide">
              Skill Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Next.js, Python, PostgreSQL, System Design"
                required
              />
            </label>

            <label>
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {SKILL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Current Proficiency
              <select value={proficiency} onChange={(e) => setProficiency(e.target.value)}>
                {PROFICIENCY_LEVELS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Progress ({progress}%)
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                className="progress-range"
              />
            </label>

            <label>
              Target Level
              <select value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)}>
                {PROFICIENCY_LEVELS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && <p className="feedback-error mt-3">{error}</p>}

          <div className="modal-footer">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="primary-btn" disabled={saving || busy}>
              {saving ? 'Saving...' : skill ? 'Save changes' : 'Add skill'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

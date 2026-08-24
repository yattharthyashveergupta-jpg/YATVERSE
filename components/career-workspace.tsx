'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  Filter,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'

export type CareerApplication = {
  id: string
  user_id: string
  company_name: string
  role: string
  application_status: string
  application_date: string | null
  deadline: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ApplicationInput = {
  company_name: string
  role: string
  application_status: string
  application_date?: string | null
  deadline?: string | null
  notes?: string | null
}

export const APPLICATION_STATUSES = [
  'Wishlist',
  'Applied',
  'Interviewing',
  'Offered',
  'Rejected',
] as const

const careerColumns = 'id, user_id, company_name, role, application_status, application_date, deadline, notes, created_at, updated_at'

export function useCareerApplications() {
  const [applications, setApplications] = useState<CareerApplication[]>([])
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
      console.error('Career applications load failed: user unavailable.', userError)
      setError('We could not verify your session.')
      setLoading(false)
      return
    }

    const { data, error: careerError } = await supabase
      .from('career_applications')
      .select(careerColumns)
      .eq('user_id', user.id)
      .order('deadline', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (careerError) {
      console.error('Career load failed:', careerError)
      setError('We could not load your career applications.')
    } else {
      setApplications((data ?? []) as CareerApplication[])
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

  const createApplication = (input: ApplicationInput) =>
    run(async () => {
      const { supabase, userId } = await authenticatedClient()
      const { data, error } = await supabase
        .from('career_applications')
        .insert({
          ...input,
          user_id: userId,
          application_date: input.application_date || null,
          deadline: input.deadline || null,
          notes: input.notes?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .select(careerColumns)
        .single()

      if (error || !data) throw error ?? new Error('Application could not be created.')
      setApplications((current) => [data as CareerApplication, ...current])
      return data as CareerApplication
    })

  const updateApplication = (id: string, input: Partial<ApplicationInput>) =>
    run(async () => {
      const { supabase, userId } = await authenticatedClient()
      const { data, error } = await supabase
        .from('career_applications')
        .update({
          ...input,
          application_date: input.application_date !== undefined ? (input.application_date || null) : undefined,
          deadline: input.deadline !== undefined ? (input.deadline || null) : undefined,
          notes: input.notes !== undefined ? (input.notes?.trim() || null) : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select(careerColumns)
        .maybeSingle()

      if (error || !data) throw error ?? new Error('Application could not be updated.')
      setApplications((current) =>
        current.map((app) => (app.id === id ? (data as CareerApplication) : app))
      )
      return data as CareerApplication
    })

  const deleteApplication = (id: string) =>
    run(async () => {
      const { supabase, userId } = await authenticatedClient()
      const { error } = await supabase
        .from('career_applications')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw error
      setApplications((current) => current.filter((app) => app.id !== id))
    })

  return {
    applications,
    loading,
    error,
    busy,
    load,
    createApplication,
    updateApplication,
    deleteApplication,
  }
}

export function CareerWorkspace({
  careerHook,
  desiredRole,
  notify,
}: {
  careerHook: ReturnType<typeof useCareerApplications>
  desiredRole?: string
  notify: (message: string) => void
}) {
  const {
    applications,
    loading,
    error,
    busy,
    createApplication,
    updateApplication,
    deleteApplication,
    load,
  } = careerHook

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [modalApp, setModalApp] = useState<CareerApplication | 'new' | null>(null)

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchesStatus =
        statusFilter === 'all' || app.application_status === statusFilter
      const term = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !term ||
        app.company_name.toLowerCase().includes(term) ||
        app.role.toLowerCase().includes(term) ||
        (app.notes ?? '').toLowerCase().includes(term)
      return matchesStatus && matchesSearch
    })
  }, [applications, statusFilter, searchQuery])

  const stats = useMemo(() => {
    const total = applications.length
    const wishlist = applications.filter((a) => a.application_status === 'Wishlist').length
    const applied = applications.filter((a) => a.application_status === 'Applied').length
    const interviewing = applications.filter((a) => a.application_status === 'Interviewing').length
    const offered = applications.filter((a) => a.application_status === 'Offered').length
    return { total, wishlist, applied, interviewing, offered }
  }, [applications])

  const getStatusTone = (status: string) => {
    switch (status) {
      case 'Offered':
        return 'pill-cyan'
      case 'Interviewing':
        return 'pill-violet'
      case 'Applied':
        return 'pill-blue'
      case 'Wishlist':
        return 'pill-amber'
      default:
        return 'pill-violet'
    }
  }

  return (
    <div className="career-workspace-container">
      {/* Header Banner */}
      <div className="surface panel mb-5">
        <div className="section-head mt-0 mb-0">
          <div>
            <span className="eyebrow accent">CAREER & PLACEMENT PIPELINE</span>
            <h2>Company Tracker & Opportunities</h2>
            <p className="muted">
              {desiredRole ? `Targeting ${desiredRole}. ` : ''}
              Track company applications, interview rounds, offer deadlines, and technical notes.
            </p>
          </div>
          <Button
            className="primary-btn"
            onClick={() => setModalApp('new')}
            disabled={busy}
          >
            <Plus data-icon="inline-start" /> Add application
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="stats-grid mb-5">
        <div className="surface stat-card">
          <div className="icon-box icon-violet">
            <Building2 />
          </div>
          <div>
            <p className="eyebrow">TOTAL TRACKED</p>
            <p className="stat-value">{stats.total}</p>
            <p className="muted text-xs">Companies in pipeline</p>
          </div>
        </div>

        <div className="surface stat-card">
          <div className="icon-box icon-blue">
            <BriefcaseBusiness />
          </div>
          <div>
            <p className="eyebrow">APPLIED</p>
            <p className="stat-value">{stats.applied}</p>
            <p className="muted text-xs">Submitted applications</p>
          </div>
        </div>

        <div className="surface stat-card">
          <div className="icon-box icon-amber">
            <Zap />
          </div>
          <div>
            <p className="eyebrow">INTERVIEWING</p>
            <p className="stat-value">{stats.interviewing}</p>
            <p className="muted text-xs">Active interview rounds</p>
          </div>
        </div>

        <div className="surface stat-card">
          <div className="icon-box icon-cyan">
            <Trophy />
          </div>
          <div>
            <p className="eyebrow">OFFERS</p>
            <p className="stat-value">{stats.offered}</p>
            <p className="muted text-xs">Offers received</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="surface panel mb-5">
        <div className="form-grid">
          <label>
            Search companies & roles
            <input
              placeholder="e.g. Google, Frontend Engineer, AI Intern..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <label>
            Filter by stage
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All stages ({applications.length})</option>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s} ({applications.filter((a) => a.application_status === s).length})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="surface panel">
          <strong>Loading career pipeline…</strong>
          <p className="muted">Retrieving your company applications.</p>
        </div>
      ) : error ? (
        <div className="surface panel">
          <p className="feedback-error">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void load()} className="mt-2">
            Try again
          </Button>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="surface empty-page">
          <Building2 className="w-10 h-10 text-violet-400 mb-2" />
          <h3>
            {applications.length === 0
              ? 'No company applications added yet'
              : 'No applications match your filter'}
          </h3>
          <p className="muted">
            {applications.length === 0
              ? 'Add target dream companies, active job applications, or internship listings to track deadlines and interview stages.'
              : 'Try clearing your search query or selecting "All stages".'}
          </p>
          {applications.length === 0 && (
            <Button className="primary-btn mt-2" onClick={() => setModalApp('new')}>
              <Plus data-icon="inline-start" /> Add your first company
            </Button>
          )}
        </div>
      ) : (
        <div className="subject-grid">
          {filteredApps.map((app) => (
            <div className="surface subject-card" key={app.id}>
              <div className="subject-top">
                <span className={`pill ${getStatusTone(app.application_status)}`}>
                  {app.application_status.toUpperCase()}
                </span>
                <div className="flex gap-1">
                  <button
                    aria-label={`Edit ${app.company_name}`}
                    onClick={() => setModalApp(app)}
                    disabled={busy}
                  >
                    <Pencil />
                  </button>
                  <button
                    aria-label={`Delete ${app.company_name}`}
                    disabled={busy}
                    onClick={async () => {
                      if (!window.confirm(`Delete application for ${app.company_name}?`)) return
                      try {
                        await deleteApplication(app.id)
                        notify('Application removed.')
                      } catch {
                        notify('Could not delete application.')
                      }
                    }}
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>

              <span className="eyebrow accent">{app.role}</span>
              <h3 className="mt-1 mb-2 text-lg font-bold">{app.company_name}</h3>

              <div className="text-xs text-muted-foreground space-y-1 mb-3">
                {app.deadline && (
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Deadline: {app.deadline}</span>
                  </div>
                )}
                {app.application_date && (
                  <div>Applied: {app.application_date}</div>
                )}
                {app.notes && (
                  <p className="line-clamp-2 text-[11px] text-zinc-400 mt-2 bg-white/[0.03] p-2 rounded-lg">
                    {app.notes}
                  </p>
                )}
              </div>

              {/* Quick Status Advance */}
              <div className="mt-auto pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Move to:</span>
                <select
                  value={app.application_status}
                  onChange={async (e) => {
                    const newStatus = e.target.value
                    await updateApplication(app.id, { application_status: newStatus })
                    notify(`Moved ${app.company_name} to ${newStatus}.`)
                  }}
                  className="bg-[#0f0f14] border border-white/[0.09] text-[11px] text-foreground rounded px-1.5 py-0.5 outline-none"
                >
                  {APPLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalApp && (
        <ApplicationModal
          app={modalApp === 'new' ? undefined : modalApp}
          busy={busy}
          onClose={() => setModalApp(null)}
          onSave={async (input) => {
            if (modalApp === 'new') {
              await createApplication(input)
              notify('Application tracked.')
            } else {
              await updateApplication(modalApp.id, input)
              notify('Application updated.')
            }
            setModalApp(null)
          }}
        />
      )}
    </div>
  )
}

function ApplicationModal({
  app,
  busy,
  onClose,
  onSave,
}: {
  app?: CareerApplication
  busy: boolean
  onClose: () => void
  onSave: (input: ApplicationInput) => Promise<void>
}) {
  const [companyName, setCompanyName] = useState(app?.company_name || '')
  const [role, setRole] = useState(app?.role || '')
  const [status, setStatus] = useState(app?.application_status || 'Wishlist')
  const [appDate, setAppDate] = useState(app?.application_date || '')
  const [deadline, setDeadline] = useState(app?.deadline || '')
  const [notes, setNotes] = useState(app?.notes || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving || busy) return
    if (!companyName.trim()) {
      setError('Please enter a company name.')
      return
    }
    if (!role.trim()) {
      setError('Please enter a role or position.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        company_name: companyName.trim(),
        role: role.trim(),
        application_status: status,
        application_date: appDate || null,
        deadline: deadline || null,
        notes: notes.trim() || null,
      })
    } catch (err) {
      console.error('Failed to save application:', err)
      setError('We could not save this application. Please try again.')
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
        <div className="eyebrow accent">{app ? 'EDIT APPLICATION' : 'ADD APPLICATION'}</div>
        <h2>{app ? `Update ${app.company_name}` : 'Track New Opportunity'}</h2>
        <p className="muted">
          Add target companies, track application stages, and record upcoming interview checkpoints.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Company Name
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Google, Microsoft, Atlassian, Razorpay"
                required
              />
            </label>

            <label>
              Target Role
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. SDE Intern, AI Engineer, Full Stack Dev"
                required
              />
            </label>

            <label>
              Pipeline Stage
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Application Date
              <input
                type="date"
                value={appDate}
                onChange={(e) => setAppDate(e.target.value)}
              />
            </label>

            <label className="field-wide">
              Deadline / Next Interview Date
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </label>

            <label className="field-wide">
              Notes & Referral Details (Optional)
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Referred by Senior, DSA round scheduled on Zoom, System design round prep"
              />
            </label>
          </div>

          {error && <p className="feedback-error mt-3">{error}</p>}

          <div className="modal-footer">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="primary-btn" disabled={saving || busy}>
              {saving ? 'Saving...' : app ? 'Save changes' : 'Add to pipeline'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

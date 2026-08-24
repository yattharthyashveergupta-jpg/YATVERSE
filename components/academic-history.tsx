'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  Check,
  ChevronRight,
  GraduationCap,
  Pencil,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'

export type AcademicRecord = {
  id: string
  user_id: string
  semester: number
  sgpa: number
  cgpa: number
  credits: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type AcademicRecordInput = {
  semester: number
  sgpa: number
  cgpa: number
  credits: number
  notes?: string | null
}

const academicHistoryColumns = 'id, user_id, semester, sgpa, cgpa, credits, notes, created_at, updated_at'

export function useAcademicHistory() {
  const [records, setRecords] = useState<AcademicRecord[]>([])
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
      console.error('Academic history load failed: user unavailable.', userError)
      setError('We could not verify your session.')
      setLoading(false)
      return
    }

    const { data, error: historyError } = await supabase
      .from('academic_history')
      .select(academicHistoryColumns)
      .eq('user_id', user.id)
      .order('semester', { ascending: true })

    if (historyError) {
      console.error('Academic history load failed:', historyError)
      setError('We could not load your academic history.')
    } else {
      setRecords((data ?? []) as AcademicRecord[])
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

  const addRecord = (input: AcademicRecordInput) =>
    run(async () => {
      const { supabase, userId } = await authenticatedClient()
      const { data, error } = await supabase
        .from('academic_history')
        .insert({
          ...input,
          user_id: userId,
          notes: input.notes?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .select(academicHistoryColumns)
        .single()

      if (error || !data) throw error ?? new Error('Could not add semester record.')
      setRecords((current) =>
        [...current, data as AcademicRecord].sort((a, b) => a.semester - b.semester)
      )
      return data as AcademicRecord
    })

  const updateRecord = (id: string, input: Partial<AcademicRecordInput>) =>
    run(async () => {
      const { supabase, userId } = await authenticatedClient()
      const { data, error } = await supabase
        .from('academic_history')
        .update({
          ...input,
          notes: input.notes !== undefined ? (input.notes?.trim() || null) : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select(academicHistoryColumns)
        .maybeSingle()

      if (error || !data) throw error ?? new Error('Could not update semester record.')
      setRecords((current) =>
        current
          .map((r) => (r.id === id ? (data as AcademicRecord) : r))
          .sort((a, b) => a.semester - b.semester)
      )
      return data as AcademicRecord
    })

  const deleteRecord = (id: string) =>
    run(async () => {
      const { supabase, userId } = await authenticatedClient()
      const { error } = await supabase
        .from('academic_history')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw error
      setRecords((current) => current.filter((r) => r.id !== id))
    })

  return {
    records,
    loading,
    error,
    busy,
    load,
    addRecord,
    updateRecord,
    deleteRecord,
  }
}

export function AcademicHistoryWorkspace({
  historyHook,
  profileCgpa,
  notify,
}: {
  historyHook: ReturnType<typeof useAcademicHistory>
  profileCgpa?: string
  notify: (message: string) => void
}) {
  const { records, loading, error, busy, addRecord, updateRecord, deleteRecord, load } = historyHook
  const [modalRecord, setModalRecord] = useState<AcademicRecord | 'new' | null>(null)

  const stats = useMemo(() => {
    if (!records.length) {
      const current = Number.parseFloat(profileCgpa || '0')
      return {
        avgSgpa: current || 0,
        maxSgpa: current || 0,
        totalCredits: 0,
        latestCgpa: current || 0,
      }
    }
    const avgSgpa = records.reduce((acc, r) => acc + Number(r.sgpa), 0) / records.length
    const maxSgpa = Math.max(...records.map((r) => Number(r.sgpa)))
    const totalCredits = records.reduce((acc, r) => acc + Number(r.credits), 0)
    const latest = records[records.length - 1]
    return {
      avgSgpa: Number(avgSgpa.toFixed(2)),
      maxSgpa: Number(maxSgpa.toFixed(2)),
      totalCredits,
      latestCgpa: Number(latest.cgpa),
    }
  }, [records, profileCgpa])

  return (
    <div className="academic-history-container">
      {/* Header Banner */}
      <div className="surface panel mb-5">
        <div className="section-head mt-0 mb-0">
          <div>
            <span className="eyebrow accent">ACADEMIC TRAJECTORY</span>
            <h2>Semester History & CGPA Tracking</h2>
            <p className="muted">
              Record term SGPA, cumulative CGPA, and earned credits to analyze your long-term academic trend.
            </p>
          </div>
          <Button
            className="primary-btn"
            onClick={() => setModalRecord('new')}
            disabled={busy}
          >
            <Plus data-icon="inline-start" /> Add semester record
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="stats-grid mb-5">
        <div className="surface stat-card">
          <div className="icon-box icon-violet">
            <GraduationCap />
          </div>
          <div>
            <p className="eyebrow">LATEST CGPA</p>
            <p className="stat-value">{stats.latestCgpa > 0 ? stats.latestCgpa.toFixed(2) : '—'}</p>
            <p className="muted text-xs">Cumulative performance</p>
          </div>
        </div>

        <div className="surface stat-card">
          <div className="icon-box icon-cyan">
            <TrendingUp />
          </div>
          <div>
            <p className="eyebrow">AVERAGE SGPA</p>
            <p className="stat-value">{stats.avgSgpa > 0 ? stats.avgSgpa.toFixed(2) : '—'}</p>
            <p className="muted text-xs">Across {records.length} term{records.length === 1 ? '' : 's'}</p>
          </div>
        </div>

        <div className="surface stat-card">
          <div className="icon-box icon-amber">
            <Trophy />
          </div>
          <div>
            <p className="eyebrow">PEAK SGPA</p>
            <p className="stat-value">{stats.maxSgpa > 0 ? stats.maxSgpa.toFixed(2) : '—'}</p>
            <p className="muted text-xs">Best semester grade</p>
          </div>
        </div>

        <div className="surface stat-card">
          <div className="icon-box icon-blue">
            <Target />
          </div>
          <div>
            <p className="eyebrow">TOTAL CREDITS</p>
            <p className="stat-value">{stats.totalCredits}</p>
            <p className="muted text-xs">Credits earned to date</p>
          </div>
        </div>
      </div>

      {/* Trend Visualizer */}
      <div className="surface panel mb-5">
        <div className="card-head">
          <div>
            <span className="eyebrow">GRADE TREND</span>
            <h3>SGPA vs Cumulative CGPA by Semester</h3>
          </div>
          <BarChart3 />
        </div>

        {records.length === 0 ? (
          <div className="empty-state py-8">
            <BarChart3 className="w-8 h-8 text-violet-400 mb-2" />
            <strong>No semester records added yet.</strong>
            <span>Add your past semester SGPA and CGPA to visualize your grade progression curve.</span>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setModalRecord('new')}
            >
              <Plus data-icon="inline-start" /> Add first semester
            </Button>
          </div>
        ) : (
          <div className="chart mt-6">
            <div className="chart-y">
              <span>10.0</span>
              <span>8.0</span>
              <span>6.0</span>
              <span>4.0</span>
            </div>
            <div className="bars">
              {records.map((r) => {
                const heightPct = Math.max(10, Math.min(100, (Number(r.sgpa) / 10) * 100))
                return (
                  <div className="bar-col" key={r.id}>
                    <span className="text-[10px] text-violet-300 font-semibold mb-1">
                      {Number(r.sgpa).toFixed(2)}
                    </span>
                    <div
                      className="bar"
                      style={{ height: `${heightPct}%` }}
                      title={`Sem ${r.semester} SGPA: ${r.sgpa} | CGPA: ${r.cgpa}`}
                    />
                    <small>Sem {r.semester}</small>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Semester Records Table */}
      <div className="surface panel">
        <div className="card-head mb-4">
          <div>
            <span className="eyebrow">RECORDS</span>
            <h3>Semester breakdown</h3>
          </div>
        </div>

        {loading ? (
          <p className="muted">Loading academic records…</p>
        ) : error ? (
          <div className="feedback-error">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={() => void load()} className="mt-2">
              Try again
            </Button>
          </div>
        ) : records.length === 0 ? (
          <p className="muted text-sm">No historical records saved.</p>
        ) : (
          <div className="settings-list">
            {records.map((record) => (
              <div className="settings-row" key={record.id}>
                <div>
                  <strong>
                    Semester {record.semester} · SGPA {Number(record.sgpa).toFixed(2)} · CGPA{' '}
                    {Number(record.cgpa).toFixed(2)}
                  </strong>
                  <small>
                    {record.credits} Credits {record.notes ? ` · ${record.notes}` : ''}
                  </small>
                </div>
                <div className="row-actions">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    onClick={() => setModalRecord(record)}
                    aria-label={`Edit semester ${record.semester}`}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    onClick={async () => {
                      if (!window.confirm(`Delete record for Semester ${record.semester}?`)) return
                      try {
                        await deleteRecord(record.id)
                        notify(`Semester ${record.semester} record deleted.`)
                      } catch {
                        notify('Could not delete record.')
                      }
                    }}
                    aria-label={`Delete semester ${record.semester}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalRecord && (
        <AcademicRecordModal
          record={modalRecord === 'new' ? undefined : modalRecord}
          existingSemesters={records.map((r) => r.semester)}
          busy={busy}
          onClose={() => setModalRecord(null)}
          onSave={async (input) => {
            if (modalRecord === 'new') {
              await addRecord(input)
              notify(`Semester ${input.semester} record added.`)
            } else {
              await updateRecord(modalRecord.id, input)
              notify(`Semester ${input.semester} record updated.`)
            }
            setModalRecord(null)
          }}
        />
      )}
    </div>
  )
}

function AcademicRecordModal({
  record,
  existingSemesters,
  busy,
  onClose,
  onSave,
}: {
  record?: AcademicRecord
  existingSemesters: number[]
  busy: boolean
  onClose: () => void
  onSave: (input: AcademicRecordInput) => Promise<void>
}) {
  const [semester, setSemester] = useState(
    record ? String(record.semester) : String(existingSemesters.length + 1)
  )
  const [sgpa, setSgpa] = useState(record ? String(record.sgpa) : '')
  const [cgpa, setCgpa] = useState(record ? String(record.cgpa) : '')
  const [credits, setCredits] = useState(record ? String(record.credits) : '20')
  const [notes, setNotes] = useState(record?.notes || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving || busy) return

    const semNum = Number(semester)
    const sgpaNum = Number(sgpa)
    const cgpaNum = Number(cgpa)
    const creditsNum = Number(credits)

    if (!Number.isInteger(semNum) || semNum < 1 || semNum > 12) {
      setError('Please select a valid semester (1–12).')
      return
    }

    if (!Number.isFinite(sgpaNum) || sgpaNum < 0 || sgpaNum > 10) {
      setError('SGPA must be between 0.00 and 10.00.')
      return
    }

    if (!Number.isFinite(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
      setError('CGPA must be between 0.00 and 10.00.')
      return
    }

    if (!Number.isInteger(creditsNum) || creditsNum < 1 || creditsNum > 40) {
      setError('Credits must be an integer between 1 and 40.')
      return
    }

    // Check duplicate semester on create
    if (!record && existingSemesters.includes(semNum)) {
      setError(`Semester ${semNum} record already exists. Edit the existing record instead.`)
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        semester: semNum,
        sgpa: Number(sgpaNum.toFixed(2)),
        cgpa: Number(cgpaNum.toFixed(2)),
        credits: creditsNum,
        notes: notes.trim() || null,
      })
    } catch (err) {
      console.error('Failed to save academic record:', err)
      setError('We could not save this academic record. Please try again.')
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
        <div className="eyebrow accent">{record ? 'EDIT RECORD' : 'ADD RECORD'}</div>
        <h2>{record ? `Semester ${record.semester} Record` : 'Add Semester Grade Record'}</h2>
        <p className="muted">
          Record your official SGPA and cumulative CGPA to maintain an accurate academic ledger.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Semester
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                disabled={Boolean(record)}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    Semester {i + 1}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Credits this term
              <input
                type="number"
                min="1"
                max="40"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                required
              />
            </label>

            <label>
              Semester SGPA
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                placeholder="e.g. 8.75"
                value={sgpa}
                onChange={(e) => setSgpa(e.target.value)}
                required
              />
            </label>

            <label>
              Cumulative CGPA
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                placeholder="e.g. 8.82"
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
                required
              />
            </label>

            <label className="field-wide">
              Notes (Optional)
              <input
                placeholder="e.g. Dean's List, 2 backlog cleared, Minor in AI completed"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>

          {error && <p className="feedback-error mt-3">{error}</p>}

          <div className="modal-footer">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="primary-btn" disabled={saving || busy}>
              {saving ? 'Saving...' : record ? 'Save record' : 'Add record'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

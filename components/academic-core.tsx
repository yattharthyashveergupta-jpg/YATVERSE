'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'

export type Subject = { id: string; user_id: string; name: string; code: string | null; credits: number; teacher: string | null; progress: number; status: string | null }
export type AcademicTask = { id: string; user_id: string; subject_id: string | null; title: string; description: string | null; task_type: string | null; duration_minutes: number | null; scheduled_date: string | null; completed: boolean }
type SubjectInput = Omit<Subject, 'id' | 'user_id'>
type TaskInput = Omit<AcademicTask, 'id' | 'user_id' | 'completed'>

const subjectColumns = 'id, user_id, name, code, credits, teacher, progress, status'
const taskColumns = 'id, user_id, subject_id, title, description, task_type, duration_minutes, scheduled_date, completed'
const colors = ['violet', 'blue', 'amber', 'cyan'] as const
const sortSubjects = (items: Subject[]) => [...items].sort((a, b) => a.name.localeCompare(b.name))
const sortTasks = (items: AcademicTask[]) => [...items].sort((a, b) => Number(a.completed) - Number(b.completed) || (a.scheduled_date ?? '9999-12-31').localeCompare(b.scheduled_date ?? '9999-12-31'))

export function useAcademicCore() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [tasks, setTasks] = useState<AcademicTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Academic load failed: user unavailable.', userError)
      setError('We could not verify your session. Please refresh and try again.'); setLoading(false); return
    }
    const [subjectsResult, tasksResult] = await Promise.all([
      supabase.from('subjects').select(subjectColumns).eq('user_id', user.id).order('name'),
      supabase.from('tasks').select(taskColumns).eq('user_id', user.id).order('completed').order('scheduled_date', { ascending: true, nullsFirst: false }),
    ])
    if (subjectsResult.error || tasksResult.error) {
      console.error('Academic load failed:', subjectsResult.error ?? tasksResult.error)
      setError('We could not load your subjects and tasks. Please refresh and try again.')
    } else {
      setSubjects(sortSubjects((subjectsResult.data ?? []) as Subject[]))
      setTasks(sortTasks((tasksResult.data ?? []) as AcademicTask[]))
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function authenticatedClient() {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) { console.error('Academic operation failed: user unavailable.', error); throw new Error('Session unavailable.') }
    return { supabase, userId: user.id }
  }
  async function run<T>(work: () => Promise<T>) {
    if (lock.current) throw new Error('Please wait for the current action to finish.')
    lock.current = true; setBusy(true)
    try { return await work() } finally { lock.current = false; setBusy(false) }
  }
  const createSubject = (input: SubjectInput) => run(async () => {
    const { supabase, userId } = await authenticatedClient()
    const { data, error } = await supabase.from('subjects').insert({ ...input, user_id: userId }).select(subjectColumns).single()
    if (error || !data) throw error ?? new Error('Subject was not created.')
    setSubjects((current) => sortSubjects([...current, data as Subject])); return data as Subject
  })
  const updateSubject = (id: string, input: SubjectInput) => run(async () => {
    const { supabase, userId } = await authenticatedClient()
    const { data, error } = await supabase.from('subjects').update(input).eq('id', id).eq('user_id', userId).select(subjectColumns).maybeSingle()
    if (error || !data) throw error ?? new Error('Subject not found.')
    setSubjects((current) => sortSubjects(current.map((subject) => subject.id === id ? data as Subject : subject))); return data as Subject
  })
  const deleteSubject = (id: string) => run(async () => {
    const { supabase, userId } = await authenticatedClient()
    const { error } = await supabase.from('subjects').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
    setSubjects((current) => current.filter((subject) => subject.id !== id))
    await load()
  })
  const createTask = (input: TaskInput) => run(async () => {
    const { supabase, userId } = await authenticatedClient()
    const { data, error } = await supabase.from('tasks').insert({ ...input, user_id: userId, subject_id: input.subject_id || null, description: input.description || null, task_type: input.task_type || null, scheduled_date: input.scheduled_date || null, completed: false }).select(taskColumns).single()
    if (error || !data) throw error ?? new Error('Task was not created.')
    setTasks((current) => sortTasks([...current, data as AcademicTask])); return data as AcademicTask
  })
  const updateTask = (id: string, input: TaskInput) => run(async () => {
    const { supabase, userId } = await authenticatedClient()
    const { data, error } = await supabase.from('tasks').update({ ...input, subject_id: input.subject_id || null, description: input.description || null, task_type: input.task_type || null, scheduled_date: input.scheduled_date || null }).eq('id', id).eq('user_id', userId).select(taskColumns).maybeSingle()
    if (error || !data) throw error ?? new Error('Task not found.')
    setTasks((current) => sortTasks(current.map((task) => task.id === id ? data as AcademicTask : task))); return data as AcademicTask
  })
  const toggleTask = (task: AcademicTask) => run(async () => {
    const { supabase, userId } = await authenticatedClient()
    const { data, error } = await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id).eq('user_id', userId).select(taskColumns).maybeSingle()
    if (error || !data) throw error ?? new Error('Task not found.')
    setTasks((current) => sortTasks(current.map((item) => item.id === task.id ? data as AcademicTask : item))); return data as AcademicTask
  })
  const deleteTask = (id: string) => run(async () => {
    const { supabase, userId } = await authenticatedClient()
    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
    setTasks((current) => current.filter((task) => task.id !== id))
  })
  return { subjects, tasks, loading, error, busy, load, createSubject, updateSubject, deleteSubject, createTask, updateTask, toggleTask, deleteTask }
}

function SubjectForm({ subject, busy, onSave, onCancel }: { subject?: Subject; busy: boolean; onSave: (input: SubjectInput) => Promise<unknown>; onCancel: () => void }) {
  const [form, setForm] = useState(() => subject ? { name: subject.name, code: subject.code ?? '', credits: String(subject.credits), teacher: subject.teacher ?? '', progress: String(subject.progress), status: subject.status ?? '' } : { name: '', code: '', credits: '3', teacher: '', progress: '0', status: 'active' })
  const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false)
  
  useEffect(() => {
    if (subject) {
      setForm({ name: subject.name, code: subject.code ?? '', credits: String(subject.credits), teacher: subject.teacher ?? '', progress: String(subject.progress), status: subject.status ?? '' })
    } else {
      setForm({ name: '', code: '', credits: '3', teacher: '', progress: '0', status: 'active' })
    }
    setMessage('')
  }, [subject])

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving || busy) return
    const credits = Number(form.credits), progress = Number(form.progress)
    if (!form.name.trim() || !Number.isInteger(credits) || credits < 1 || credits > 10 || !Number.isInteger(progress) || progress < 0 || progress > 100) { setMessage('Enter a name, credits from 1–10, and progress from 0–100.'); return }
    setSaving(true); setMessage('')
    try { await onSave({ name: form.name.trim(), code: form.code.trim() || null, credits, teacher: form.teacher.trim() || null, progress, status: form.status.trim() || null }); onCancel() } catch (error) { console.error('Unable to save subject:', error); setMessage('We could not save this subject. Please try again.') } finally { setSaving(false) }
  }
  return (
    <div className="modal-backdrop">
      <div className="modal surface">
        <button className="modal-close" onClick={onCancel} aria-label="Close modal">✕</button>
        <div className="eyebrow accent">{subject ? 'EDIT SUBJECT' : 'NEW SUBJECT'}</div>
        <h2>{subject ? `Edit ${subject.name}` : 'Add a new subject'}</h2>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="field-wide">Subject name<input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Data Structures & Algorithms" required /></label>
            <label>Subject code<input value={form.code} onChange={(e) => update('code', e.target.value)} placeholder="CS201" /></label>
            <label>Credits<input type="number" min="1" max="10" value={form.credits} onChange={(e) => update('credits', e.target.value)} /></label>
            <label>Teacher / Instructor<input value={form.teacher} onChange={(e) => update('teacher', e.target.value)} placeholder="Optional" /></label>
            <label>Progress (%)<input type="number" min="0" max="100" value={form.progress} onChange={(e) => update('progress', e.target.value)} /></label>
            <label>Status<input value={form.status} onChange={(e) => update('status', e.target.value)} placeholder="active" /></label>
          </div>
          {message && <p className="feedback-error mt-3">{message}</p>}
          <div className="modal-footer mt-4">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button type="submit" className="primary-btn" disabled={saving || busy}>{saving ? 'Saving...' : subject ? 'Save changes' : 'Create subject'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TaskForm({ task, subjects, busy, onSave, onCancel }: { task?: AcademicTask; subjects: Subject[]; busy: boolean; onSave: (input: TaskInput) => Promise<unknown>; onCancel: () => void }) {
  const [form, setForm] = useState(() => task ? { title: task.title, description: task.description ?? '', task_type: task.task_type ?? 'study', duration_minutes: task.duration_minutes == null ? '' : String(task.duration_minutes), scheduled_date: task.scheduled_date ?? '', subject_id: task.subject_id ?? '' } : { title: '', description: '', task_type: 'study', duration_minutes: '45', scheduled_date: '', subject_id: '' })
  const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (task) {
      setForm({ title: task.title, description: task.description ?? '', task_type: task.task_type ?? 'study', duration_minutes: task.duration_minutes == null ? '' : String(task.duration_minutes), scheduled_date: task.scheduled_date ?? '', subject_id: task.subject_id ?? '' })
    } else {
      setForm({ title: '', description: '', task_type: 'study', duration_minutes: '45', scheduled_date: '', subject_id: '' })
    }
    setMessage('')
  }, [task])

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving || busy) return
    const duration = form.duration_minutes === '' ? null : Number(form.duration_minutes)
    if (!form.title.trim() || (duration !== null && (!Number.isInteger(duration) || duration < 1))) { setMessage('Enter a task title and a positive whole-minute duration when provided.'); return }
    setSaving(true); setMessage('')
    try { await onSave({ title: form.title.trim(), description: form.description.trim() || null, task_type: form.task_type.trim() || null, duration_minutes: duration, scheduled_date: form.scheduled_date || null, subject_id: form.subject_id || null }); onCancel() } catch (error) { console.error('Unable to save task:', error); setMessage('We could not save this task. Please try again.') } finally { setSaving(false) }
  }
  return (
    <div className="modal-backdrop">
      <div className="modal surface">
        <button className="modal-close" onClick={onCancel} aria-label="Close modal">✕</button>
        <div className="eyebrow accent">{task ? 'EDIT TASK' : 'NEW TASK'}</div>
        <h2>{task ? `Edit "${task.title}"` : 'Add academic task'}</h2>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="field-wide">Task title<input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Solve Binary Tree Traversal problems" required /></label>
            <label>Subject<select value={form.subject_id} onChange={(e) => update('subject_id', e.target.value)}><option value="">No subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
            <label>Task type<select value={form.task_type} onChange={(e) => update('task_type', e.target.value)}><option value="study">Study</option><option value="revision">Revision</option><option value="assignment">Assignment</option><option value="exam">Exam Prep</option><option value="practice">Practice</option></select></label>
            <label>Duration (minutes)<input type="number" min="1" max="480" value={form.duration_minutes} onChange={(e) => update('duration_minutes', e.target.value)} placeholder="45" /></label>
            <label>Scheduled date<input type="date" value={form.scheduled_date} onChange={(e) => update('scheduled_date', e.target.value)} /></label>
            <label className="field-wide">Description / Notes<input value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Optional details, chapter, or problem links" /></label>
          </div>
          {message && <p className="feedback-error mt-3">{message}</p>}
          <div className="modal-footer mt-4">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button type="submit" className="primary-btn" disabled={saving || busy}>{saving ? 'Saving...' : task ? 'Save changes' : 'Create task'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AcademicCoreWorkspace({ academic, query = '', notify }: { academic: ReturnType<typeof useAcademicCore>; query?: string; notify: (message: string) => void }) {
  const [subjectForm, setSubjectForm] = useState<Subject | 'new' | null>(null); const [taskForm, setTaskForm] = useState<AcademicTask | 'new' | null>(null); const [actionError, setActionError] = useState('')
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed' | 'today' | 'upcoming'>('all')
  const [taskSubjectId, setTaskSubjectId] = useState('')
  const [today, setToday] = useState('')
  useEffect(() => { setToday(new Date().toISOString().slice(0, 10)) }, [])
  const subjectName = (id: string | null) => academic.subjects.find((subject) => subject.id === id)?.name || 'No subject'
  const term = query.trim().toLowerCase()
  const visibleSubjects = useMemo(() => !term ? academic.subjects : academic.subjects.filter((item) => item.name.toLowerCase().includes(term) || (item.code ?? '').toLowerCase().includes(term) || (item.teacher ?? '').toLowerCase().includes(term)), [academic.subjects, term])
  const visibleTasks = useMemo(() => academic.tasks.filter((item) => {
    const matchesSearch = !term || item.title.toLowerCase().includes(term) || (item.description ?? '').toLowerCase().includes(term) || subjectName(item.subject_id).toLowerCase().includes(term)
    const matchesSubject = !taskSubjectId || (taskSubjectId === 'none' ? !item.subject_id : item.subject_id === taskSubjectId)
    const matchesFilter = taskFilter === 'all' || (taskFilter === 'pending' && !item.completed) || (taskFilter === 'completed' && item.completed) || (taskFilter === 'today' && Boolean(today) && item.scheduled_date === today) || (taskFilter === 'upcoming' && Boolean(today) && !item.completed && Boolean(item.scheduled_date) && (item.scheduled_date ?? '') > today)
    return matchesSearch && matchesSubject && matchesFilter
  }), [academic.tasks, taskFilter, taskSubjectId, term, today])
  const totalTasks = academic.tasks.length
  const completedTasks = academic.tasks.filter((task) => task.completed).length
  const pendingTasks = totalTasks - completedTasks
  const averageProgress = academic.subjects.length ? Math.round(academic.subjects.reduce((total, subject) => total + subject.progress, 0) / academic.subjects.length) : 0
  async function act(work: () => Promise<unknown>, success: string, failure: string) { try { await work(); setActionError(''); notify(success) } catch (error) { console.error(failure, error); setActionError(failure) } }
  if (academic.loading) return <div className="surface panel"><strong>Loading academics…</strong><p className="muted">Getting your saved subjects and tasks.</p></div>
  return <><div className="surface panel"><div className="section-head"><div><span className="eyebrow">ACADEMIC CORE</span><h2>Subjects and tasks</h2><p className="muted">Keep your academic work organized in one place.</p></div><div className="flex gap-2"><Button className="primary-btn" onClick={() => setSubjectForm('new')} disabled={academic.busy}><Plus data-icon="inline-start" /> Add subject</Button><Button variant="outline" onClick={() => setTaskForm('new')} disabled={academic.busy}><Plus data-icon="inline-start" /> Add task</Button></div></div>{academic.error && <p className="feedback-error mt-3">{academic.error}</p>}{actionError && <p className="feedback-error mt-3">{actionError}</p>}<Button variant="ghost" size="sm" onClick={() => void academic.load()} disabled={academic.loading || academic.busy}>Refresh saved academics</Button></div>
    {subjectForm && <SubjectForm subject={subjectForm === 'new' ? undefined : subjectForm} busy={academic.busy} onCancel={() => setSubjectForm(null)} onSave={async (input) => { if (subjectForm === 'new') { await academic.createSubject(input); notify('Subject saved.') } else { await academic.updateSubject(subjectForm.id, input); notify('Subject updated.') } }} />}
    {taskForm && <TaskForm task={taskForm === 'new' ? undefined : taskForm} subjects={academic.subjects} busy={academic.busy} onCancel={() => setTaskForm(null)} onSave={async (input) => { if (taskForm === 'new') { await academic.createTask(input); notify('Task saved.') } else { await academic.updateTask(taskForm.id, input); notify('Task updated.') } }} />}
    <div className="section-head mt-5"><div><span className="eyebrow">SUBJECTS</span><h2>Your subjects</h2></div></div><div className="subject-grid">{visibleSubjects.length === 0 ? <div className="surface empty-page"><h3>{academic.subjects.length ? 'No matching subjects' : 'No subjects yet'}</h3><p className="muted">Add a subject to track credits, teacher, progress, and status.</p></div> : visibleSubjects.map((subject, index) => <div className="surface subject-card" key={subject.id}><div className="subject-top"><div className={`subject-symbol symbol-${colors[index % colors.length]}`}>{subject.name.slice(0, 2).toUpperCase()}</div><div className="flex gap-1"><button aria-label={`Edit ${subject.name}`} onClick={() => setSubjectForm(subject)} disabled={academic.busy}><Pencil /></button><button aria-label={`Delete ${subject.name}`} disabled={academic.busy} onClick={() => { if (window.confirm(`Delete ${subject.name}?`)) void act(() => academic.deleteSubject(subject.id), 'Subject deleted.', 'We could not delete this subject.') }}><Trash2 /></button></div></div><span className="eyebrow">{subject.code || 'NO CODE'} · {subject.credits} CREDITS</span><h3>{subject.name}</h3><p className="muted text-xs">{subject.teacher || 'Teacher not set'} · {subject.status || 'Status not set'}</p><div className="subject-progress"><div><span>Progress</span><strong>{subject.progress}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-violet-400" style={{ width: `${subject.progress}%` }} /></div><p className="muted text-xs mt-2">Edit this subject to update progress.</p></div></div>)}</div>
    <div className="section-head mt-5"><div><span className="eyebrow">TASKS</span><h2>Your academic tasks</h2><p className="muted">{totalTasks} total · {pendingTasks} pending · {completedTasks} completed · {totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0}% complete</p></div></div><div className="surface panel"><div className="form-grid mb-4"><label>Task view<select value={taskFilter} onChange={(event) => setTaskFilter(event.target.value as typeof taskFilter)}><option value="all">All tasks</option><option value="pending">Pending</option><option value="completed">Completed</option><option value="today">Today</option><option value="upcoming">Upcoming</option></select></label><label>Subject<select value={taskSubjectId} onChange={(event) => setTaskSubjectId(event.target.value)}><option value="">All subjects</option><option value="none">No subject</option>{academic.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><div><span className="eyebrow">SUBJECT OVERVIEW</span><p className="muted">{academic.subjects.length} subjects · {averageProgress}% average progress</p></div></div>{visibleTasks.length === 0 ? <div className="empty-state"><Check /><strong>{academic.tasks.length ? 'No matching tasks' : 'No tasks yet'}</strong><span>Add a task with an optional subject, scheduled date, and duration.</span></div> : visibleTasks.map((task) => <div className={`task-row ${task.completed ? 'task-complete' : ''}`} key={task.id}><div className="task-copy"><span className="eyebrow">{task.task_type || 'TASK'} · {subjectName(task.subject_id)}{task.completed ? ' · DONE' : ''}</span><strong>{task.title}</strong><small>{task.scheduled_date ? `Scheduled ${task.scheduled_date}` : 'Not scheduled'}{task.duration_minutes ? ` · ${task.duration_minutes} min` : ''}{task.description ? ` · ${task.description}` : ''}</small></div><div className="flex gap-1"><Button variant="ghost" size="icon" disabled={academic.busy} onClick={() => void act(() => academic.toggleTask(task), task.completed ? 'Task reopened.' : 'Task completed.', 'We could not update this task.')} aria-label={task.completed ? `Reopen ${task.title}` : `Complete ${task.title}`}>{task.completed ? <RotateCcw /> : <Check />}</Button><Button variant="ghost" size="icon" disabled={academic.busy} onClick={() => setTaskForm(task)} aria-label={`Edit ${task.title}`}><Pencil /></Button><Button variant="ghost" size="icon" disabled={academic.busy} onClick={() => { if (window.confirm(`Delete ${task.title}?`)) void act(() => academic.deleteTask(task.id), 'Task deleted.', 'We could not delete this task.') }} aria-label={`Delete ${task.title}`}><Trash2 /></Button></div></div>)}</div></>
}

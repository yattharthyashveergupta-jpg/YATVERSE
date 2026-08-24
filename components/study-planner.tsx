'use client'

import { FormEvent, useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AcademicTask, Subject, useAcademicCore } from '@/components/academic-core'

interface StudyPlannerProps {
  academic: ReturnType<typeof useAcademicCore>
  notify: (message: string) => void
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export function StudyPlanner({ academic, notify }: StudyPlannerProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [editingTask, setEditingTask] = useState<AcademicTask | 'new' | null>(null)
  const [filterType, setFilterType] = useState<string>('all')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // First day of month (0 = Sun, 1 = Mon... convert to Monday-first: 0 = Mon ... 6 = Sun)
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  // Map dates to task counts
  const tasksByDate = useMemo(() => {
    const map = new Map<string, AcademicTask[]>()
    for (const task of academic.tasks) {
      if (task.scheduled_date) {
        const list = map.get(task.scheduled_date) || []
        list.push(task)
        map.set(task.scheduled_date, list)
      }
    }
    return map
  }, [academic.tasks])

  // Tasks for the currently selected date
  const dayTasks = useMemo(() => {
    const list = tasksByDate.get(selectedDate) || []
    if (filterType === 'all') return list
    if (filterType === 'pending') return list.filter((t) => !t.completed)
    if (filterType === 'completed') return list.filter((t) => t.completed)
    return list.filter((t) => (t.task_type || 'study').toLowerCase() === filterType.toLowerCase())
  }, [tasksByDate, selectedDate, filterType])

  // Total scheduled study minutes on selected day
  const totalDayMinutes = useMemo(() => {
    return dayTasks.reduce((acc, t) => acc + (t.duration_minutes || 0), 0)
  }, [dayTasks])

  // All upcoming tasks beyond today
  const upcomingTasks = useMemo(() => {
    return academic.tasks
      .filter((t) => !t.completed && t.scheduled_date && t.scheduled_date > todayStr)
      .slice(0, 5)
  }, [academic.tasks, todayStr])

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const subjectName = (id: string | null) =>
    academic.subjects.find((s) => s.id === id)?.name || 'General Study'

  const formattedSelectedDate = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    if (!y || !m || !d) return selectedDate
    const dateObj = new Date(y, m - 1, d)
    return dateObj.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }, [selectedDate])

  return (
    <div className="study-planner-container">
      {/* Top Banner */}
      <div className="surface panel mb-5">
        <div className="section-head mt-0 mb-0">
          <div>
            <span className="eyebrow accent">TIME & FOCUS ENGINE</span>
            <h2>Study Planner & Schedule</h2>
            <p className="muted">
              Organize daily study sessions, assign subjects, set duration targets, and stay on top of deadlines.
            </p>
          </div>
          <Button
            className="primary-btn"
            onClick={() => setEditingTask('new')}
            disabled={academic.busy}
          >
            <Plus data-icon="inline-start" /> Plan study session
          </Button>
        </div>
      </div>

      {/* Main Grid: Calendar & Day Timeline */}
      <div className="schedule-layout">
        {/* Calendar Card */}
        <div className="surface panel">
          <div className="calendar-head">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft />
            </Button>
            <h3>
              {MONTH_NAMES[month]} {year}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              aria-label="Next month"
            >
              <ChevronRight />
            </Button>
          </div>

          <div className="weekdays">
            {DAYS_OF_WEEK.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {/* Blank leading days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`blank-${i}`} className="opacity-0" />
            ))}

            {/* Days in month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const hasTasks = (tasksByDate.get(dateStr)?.length || 0) > 0

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(dateStr)}
                  className={`${isSelected ? 'selected-day' : ''} ${isToday ? 'today' : ''}`}
                >
                  {dayNum}
                  {hasTasks && <i />}
                </button>
              )
            })}
          </div>

          {/* Quick Month Summary */}
          <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {academic.tasks.filter((t) => t.scheduled_date?.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length} sessions this month
            </span>
            <button
              type="button"
              className="text-violet-400 hover:underline text-xs"
              onClick={() => {
                const now = new Date()
                setCurrentDate(now)
                setSelectedDate(now.toISOString().slice(0, 10))
              }}
            >
              Go to today
            </button>
          </div>
        </div>

        {/* Selected Day Agenda */}
        <div className="surface panel">
          <div className="card-head">
            <div>
              <span className="eyebrow uppercase">{formattedSelectedDate}</span>
              <h3>
                {selectedDate === todayStr
                  ? "Today's Agenda"
                  : 'Planned Sessions'}
              </h3>
              <p className="muted text-xs mt-1">
                {dayTasks.length} session{dayTasks.length === 1 ? '' : 's'} · {totalDayMinutes} min total focus
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-lg border border-white/[0.09] bg-[#0f0f14] px-2.5 py-1.5 text-xs text-foreground outline-none"
              >
                <option value="all">All types</option>
                <option value="pending">Pending only</option>
                <option value="completed">Completed only</option>
                <option value="study">Study</option>
                <option value="revision">Revision</option>
                <option value="assignment">Assignment</option>
                <option value="exam">Exam Prep</option>
                <option value="practice">Practice</option>
              </select>
            </div>
          </div>

          {/* Session List */}
          <div className="task-list mt-4">
            {dayTasks.length === 0 ? (
              <div className="empty-state py-8">
                <Clock3 className="w-6 h-6 text-violet-400 mb-1" />
                <strong>No sessions planned for this date.</strong>
                <span>
                  Click &ldquo;Plan study session&rdquo; to schedule study blocks, revision checkpoints, or assignment tasks.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setEditingTask('new')}
                >
                  <Plus data-icon="inline-start" /> Add session for {selectedDate}
                </Button>
              </div>
            ) : (
              dayTasks.map((task) => (
                <div
                  key={task.id}
                  className={`task-row ${task.completed ? 'task-complete' : ''}`}
                >
                  <div className="task-icon task-violet">
                    <Clock3 />
                  </div>
                  <div className="task-copy">
                    <span className="eyebrow">
                      {(task.task_type || 'STUDY').toUpperCase()} · {subjectName(task.subject_id)}
                      {task.duration_minutes ? ` · ${task.duration_minutes} MIN` : ''}
                    </span>
                    <strong>{task.title}</strong>
                    {task.description && <small>{task.description}</small>}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={academic.busy}
                      onClick={async () => {
                        try {
                          await academic.toggleTask(task)
                          notify(task.completed ? 'Session reopened.' : 'Session completed! Great work.')
                        } catch {
                          notify('Could not update session.')
                        }
                      }}
                      aria-label={task.completed ? 'Reopen session' : 'Complete session'}
                    >
                      {task.completed ? <RotateCcw /> : <Check />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={academic.busy}
                      onClick={() => setEditingTask(task)}
                      aria-label="Edit session"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={academic.busy}
                      onClick={async () => {
                        if (!window.confirm(`Delete "${task.title}"?`)) return
                        try {
                          await academic.deleteTask(task.id)
                          notify('Session deleted.')
                        } catch {
                          notify('Could not delete session.')
                        }
                      }}
                      aria-label="Delete session"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Checkpoints Panel */}
      {upcomingTasks.length > 0 && (
        <div className="surface panel mt-5">
          <div className="card-head">
            <div>
              <span className="eyebrow accent">UPCOMING CHECKPOINTS</span>
              <h3>Future study sessions</h3>
            </div>
            <CalendarDays />
          </div>
          <div className="timeline mt-3">
            {upcomingTasks.map((task) => (
              <div key={task.id}>
                <span>{task.scheduled_date}</span>
                <strong>{task.title}</strong>
                <small>
                  {subjectName(task.subject_id)}
                  {task.duration_minutes ? ` · ${task.duration_minutes} min` : ''}
                  {task.task_type ? ` · ${task.task_type}` : ''}
                </small>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {editingTask && (
        <PlannerModal
          task={editingTask === 'new' ? undefined : editingTask}
          defaultDate={selectedDate}
          subjects={academic.subjects}
          busy={academic.busy}
          onClose={() => setEditingTask(null)}
          onSave={async (input) => {
            if (editingTask === 'new') {
              await academic.createTask(input)
              notify('Study session scheduled.')
            } else {
              await academic.updateTask(editingTask.id, input)
              notify('Study session updated.')
            }
            setEditingTask(null)
          }}
        />
      )}
    </div>
  )
}

function PlannerModal({
  task,
  defaultDate,
  subjects,
  busy,
  onClose,
  onSave,
}: {
  task?: AcademicTask
  defaultDate: string
  subjects: Subject[]
  busy: boolean
  onClose: () => void
  onSave: (input: {
    title: string
    description: string | null
    task_type: string | null
    duration_minutes: number | null
    scheduled_date: string | null
    subject_id: string | null
  }) => Promise<void>
}) {
  const [title, setTitle] = useState(task?.title || '')
  const [subjectId, setSubjectId] = useState(task?.subject_id || '')
  const [taskType, setTaskType] = useState(task?.task_type || 'study')
  const [duration, setDuration] = useState(
    task?.duration_minutes != null ? String(task.duration_minutes) : '45'
  )
  const [scheduledDate, setScheduledDate] = useState(task?.scheduled_date || defaultDate)
  const [description, setDescription] = useState(task?.description || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving || busy) return
    if (!title.trim()) {
      setError('Please enter a session title.')
      return
    }

    const dur = duration ? Number(duration) : null
    if (dur !== null && (!Number.isInteger(dur) || dur < 1 || dur > 1440)) {
      setError('Please enter a valid duration in minutes (1–1440).')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        title: title.trim(),
        subject_id: subjectId || null,
        task_type: taskType.trim() || null,
        duration_minutes: dur,
        scheduled_date: scheduledDate || null,
        description: description.trim() || null,
      })
    } catch (err) {
      console.error('Failed to save study session:', err)
      setError('We could not save this session. Please try again.')
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
        <div className="eyebrow accent">
          {task ? 'EDIT SESSION' : 'SCHEDULE SESSION'}
        </div>
        <h2>{task ? 'Update study plan' : 'Plan a study session'}</h2>
        <p className="muted">
          Block focused study time, attach a subject, and keep your semester on schedule.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="field-wide">
              Session Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Binary Trees & Traversal practice"
                required
              />
            </label>

            <label>
              Subject
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="">No subject (General)</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Session Type
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
              >
                <option value="study">Study</option>
                <option value="revision">Revision</option>
                <option value="assignment">Assignment</option>
                <option value="exam">Exam Prep</option>
                <option value="practice">Coding / Practice</option>
              </select>
            </label>

            <label>
              Scheduled Date
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
              />
            </label>

            <label>
              Duration (minutes)
              <input
                type="number"
                min="5"
                max="1440"
                step="5"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="45"
              />
            </label>

            <label className="field-wide">
              Notes & Goals (Optional)
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key topics to cover, textbook chapters, or exercises"
              />
            </label>
          </div>

          {error && <p className="feedback-error mt-3">{error}</p>}

          <div className="modal-footer">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="primary-btn"
              disabled={saving || busy}
            >
              {saving ? 'Saving...' : task ? 'Update session' : 'Schedule session'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

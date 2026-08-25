'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  Flame,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pill } from '@/components/ui/pill'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/utils/supabase/client'

export interface RevisionCheckItem {
  id: string
  text: string
  done: boolean
}

export interface RevisionItem {
  id: string
  user_id?: string
  subject_id?: string
  subject_name: string
  topic: string
  high_yield_summary: string
  exam_priority: 'High' | 'Medium' | 'Low'
  status: 'Not Started' | 'In Progress' | 'Revised'
  formulas_and_shortcuts: string[]
  common_traps_and_pitfalls: string[]
  checklist: RevisionCheckItem[]
  revision_count: number
  last_revised_at: string | null
  next_revision_date: string | null
  created_at: string
}

const DEFAULT_SEEDED_REVISIONS: RevisionItem[] = [
  {
    id: 'rev-master-theorem',
    subject_name: 'Data Structures & Algorithms',
    topic: 'Master Theorem for Divide-and-Conquer Recurrences',
    high_yield_summary: `Form: T(n) = a * T(n / b) + f(n), with a >= 1, b > 1, and f(n) = Θ(n^c * log^k n).
Compare c with log_b(a):
- Case 1: If c < log_b(a) ⇒ T(n) = Θ(n^(log_b a))
- Case 2: If c = log_b(a) ⇒ T(n) = Θ(n^c * log^(k+1) n)
- Case 3: If c > log_b(a) and regularity condition holds ⇒ T(n) = Θ(f(n))`,
    exam_priority: 'High',
    status: 'In Progress',
    formulas_and_shortcuts: [
      'Binary Search: T(n) = T(n/2) + O(1) → a=1, b=2, c=0 → Case 2 → O(log n)',
      'Merge Sort: T(n) = 2T(n/2) + O(n) → a=2, b=2, c=1 → Case 2 → O(n log n)',
      'Strassen Matrix: T(n) = 7T(n/2) + O(n^2) → log_2(7) ≈ 2.81 > 2 → Case 1 → O(n^2.81)',
    ],
    common_traps_and_pitfalls: [
      'Master theorem CANNOT be applied if b is not constant (e.g., T(n) = 2T(√n) + 1).',
      'Cannot be applied if difference between f(n) and n^(log_b a) is polynomial but not strictly bounded.',
      'Always verify regularity condition a * f(n/b) <= d * f(n) for d < 1 in Case 3.',
    ],
    checklist: [
      { id: 'c1', text: 'Can compute log_b(a) without calculator', done: true },
      { id: 'c2', text: 'Can recognize Case 1 vs Case 2 vs Case 3 in under 15 seconds', done: true },
      { id: 'c3', text: 'Can solve non-standard recurrence using Recursion Tree', done: false },
    ],
    revision_count: 2,
    last_revised_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    next_revision_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'rev-dbms-indexing',
    subject_name: 'Database Management Systems',
    topic: 'B-Tree vs B+ Tree Indexing & Disk I/O Minimization',
    high_yield_summary: `B+ Trees keep all data records/pointers in leaf nodes, while internal nodes store only search keys.
Leaf nodes are linked in a bidirectional linked list for high-speed sequential and range queries (WHERE age BETWEEN 20 AND 30).
Higher fanout reduces tree height h, directly minimizing disk block accesses (I/O).`,
    exam_priority: 'High',
    status: 'Revised',
    formulas_and_shortcuts: [
      'Fanout F = ⌊(BlockSize + PointerSize) / (KeySize + PointerSize)⌋',
      'Tree Height h = ⌈log_F (N / LeafCapacity)⌉',
      'Disk I/O for Search in B+ Tree = h + 1 (data fetch)',
    ],
    common_traps_and_pitfalls: [
      'B-Tree stores record pointers in BOTH internal and leaf nodes; B+ Tree ONLY stores data in leaves.',
      'Range scans are inefficient in standard B-Tree because they require in-order tree traversal instead of leaf linked-list walking.',
      'Clustered Index determines physical table order on disk (only 1 per table); Non-clustered index uses auxiliary pointer tree.',
    ],
    checklist: [
      { id: 'c1', text: 'Can draw B+ Tree insertion with node split', done: true },
      { id: 'c2', text: 'Can calculate tree height given block size and key size', done: true },
      { id: 'c3', text: 'Can contrast Clustered vs Secondary indexes', done: true },
    ],
    revision_count: 3,
    last_revised_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    next_revision_date: new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10),
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'rev-cn-tcp-handshake',
    subject_name: 'Computer Networks',
    topic: 'TCP 3-Way Handshake, Teardown & TIME_WAIT State',
    high_yield_summary: `TCP Connection Establishment:
1. Client sends SYN (seq = x)
2. Server responds SYN-ACK (seq = y, ack = x + 1)
3. Client sends ACK (seq = x + 1, ack = y + 1)

TCP Teardown uses 4-Way FIN/ACK handshake.
TIME_WAIT state lasts 2 * MSL (Maximum Segment Lifetime) to ensure lingering duplicate packets in network expire.`,
    exam_priority: 'Medium',
    status: 'Not Started',
    formulas_and_shortcuts: [
      'Effective Throughput = WindowSize / RoundTripTime (RTT)',
      'TCP Congestion Window Phases: Slow Start (2^n) → Additive Increase / Multiplicative Decrease (AIMD)',
      'Threshold on Packet Loss (3 Duplicate ACKs): ssthresh = cwnd / 2; cwnd = ssthresh + 3',
    ],
    common_traps_and_pitfalls: [
      'SYN packet consumes 1 sequence number even though it carries 0 bytes of user payload data.',
      'ACK flag is set in all packets after the initial SYN.',
      'TIME_WAIT state exists on the side that sends the ACTIVE CLOSE (typically client).',
    ],
    checklist: [
      { id: 'c1', text: 'Can write sequence and ACK numbers for 3-way handshake', done: false },
      { id: 'c2', text: 'Can explain why 2 MSL wait is necessary in TCP teardown', done: false },
      { id: 'c3', text: 'Can chart cwnd during Fast Retransmit / Fast Recovery', done: false },
    ],
    revision_count: 0,
    last_revised_at: null,
    next_revision_date: new Date().toISOString().slice(0, 10),
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
]

export function RevisionWorkspace({
  subjects,
  notify,
}: {
  subjects: any[]
  notify: (msg: string) => void
}) {
  const [items, setItems] = useState<RevisionItem[]>([])
  const [selectedItem, setSelectedItem] = useState<RevisionItem | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Not Started' | 'In Progress' | 'Revised'>('All')
  const [subjectFilter, setSubjectFilter] = useState('All')
  const [userId, setUserId] = useState('local')

  // Form states
  const [formSubject, setFormSubject] = useState('')
  const [formTopic, setFormTopic] = useState('')
  const [formSummary, setFormSummary] = useState('')
  const [formPriority, setFormPriority] = useState<'High' | 'Medium' | 'Low'>('High')
  const [formFormulas, setFormFormulas] = useState('')
  const [formTraps, setFormTraps] = useState('')
  const [formChecklist, setFormChecklist] = useState('')

  // Load User & Saved Revisions
  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const currentUid = user?.id || 'local'
      setUserId(currentUid)

      const storageKey = `yatverse_revisions_${currentUid}`
      const localData = localStorage.getItem(storageKey)

      if (localData) {
        try {
          const parsed = JSON.parse(localData)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed)
            setSelectedItem(parsed[0])
            return
          }
        } catch (e) {
          console.error('Failed to parse cached revisions:', e)
        }
      }

      setItems(DEFAULT_SEEDED_REVISIONS)
      setSelectedItem(DEFAULT_SEEDED_REVISIONS[0])
      localStorage.setItem(storageKey, JSON.stringify(DEFAULT_SEEDED_REVISIONS))
    }

    void loadData()
  }, [])

  const persistRevisions = (updated: RevisionItem[]) => {
    setItems(updated)
    const storageKey = `yatverse_revisions_${userId}`
    localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  // Quick "Mark Revised" Handler with Spaced Repetition Bump
  const markRevised = (id: string) => {
    const nextList = items.map((item) => {
      if (item.id === id) {
        const nextCount = item.revision_count + 1
        const intervalDays = nextCount === 1 ? 3 : nextCount === 2 ? 7 : 14
        const nextDate = new Date(Date.now() + 86400000 * intervalDays).toISOString().slice(0, 10)
        return {
          ...item,
          status: 'Revised' as const,
          revision_count: nextCount,
          last_revised_at: new Date().toISOString(),
          next_revision_date: nextDate,
          checklist: item.checklist.map((c) => ({ ...c, done: true })),
        }
      }
      return item
    })

    persistRevisions(nextList)
    const updated = nextList.find((i) => i.id === id)
    if (updated && selectedItem?.id === id) {
      setSelectedItem(updated)
    }
    notify(`Marked "${updated?.topic || 'Topic'}" as Revised! Next scheduled review in ${updated?.revision_count === 1 ? '3' : '7'} days.`)
  }

  const toggleChecklistItem = (itemId: string, checkId: string) => {
    const nextList = items.map((item) => {
      if (item.id === itemId) {
        const updatedChecks = item.checklist.map((c) =>
          c.id === checkId ? { ...c, done: !c.done } : c
        )
        const allDone = updatedChecks.every((c) => c.done)
        return {
          ...item,
          checklist: updatedChecks,
          status: allDone ? ('Revised' as const) : ('In Progress' as const),
        }
      }
      return item
    })

    persistRevisions(nextList)
    if (selectedItem?.id === itemId) {
      const current = nextList.find((i) => i.id === itemId)
      if (current) setSelectedItem(current)
    }
  }

  // Filtering Revisions
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return items
      .filter((item) => {
        const matchesQuery =
          !q ||
          item.topic.toLowerCase().includes(q) ||
          item.subject_name.toLowerCase().includes(q) ||
          item.high_yield_summary.toLowerCase().includes(q) ||
          item.formulas_and_shortcuts.some((f) => f.toLowerCase().includes(q)) ||
          item.common_traps_and_pitfalls.some((t) => t.toLowerCase().includes(q))

        const matchesPriority = priorityFilter === 'All' || item.exam_priority === priorityFilter
        const matchesStatus = statusFilter === 'All' || item.status === statusFilter
        const matchesSubject = subjectFilter === 'All' || item.subject_name === subjectFilter

        return matchesQuery && matchesPriority && matchesStatus && matchesSubject
      })
      .sort((a, b) => {
        // High priority first, then Not Started first
        const pOrder = { High: 0, Medium: 1, Low: 2 }
        if (pOrder[a.exam_priority] !== pOrder[b.exam_priority]) {
          return pOrder[a.exam_priority] - pOrder[b.exam_priority]
        }
        const sOrder = { 'Not Started': 0, 'In Progress': 1, Revised: 2 }
        return sOrder[a.status] - sOrder[b.status]
      })
  }, [items, searchQuery, priorityFilter, statusFilter, subjectFilter])

  const openCreateModal = () => {
    setFormSubject(subjects[0]?.name || 'Computer Science')
    setFormTopic('')
    setFormSummary('')
    setFormPriority('High')
    setFormFormulas('')
    setFormTraps('')
    setFormChecklist('')
    setIsCreating(true)
    setIsEditing(false)
  }

  const openEditModal = (item: RevisionItem) => {
    setFormSubject(item.subject_name)
    setFormTopic(item.topic)
    setFormSummary(item.high_yield_summary)
    setFormPriority(item.exam_priority)
    setFormFormulas(item.formulas_and_shortcuts.join('\n'))
    setFormTraps(item.common_traps_and_pitfalls.join('\n'))
    setFormChecklist(item.checklist.map((c) => c.text).join('\n'))
    setIsEditing(true)
    setIsCreating(false)
  }

  const handleSaveRevision = (e: FormEvent) => {
    e.preventDefault()
    if (!formTopic.trim()) {
      notify('Please enter a revision topic.')
      return
    }

    const formulas = formFormulas
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean)

    const traps = formTraps
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)

    const checks: RevisionCheckItem[] = formChecklist
      .split('\n')
      .map((c, i) => ({
        id: `chk-${Date.now()}-${i}`,
        text: c.trim(),
        done: false,
      }))
      .filter((c) => c.text.length > 0)

    if (isEditing && selectedItem) {
      const updated: RevisionItem = {
        ...selectedItem,
        subject_name: formSubject.trim() || 'General',
        topic: formTopic.trim(),
        high_yield_summary: formSummary.trim(),
        exam_priority: formPriority,
        formulas_and_shortcuts: formulas,
        common_traps_and_pitfalls: traps,
        checklist: checks.length ? checks : selectedItem.checklist,
      }

      const nextList = items.map((i) => (i.id === updated.id ? updated : i))
      persistRevisions(nextList)
      setSelectedItem(updated)
      setIsEditing(false)
      notify(`Revision topic "${updated.topic}" updated!`)
    } else {
      const newItem: RevisionItem = {
        id: `rev-${Date.now()}`,
        user_id: userId,
        subject_name: formSubject.trim() || 'General',
        topic: formTopic.trim(),
        high_yield_summary: formSummary.trim(),
        exam_priority: formPriority,
        status: 'Not Started',
        formulas_and_shortcuts: formulas,
        common_traps_and_pitfalls: traps,
        checklist:
          checks.length > 0
            ? checks
            : [
                { id: `c-1`, text: 'Can state core theorems without notes', done: false },
                { id: `c-2`, text: 'Can solve standard exam question in 10 mins', done: false },
              ],
        revision_count: 0,
        last_revised_at: null,
        next_revision_date: new Date().toISOString().slice(0, 10),
        created_at: new Date().toISOString(),
      }

      const nextList = [newItem, ...items]
      persistRevisions(nextList)
      setSelectedItem(newItem)
      setIsCreating(false)
      notify(`Added "${newItem.topic}" to Exam Revision Sprint!`)
    }
  }

  const handleDeleteItem = (id: string) => {
    const item = items.find((i) => i.id === id)
    if (!item) return
    if (!window.confirm(`Remove revision topic "${item.topic}"?`)) return

    const nextList = items.filter((i) => i.id !== id)
    persistRevisions(nextList)
    if (selectedItem?.id === id) {
      setSelectedItem(nextList[0] || null)
    }
    notify(`Revision topic "${item.topic}" removed.`)
  }

  const revisedCount = items.filter((i) => i.status === 'Revised').length
  const revisionProgress = items.length ? Math.round((revisedCount / items.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Top Banner & Exam Sprint Controls */}
      <div className="surface panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">EXAM REVISION SPRINT</span>
            <h2>High-Yield Exam Revision</h2>
            <p className="muted">
              Fast-paced exam prep: review high-priority topics, master critical formulas, avoid common traps, and self-check retention.
            </p>
          </div>
          <Button className="primary-btn" onClick={openCreateModal}>
            <Plus data-icon="inline-start" /> Add Topic to Revise
          </Button>
        </div>

        {/* Revision Sprint Readiness Bar */}
        <div className="surface p-4 rounded-xl border border-white/5 bg-black/40 mt-4">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-zinc-300 font-medium">
              Exam Readiness: <strong className="text-white">{revisedCount} of {items.length} topics revised</strong>
            </span>
            <span className="font-mono text-emerald-400 font-bold">{revisionProgress}% READY</span>
          </div>
          <Progress value={revisionProgress} color="amber" />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <div className="search-wrap flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-zinc-400" />
            <input
              placeholder="Search high-yield topics, formulas, pitfalls..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="text-xs text-zinc-400 hover:text-white px-1"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Priority Quick Filter */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 text-xs">
            {(['All', 'High', 'Medium', 'Low'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 rounded transition text-xs ${
                  priorityFilter === p ? 'bg-violet-600 text-white font-medium' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {p === 'High' ? '🔥 High' : p === 'Medium' ? '⚡ Med' : p === 'Low' ? '📘 Low' : 'All Priority'}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 text-xs">
            {(['All', 'Not Started', 'In Progress', 'Revised'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded transition text-xs ${
                  statusFilter === s ? 'bg-amber-600 text-white font-medium' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {s === 'Not Started' ? '⏳ Unrevised' : s === 'Revised' ? '✅ Revised' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Two-Column Revision Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex justify-between items-center px-1 text-xs text-zinc-400 font-mono">
            <span>{filteredItems.length} HIGH-YIELD TOPICS</span>
            <span>SORTED BY EXAM RISK</span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="surface p-8 rounded-2xl border border-white/5 text-center text-zinc-400">
              <Zap className="w-8 h-8 mx-auto mb-2 text-zinc-500" />
              <p className="text-sm">No revision topics match your current filter.</p>
              <Button variant="ghost" size="sm" onClick={openCreateModal} className="mt-3 text-xs text-amber-400">
                + Add revision topic
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[740px] overflow-y-auto pr-1">
              {filteredItems.map((item) => {
                const isSelected = selectedItem?.id === item.id
                const isHigh = item.exam_priority === 'High'
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`surface p-4 rounded-xl border cursor-pointer transition text-left ${
                      isSelected
                        ? 'border-amber-500/50 bg-amber-950/20 shadow-md shadow-amber-950/30'
                        : 'border-white/5 hover:border-white/20 bg-zinc-900/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Pill
                          tone={isHigh ? 'amber' : item.exam_priority === 'Medium' ? 'blue' : 'neutral'}
                          className="text-[11px]"
                        >
                          {item.exam_priority} Priority {isHigh ? '🔥' : ''}
                        </Pill>
                        <span className="text-[10px] text-zinc-400 font-mono">· {item.subject_name}</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                          item.status === 'Revised'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : item.status === 'In Progress'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <strong className={`block text-sm font-semibold mb-1 ${isSelected ? 'text-amber-200' : 'text-white'}`}>
                      {item.topic}
                    </strong>

                    <p className="text-xs text-zinc-400 line-clamp-2 mb-2 font-mono">
                      {item.high_yield_summary}
                    </p>

                    <div className="flex justify-between items-center text-[11px] text-zinc-500 pt-2 border-t border-white/5">
                      <span>Revised {item.revision_count}x</span>
                      <span>
                        {item.last_revised_at
                          ? `Last: ${new Date(item.last_revised_at).toLocaleDateString()}`
                          : 'Not yet revised'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Detail Pane */}
        <div className="lg:col-span-7">
          {selectedItem ? (
            <div className="surface p-6 rounded-2xl border border-white/10 bg-zinc-900/60 space-y-5">
              {/* Header & Quick Action */}
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Pill tone={selectedItem.exam_priority === 'High' ? 'amber' : 'blue'}>
                      {selectedItem.exam_priority} Priority {selectedItem.exam_priority === 'High' ? '🔥' : ''}
                    </Pill>
                    <span className="text-xs text-zinc-400 font-mono">· {selectedItem.subject_name}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-1">{selectedItem.topic}</h3>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 font-mono">
                    <span>Revised: {selectedItem.revision_count} times</span>
                    <span>·</span>
                    <span>
                      {selectedItem.last_revised_at
                        ? `Last revised: ${new Date(selectedItem.last_revised_at).toLocaleDateString()}`
                        : 'Never revised'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    className="primary-btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                    onClick={() => markRevised(selectedItem.id)}
                  >
                    <CheckCircle2 data-icon="inline-start" /> Mark as Revised
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(selectedItem)}
                    className="text-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteItem(selectedItem.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* High Yield Summary */}
              <div>
                <strong className="block text-xs uppercase tracking-wider text-amber-400 font-mono mb-2">
                  High-Yield Exam Summary (What to remember)
                </strong>
                <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line bg-black/40 p-4 rounded-xl border border-amber-500/20">
                  {selectedItem.high_yield_summary}
                </div>
              </div>

              {/* Formulas & Exam Shortcuts */}
              {selectedItem.formulas_and_shortcuts.length > 0 && (
                <div>
                  <strong className="block text-xs uppercase tracking-wider text-cyan-400 font-mono mb-2">
                    Must-Know Formulas & Shortcuts
                  </strong>
                  <div className="surface p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/10 space-y-2">
                    {selectedItem.formulas_and_shortcuts.map((f, i) => (
                      <div key={i} className="font-mono text-xs text-cyan-200 bg-black/50 p-2.5 rounded border border-white/5">
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Common Pitfalls & Traps */}
              {selectedItem.common_traps_and_pitfalls.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <strong className="text-xs uppercase tracking-wider text-red-400 font-mono">
                      Frequently Forgotten Points & Exam Traps
                    </strong>
                  </div>
                  <ul className="surface p-4 rounded-xl border border-red-500/20 bg-red-950/10 text-xs text-red-200 space-y-1.5 list-disc list-inside">
                    {selectedItem.common_traps_and_pitfalls.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Self-Assessment Checklist */}
              {selectedItem.checklist.length > 0 && (
                <div>
                  <strong className="block text-xs uppercase tracking-wider text-emerald-400 font-mono mb-2">
                    Quick Self-Check Readiness
                  </strong>
                  <div className="surface p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 space-y-2">
                    {selectedItem.checklist.map((chk) => (
                      <div
                        key={chk.id}
                        onClick={() => toggleChecklistItem(selectedItem.id, chk.id)}
                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition text-xs"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                            chk.done
                              ? 'border-emerald-500 bg-emerald-500 text-black'
                              : 'border-white/20 bg-black/40'
                          }`}
                        >
                          {chk.done && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className={chk.done ? 'line-through text-zinc-500' : 'text-zinc-200'}>
                          {chk.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="surface p-12 rounded-2xl border border-white/5 text-center text-zinc-400">
              <Zap className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
              <p className="text-base font-semibold text-white">Select a high-yield topic</p>
              <p className="text-xs text-zinc-400 mt-1">
                Fast-track your exam review with formulas, edge-case traps, and self-checks.
              </p>
              <Button className="primary-btn mt-4" onClick={openCreateModal}>
                <Plus data-icon="inline-start" /> Add Topic to Revise
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Revision Editor Modal */}
      {(isCreating || isEditing) && (
        <div className="modal-backdrop">
          <div className="modal surface max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <button
              className="modal-close"
              onClick={() => {
                setIsCreating(false)
                setIsEditing(false)
              }}
              aria-label="Close modal"
            >
              <X />
            </button>
            <div className="eyebrow accent">{isEditing ? 'EDIT REVISION' : 'NEW EXAM REVISION TOPIC'}</div>
            <h2>{isEditing ? 'Update High-Yield Topic' : 'Add Topic to Revise'}</h2>
            <p className="muted">
              Add exam summaries, critical formulas, and typical exam questions for fast revision.
            </p>

            <form onSubmit={handleSaveRevision} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-mono text-zinc-400 mb-1">SUBJECT</label>
                  <input
                    type="text"
                    required
                    list="rev-subjects"
                    className="w-full p-2.5 rounded-lg border border-white/10 bg-black/40 text-white text-xs focus:outline-none focus:border-amber-500"
                    placeholder="e.g. Algorithms"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                  />
                  <datalist id="rev-subjects">
                    {subjects.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-mono text-zinc-400 mb-1">EXAM PRIORITY</label>
                  <select
                    className="w-full p-2.5 rounded-lg border border-white/10 bg-black/40 text-white text-xs focus:outline-none focus:border-amber-500"
                    value={formPriority}
                    onChange={(e: any) => setFormPriority(e.target.value)}
                  >
                    <option value="High">🔥 High Priority (Guaranteed Marks)</option>
                    <option value="Medium">⚡ Medium Priority</option>
                    <option value="Low">📘 Low Priority</option>
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-mono text-zinc-400 mb-1">TOPIC NAME</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2.5 rounded-lg border border-white/10 bg-black/40 text-white text-xs focus:outline-none focus:border-amber-500"
                    placeholder="e.g. Master Theorem"
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-amber-400 mb-1">HIGH-YIELD CHEATSHEET SUMMARY</label>
                <textarea
                  rows={4}
                  required
                  className="w-full p-2.5 rounded-lg border border-white/10 bg-black/40 text-white text-xs focus:outline-none focus:border-amber-500 resize-y"
                  placeholder="Key summary of rules, algorithm steps, and conditions to memorize for the exam..."
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-cyan-400 mb-1">MUST-KNOW FORMULAS (1 PER LINE)</label>
                  <textarea
                    rows={3}
                    className="w-full p-2.5 rounded-lg border border-cyan-500/20 bg-black/40 text-cyan-200 text-xs focus:outline-none focus:border-cyan-500 resize-y font-mono"
                    placeholder="T(n) = aT(n/b) + O(n^d)&#10;Case 1: d < log_b(a) -> O(n^(log_b a))"
                    value={formFormulas}
                    onChange={(e) => setFormFormulas(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-red-400 mb-1">COMMON TRAPS / MISTAKES (1 PER LINE)</label>
                  <textarea
                    rows={3}
                    className="w-full p-2.5 rounded-lg border border-red-500/20 bg-black/40 text-red-200 text-xs focus:outline-none focus:border-red-500 resize-y font-mono"
                    placeholder="Cannot apply master theorem when b is not constant&#10;Forgetting to check regularity condition"
                    value={formTraps}
                    onChange={(e) => setFormTraps(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-emerald-400 mb-1">SELF-CHECK QUESTIONS / RETENTION CRITERIA (1 PER LINE)</label>
                <textarea
                  rows={3}
                  className="w-full p-2.5 rounded-lg border border-emerald-500/20 bg-black/40 text-emerald-200 text-xs focus:outline-none focus:border-emerald-500 resize-y font-mono"
                  placeholder="Can compute log_b(a) without notes&#10;Can derive recurrence tree in 2 minutes"
                  value={formChecklist}
                  onChange={(e) => setFormChecklist(e.target.value)}
                />
              </div>

              <div className="modal-actions mt-5 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsCreating(false)
                    setIsEditing(false)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="primary-btn bg-amber-600 hover:bg-amber-500 text-white">
                  <Check data-icon="inline-start" /> {isEditing ? 'Save Revision' : 'Add to Sprint'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

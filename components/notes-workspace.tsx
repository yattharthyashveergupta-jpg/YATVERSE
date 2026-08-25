'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Bookmark,
  Check,
  ChevronRight,
  Code2,
  Copy,
  Edit3,
  FileText,
  Pin,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pill } from '@/components/ui/pill'
import { createClient } from '@/utils/supabase/client'

export interface Note {
  id: string
  user_id?: string
  subject_id?: string
  subject_name: string
  topic: string
  title: string
  content: string
  important_points: string[]
  formulas: string[]
  examples: string
  tags: string[]
  is_pinned: boolean
  created_at: string
  updated_at: string
}

const DEFAULT_SEEDED_NOTES: Note[] = [
  {
    id: 'note-dbms-normalization',
    subject_name: 'Database Management Systems',
    topic: 'Normalization & Schema Refinement',
    title: 'Functional Dependencies & Normal Forms (1NF to BCNF)',
    content: `Database normalization minimizes data redundancy and eliminates insertion, update, and deletion anomalies.
Decompositions should be Lossless-Join and ideally Dependency-Preserving.

- 1NF: Atomic attribute domain values (no repeating groups/multivalued attributes).
- 2NF: 1NF + No partial functional dependencies (every non-prime attribute is fully functionally dependent on any candidate key).
- 3NF: 2NF + No transitive functional dependencies (for X -> A, either X is a superkey or A is a prime attribute).
- BCNF (Boyce-Codd NF): For every non-trivial functional dependency X -> A, X must be a superkey.`,
    important_points: [
      'Lossless-Join property is non-negotiable for data integrity.',
      '3NF guarantees dependency preservation; BCNF may not always preserve all functional dependencies.',
      'Armstrong Axioms: Reflexivity (Y ⊆ X ⇒ X → Y), Augmentation (X → Y ⇒ XZ → YZ), Transitivity (X → Y & Y → Z ⇒ X → Z).',
    ],
    formulas: [
      'Closure of Attribute Set: (X)+ with respect to FD set F',
      'Minimal Cover: Canonical set of FDs with single-attribute right hand sides and no extraneous attributes',
      'Lossless Join condition for R1, R2: (R1 ∩ R2) → R1 OR (R1 ∩ R2) → R2',
    ],
    examples: `// Example FD set for StudentEnrollment(StudentID, CourseID, Professor, Grade, ProfOffice):
// { (StudentID, CourseID) -> Grade, Professor -> ProfOffice, CourseID -> Professor }
// Candidate Key: (StudentID, CourseID)
// Violates 3NF due to CourseID -> Professor and Professor -> ProfOffice (Transitive Dependency).
// Decomposition into 3NF:
// R1(StudentID, CourseID, Grade)
// R2(CourseID, Professor)
// R3(Professor, ProfOffice)`,
    tags: ['DBMS', 'Database', 'Normalization', 'Exam-HighYield'],
    is_pinned: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'note-os-process-sync',
    subject_name: 'Operating Systems',
    topic: 'Concurrency & Process Synchronization',
    title: 'Peterson\'s Solution, Semaphores & Deadlock Conditions',
    content: `Process Synchronization coordinates execution of concurrent processes sharing memory space to prevent race conditions.

Critical Section Problem Requirements:
1. Mutual Exclusion: If process Pi is executing in its critical section, no other processes can execute in their critical sections.
2. Progress: If no process is in critical section and some wish to enter, selection cannot be postponed indefinitely.
3. Bounded Waiting: A bound must exist on the number of times other processes can enter before Pi's request is granted.`,
    important_points: [
      'Counting Semaphore (S >= 0) vs Binary Semaphore / Mutex (S ∈ {0, 1}).',
      'Wait(S) / P(S): S--; if (S < 0) { block(); }',
      'Signal(S) / V(S): S++; if (S <= 0) { wakeup(P); }',
      'Coffman Conditions for Deadlock: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.',
    ],
    formulas: [
      'Banker\'s Algorithm Safety Check: Need[i][j] = Max[i][j] - Allocation[i][j]',
      'Work = Available; Finish[i] = false; Find i where Finish[i] == false && Need[i] <= Work',
    ],
    examples: `// Peterson's Solution for 2 Processes (P0, P1):
boolean flag[2] = {false, false};
int turn = 0;

// Process P_i:
flag[i] = true;
turn = j;
while (flag[j] && turn == j) {
  // busy wait
}
// --- CRITICAL SECTION ---
flag[i] = false;
// --- REMAINDER SECTION ---`,
    tags: ['OS', 'Concurrency', 'Semaphores', 'Deadlock'],
    is_pinned: true,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'note-dsa-graph-algorithms',
    subject_name: 'Data Structures & Algorithms',
    topic: 'Graph Theory & Shortest Paths',
    title: 'Dijkstra, Bellman-Ford & Floyd-Warshall Comparison',
    content: `Graph shortest path algorithms differ fundamentally in constraints, time complexity, and support for negative edge weights.

1. Dijkstra: Single-Source Shortest Path (SSSP) on Non-Negative weights. Uses Min-Heap priority queue. O((V + E) log V).
2. Bellman-Ford: SSSP on general weights, detects negative-weight cycles. Relaxes all E edges (V - 1) times. O(V * E).
3. Floyd-Warshall: All-Pairs Shortest Path (APSP) using Dynamic Programming. Matrix relaxation over intermediate vertex k. O(V^3).`,
    important_points: [
      'Dijkstra fails on graphs with negative edge weights because greedy assumption no longer holds.',
      'Bellman-Ford can detect negative cycles if an edge can still be relaxed on the V-th iteration.',
      'Topological Sort + DP achieves O(V + E) for SSSP on Directed Acyclic Graphs (DAGs).',
    ],
    formulas: [
      'Relaxation Step: if (dist[u] + weight(u, v) < dist[v]) { dist[v] = dist[u] + weight(u, v); }',
      'Floyd-Warshall DP Transition: dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])',
    ],
    examples: `// Dijkstra Min-Heap Priority Queue Implementation Pattern
const pq = new MinPriorityQueue();
dist[source] = 0;
pq.enqueue(source, 0);

while (!pq.isEmpty()) {
  const { element: u, priority: d } = pq.dequeue();
  if (d > dist[u]) continue; // Stale heap entry
  
  for (const [v, weight] of adj[u]) {
    if (dist[u] + weight < dist[v]) {
      dist[v] = dist[u] + weight;
      pq.enqueue(v, dist[v]);
    }
  }
}`,
    tags: ['DSA', 'Graphs', 'Dijkstra', 'Algorithms'],
    is_pinned: false,
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
]

export function NotesWorkspace({
  subjects,
  notify,
}: {
  subjects: any[]
  notify: (msg: string) => void
}) {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('All')
  const [selectedTagFilter, setSelectedTagFilter] = useState('All')
  const [userId, setUserId] = useState<string>('local')

  // Form states
  const [formSubject, setFormSubject] = useState('')
  const [formTopic, setFormTopic] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formPoints, setFormPoints] = useState('')
  const [formFormulas, setFormFormulas] = useState('')
  const [formExamples, setFormExamples] = useState('')
  const [formTags, setFormTags] = useState('')
  const [formPinned, setFormPinned] = useState(false)

  // Load User & Saved Notes
  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const currentUid = user?.id || 'local'
      setUserId(currentUid)

      const storageKey = `yatverse_notes_${currentUid}`
      const localData = localStorage.getItem(storageKey)

      if (localData) {
        try {
          const parsed = JSON.parse(localData)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNotes(parsed)
            setSelectedNote(parsed[0])
            return
          }
        } catch (e) {
          console.error('Failed to parse cached notes:', e)
        }
      }

      // Default seed notes
      setNotes(DEFAULT_SEEDED_NOTES)
      setSelectedNote(DEFAULT_SEEDED_NOTES[0])
      localStorage.setItem(storageKey, JSON.stringify(DEFAULT_SEEDED_NOTES))
    }

    void loadData()
  }, [])

  // Sync to local storage
  const persistNotes = (updated: Note[]) => {
    setNotes(updated)
    const storageKey = `yatverse_notes_${userId}`
    localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  // All distinct tags
  const allTags = useMemo(() => {
    const set = new Set<string>()
    notes.forEach((n) => n.tags.forEach((t) => set.add(t)))
    return Array.from(set)
  }, [notes])

  // Filtered notes
  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return notes
      .filter((n) => {
        const matchesQuery =
          !q ||
          n.title.toLowerCase().includes(q) ||
          n.topic.toLowerCase().includes(q) ||
          n.subject_name.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)) ||
          n.formulas.some((f) => f.toLowerCase().includes(q))

        const matchesSubject =
          selectedSubjectFilter === 'All' || n.subject_name === selectedSubjectFilter

        const matchesTag = selectedTagFilter === 'All' || n.tags.includes(selectedTagFilter)

        return matchesQuery && matchesSubject && matchesTag
      })
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })
  }, [notes, searchQuery, selectedSubjectFilter, selectedTagFilter])

  const openCreateModal = () => {
    setFormSubject(subjects[0]?.name || 'Computer Science')
    setFormTopic('')
    setFormTitle('')
    setFormContent('')
    setFormPoints('')
    setFormFormulas('')
    setFormExamples('')
    setFormTags('')
    setFormPinned(false)
    setIsCreating(true)
    setIsEditing(false)
  }

  const openEditModal = (note: Note) => {
    setFormSubject(note.subject_name)
    setFormTopic(note.topic)
    setFormTitle(note.title)
    setFormContent(note.content)
    setFormPoints(note.important_points.join('\n'))
    setFormFormulas(note.formulas.join('\n'))
    setFormExamples(note.examples)
    setFormTags(note.tags.join(', '))
    setFormPinned(note.is_pinned)
    setIsEditing(true)
    setIsCreating(false)
  }

  const handleSaveNote = (e: FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      notify('Please enter a note title.')
      return
    }

    const points = formPoints
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)

    const formulas = formFormulas
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean)

    const tags = formTags
      .split(/[,#\s]+/)
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean)

    if (isEditing && selectedNote) {
      const updated: Note = {
        ...selectedNote,
        subject_name: formSubject.trim() || 'General',
        topic: formTopic.trim() || 'General Concept',
        title: formTitle.trim(),
        content: formContent.trim(),
        important_points: points,
        formulas: formulas,
        examples: formExamples.trim(),
        tags: tags.length ? tags : ['Notes'],
        is_pinned: formPinned,
        updated_at: new Date().toISOString(),
      }

      const nextList = notes.map((n) => (n.id === updated.id ? updated : n))
      persistNotes(nextList)
      setSelectedNote(updated)
      setIsEditing(false)
      notify(`Note "${updated.title}" updated!`)
    } else {
      const newNote: Note = {
        id: `note-${Date.now()}`,
        user_id: userId,
        subject_name: formSubject.trim() || 'General',
        topic: formTopic.trim() || 'General Concept',
        title: formTitle.trim(),
        content: formContent.trim(),
        important_points: points,
        formulas: formulas,
        examples: formExamples.trim(),
        tags: tags.length ? tags : ['Notes'],
        is_pinned: formPinned,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const nextList = [newNote, ...notes]
      persistNotes(nextList)
      setSelectedNote(newNote)
      setIsCreating(false)
      notify(`Note "${newNote.title}" saved to knowledge repository!`)
    }
  }

  const handleDeleteNote = (id: string) => {
    const note = notes.find((n) => n.id === id)
    if (!note) return
    if (!window.confirm(`Delete note "${note.title}"?`)) return

    const nextList = notes.filter((n) => n.id !== id)
    persistNotes(nextList)
    if (selectedNote?.id === id) {
      setSelectedNote(nextList[0] || null)
    }
    notify(`Note "${note.title}" removed.`)
  }

  const togglePin = (id: string) => {
    const nextList = notes.map((n) => (n.id === id ? { ...n, is_pinned: !n.is_pinned } : n))
    persistNotes(nextList)
    if (selectedNote?.id === id) {
      setSelectedNote((prev) => (prev ? { ...prev, is_pinned: !prev.is_pinned } : null))
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="surface panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">KNOWLEDGE REPOSITORY</span>
            <h2>Permanent Subject Notes</h2>
            <p className="muted">
              Structured course notes with key takeaways, mathematical formulas, definitions, and code examples.
            </p>
          </div>
          <Button className="primary-btn" onClick={openCreateModal}>
            <Plus data-icon="inline-start" /> New Note
          </Button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <div className="search-wrap flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-zinc-400" />
            <input
              placeholder="Search notes by title, topic, formula, tag..."
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

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Subject:</span>
            <select
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-black/40 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            >
              <option value="All">All Subjects ({notes.length})</option>
              {Array.from(new Set(notes.map((n) => n.subject_name))).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {allTags.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Tag:</span>
              <select
                className="px-3 py-1.5 rounded-lg border border-white/10 bg-black/40 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                value={selectedTagFilter}
                onChange={(e) => setSelectedTagFilter(e.target.value)}
              >
                <option value="All">All Tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Two-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Note List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex justify-between items-center px-1 text-xs text-zinc-400 font-mono">
            <span>SHOWING {filteredNotes.length} OF {notes.length} NOTES</span>
            {notes.some((n) => n.is_pinned) && <span>📌 PINNED ON TOP</span>}
          </div>

          {filteredNotes.length === 0 ? (
            <div className="surface p-8 rounded-2xl border border-white/5 text-center text-zinc-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-zinc-500" />
              <p className="text-sm">No notes match your filter or search query.</p>
              <Button variant="ghost" size="sm" onClick={openCreateModal} className="mt-3 text-xs text-violet-400">
                + Create first note
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
              {filteredNotes.map((note) => {
                const isSelected = selectedNote?.id === note.id
                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={`surface p-4 rounded-xl border cursor-pointer transition text-left ${
                      isSelected
                        ? 'border-violet-500/50 bg-violet-950/20 shadow-md shadow-violet-950/30'
                        : 'border-white/5 hover:border-white/20 bg-zinc-900/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <Pill tone={isSelected ? 'violet' : 'neutral'} className="text-[11px]">
                        {note.subject_name}
                      </Pill>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          togglePin(note.id)
                        }}
                        className={`p-1 rounded hover:bg-white/10 text-xs transition ${
                          note.is_pinned ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                        title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <strong className={`block text-sm font-semibold mb-1 ${isSelected ? 'text-violet-200' : 'text-white'}`}>
                      {note.title}
                    </strong>

                    <span className="text-xs text-zinc-400 line-clamp-2 mb-2 font-mono">
                      {note.topic}
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {note.tags.slice(0, 3).map((t) => (
                        <span key={t} className="text-[10px] bg-white/5 text-zinc-300 px-1.5 py-0.5 rounded border border-white/5">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Detail Pane: Note Content */}
        <div className="lg:col-span-7">
          {selectedNote ? (
            <div className="surface p-6 rounded-2xl border border-white/10 bg-zinc-900/60 space-y-5">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Pill tone="blue">{selectedNote.subject_name}</Pill>
                    <span className="text-xs text-zinc-400 font-mono">· {selectedNote.topic}</span>
                    {selectedNote.is_pinned && (
                      <span className="text-xs text-amber-400 flex items-center gap-1 bg-amber-400/10 px-2 py-0.5 rounded">
                        <Pin className="w-3 h-3" /> Pinned
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white mt-1">{selectedNote.title}</h3>
                  <small className="text-[11px] text-zinc-500 font-mono">
                    Last updated {new Date(selectedNote.updated_at).toLocaleDateString()}
                  </small>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(selectedNote)}
                    className="text-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteNote(selectedNote.id)}
                    className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Main Content Body */}
              <div>
                <strong className="block text-xs uppercase tracking-wider text-violet-400 font-mono mb-2">
                  Conceptual Overview
                </strong>
                <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line bg-black/30 p-4 rounded-xl border border-white/5">
                  {selectedNote.content}
                </div>
              </div>

              {/* Key Takeaways */}
              {selectedNote.important_points.length > 0 && (
                <div>
                  <strong className="block text-xs uppercase tracking-wider text-emerald-400 font-mono mb-2">
                    Key Takeaways & Core Rules
                  </strong>
                  <ul className="surface p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 text-xs text-zinc-300 space-y-2 list-disc list-inside">
                    {selectedNote.important_points.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Formulas & Mathematical Definitions */}
              {selectedNote.formulas.length > 0 && (
                <div>
                  <strong className="block text-xs uppercase tracking-wider text-amber-400 font-mono mb-2">
                    Formulas & Mathematical Definitions
                  </strong>
                  <div className="surface p-4 rounded-xl border border-amber-500/20 bg-amber-950/10 space-y-1.5">
                    {selectedNote.formulas.map((f, i) => (
                      <div key={i} className="font-mono text-xs text-amber-200 bg-black/40 p-2 rounded border border-white/5">
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Examples / Code Snippets */}
              {selectedNote.examples && (
                <div>
                  <strong className="block text-xs uppercase tracking-wider text-cyan-400 font-mono mb-2">
                    Concrete Examples / Code Implementation
                  </strong>
                  <pre className="surface p-4 rounded-xl border border-white/10 bg-black/70 text-xs text-cyan-200 font-mono overflow-x-auto">
                    <code>{selectedNote.examples}</code>
                  </pre>
                </div>
              )}

              {/* Tags footer */}
              <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-white/10">
                <Tag className="w-3.5 h-3.5 text-zinc-500" />
                {selectedNote.tags.map((t) => (
                  <span
                    key={t}
                    onClick={() => setSelectedTagFilter(t)}
                    className="text-xs bg-white/5 hover:bg-violet-500/20 text-zinc-300 hover:text-violet-300 px-2 py-0.5 rounded cursor-pointer transition border border-white/5"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="surface p-12 rounded-2xl border border-white/5 text-center text-zinc-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
              <p className="text-base font-semibold text-white">Select a note or create one</p>
              <p className="text-xs text-zinc-400 mt-1">
                Your notes are permanently organized by subject and topic.
              </p>
              <Button className="primary-btn mt-4" onClick={openCreateModal}>
                <Plus data-icon="inline-start" /> Create New Note
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Note Editor Modal */}
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
            <div className="eyebrow accent">{isEditing ? 'EDIT NOTE' : 'NEW PERMANENT NOTE'}</div>
            <h2>{isEditing ? 'Update Note' : 'Create Knowledge Note'}</h2>
            <p className="muted">
              Add structured knowledge, definitions, formulas, and examples for long-term reference.
            </p>

            <form onSubmit={handleSaveNote} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">SUBJECT</label>
                  <input
                    type="text"
                    required
                    list="subjects-list"
                    className="w-full p-2.5 rounded-lg border border-white/10 bg-black/40 text-white text-xs focus:outline-none focus:border-violet-500"
                    placeholder="e.g. Operating Systems"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                  />
                  <datalist id="subjects-list">
                    {subjects.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">TOPIC / MODULE</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2.5 rounded-lg border border-white/10 bg-black/40 text-white text-xs focus:outline-none focus:border-violet-500"
                    placeholder="e.g. Memory Management & Paging"
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">NOTE TITLE</label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 rounded-lg border border-white/10 bg-black/40 text-white text-xs focus:outline-none focus:border-violet-500 font-semibold"
                  placeholder="e.g. Virtual Memory, TLB Hit Ratios & Page Replacement"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">CONCEPTUAL OVERVIEW / BODY</label>
                <textarea
                  rows={5}
                  required
                  className="w-full p-2.5 rounded-lg border border-white/10 bg-black/40 text-white text-xs focus:outline-none focus:border-violet-500 resize-y"
                  placeholder="Write clear, comprehensive explanation of the concepts, theorems, and structural rules..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-emerald-400 mb-1">KEY TAKEAWAYS (1 PER LINE)</label>
                  <textarea
                    rows={3}
                    className="w-full p-2.5 rounded-lg border border-emerald-500/20 bg-black/40 text-white text-xs focus:outline-none focus:border-emerald-500 resize-y font-mono"
                    placeholder="Atomic operations prevent race conditions&#10;TLB hit ratio directly determines Effective Access Time"
                    value={formPoints}
                    onChange={(e) => setFormPoints(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-amber-400 mb-1">FORMULAS / DEFINITIONS (1 PER LINE)</label>
                  <textarea
                    rows={3}
                    className="w-full p-2.5 rounded-lg border border-amber-500/20 bg-black/40 text-white text-xs focus:outline-none focus:border-amber-500 resize-y font-mono"
                    placeholder="EAT = h * (t_tlb + t_mem) + (1 - h) * (t_tlb + 2*t_mem)&#10;Page Fault Rate p <= (Target - EAT) / Overhead"
                    value={formFormulas}
                    onChange={(e) => setFormFormulas(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-cyan-400 mb-1">EXAMPLES / CODE SNIPPET (OPTIONAL)</label>
                <textarea
                  rows={4}
                  className="w-full p-2.5 rounded-lg border border-white/10 bg-black/40 text-cyan-200 text-xs font-mono focus:outline-none focus:border-cyan-500 resize-y"
                  placeholder="// Code example or step-by-step mathematical derivation"
                  value={formExamples}
                  onChange={(e) => setFormExamples(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">TAGS (COMMA SEPARATED)</label>
                  <input
                    type="text"
                    className="w-full p-2.5 rounded-lg border border-white/10 bg-black/40 text-white text-xs focus:outline-none focus:border-violet-500"
                    placeholder="OS, VirtualMemory, ExamReady"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="pin-check"
                    checked={formPinned}
                    onChange={(e) => setFormPinned(e.target.checked)}
                    className="rounded border-white/20 bg-black text-violet-500 focus:ring-violet-500"
                  />
                  <label htmlFor="pin-check" className="text-xs text-zinc-300 cursor-pointer">
                    Pin note to top of repository
                  </label>
                </div>
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
                <Button type="submit" className="primary-btn">
                  <Check data-icon="inline-start" /> {isEditing ? 'Save Changes' : 'Save Note'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

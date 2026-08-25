'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FolderGit2, Plus, Search, Sparkles, ExternalLink, GitBranch, Trash2, Pencil, Check,
  X, AlertTriangle, CheckCircle2, ArrowRight, Code2, Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'

export type ProjectItem = {
  id: string
  user_id: string
  name: string
  desc: string
  stack: string
  status: 'Idea' | 'In Progress' | 'Completed' | 'Published'
  github?: string | null
  live_url?: string | null
  created_at: string
  updated_at: string
}

export type ProjectInput = {
  name: string
  desc: string
  stack: string
  status?: 'Idea' | 'In Progress' | 'Completed' | 'Published'
  github?: string | null
  live_url?: string | null
}

const DEFAULT_PROJECT_SEEDS: Omit<ProjectItem, 'user_id' | 'created_at' | 'updated_at'>[] = [
  {
    id: 'seed-1',
    name: 'YATVERSE Student OS',
    desc: 'Full-stack AI-powered operating system for engineering students with ML task prediction and syllabus extraction.',
    stack: 'Next.js 15, TypeScript, Supabase, Gemini AI, Tailwind CSS',
    status: 'In Progress',
    github: 'https://github.com',
    live_url: '',
  },
  {
    id: 'seed-2',
    name: 'Distributed Key-Value Store',
    desc: 'High-throughput Raft consensus based in-memory storage engine with snapshotting and dynamic cluster rebalancing.',
    stack: 'Go, gRPC, Docker, Protocol Buffers',
    status: 'Completed',
    github: 'https://github.com',
    live_url: '',
  },
  {
    id: 'seed-3',
    name: 'Neural Network Compiler & AST Optimizer',
    desc: 'Custom tensor graph optimizer, memory arena allocator, and fused convolution kernel code generator.',
    stack: 'C++, LLVM, Python, CUDA',
    status: 'Idea',
    github: '',
    live_url: '',
  },
]

function getLocalProjectsKey(userId: string) {
  return `yatverse_projects_${userId}`
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectItem[]>([])
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
      console.error('Projects load failed: user unavailable.', userError)
      setError('We could not verify your session.')
      setLoading(false)
      return
    }

    try {
      // Attempt to load from Supabase projects table
      const { data, error: sbError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (sbError) {
        // If table doesn't exist yet in remote Supabase, fallback to user-scoped localStorage
        console.warn('Supabase projects table query returned notice, using local cache:', sbError.message)
        const cached = localStorage.getItem(getLocalProjectsKey(user.id))
        if (cached) {
          try {
            setProjects(JSON.parse(cached))
          } catch {
            setProjects(DEFAULT_PROJECT_SEEDS.map(p => ({
              ...p,
              user_id: user.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })))
          }
        } else {
          const initial = DEFAULT_PROJECT_SEEDS.map(p => ({
            ...p,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))
          setProjects(initial)
          localStorage.setItem(getLocalProjectsKey(user.id), JSON.stringify(initial))
        }
      } else if (data && data.length > 0) {
        // Map database columns if naming varies
        const mapped: ProjectItem[] = data.map((d: any) => ({
          id: d.id,
          user_id: d.user_id,
          name: d.name || d.title || 'Untitled Project',
          desc: d.desc || d.description || '',
          stack: d.stack || d.tech_stack || '',
          status: d.status || 'In Progress',
          github: d.github || d.repository_url || '',
          live_url: d.live_url || '',
          created_at: d.created_at || new Date().toISOString(),
          updated_at: d.updated_at || new Date().toISOString(),
        }))
        setProjects(mapped)
        localStorage.setItem(getLocalProjectsKey(user.id), JSON.stringify(mapped))
      } else {
        // Table exists but user has 0 projects, check local cache or initialize seeds
        const cached = localStorage.getItem(getLocalProjectsKey(user.id))
        if (cached) {
          try {
            setProjects(JSON.parse(cached))
          } catch {
            setProjects([])
          }
        } else {
          const initial = DEFAULT_PROJECT_SEEDS.map(p => ({
            ...p,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))
          setProjects(initial)
          localStorage.setItem(getLocalProjectsKey(user.id), JSON.stringify(initial))
        }
      }
    } catch (err: any) {
      console.error('Projects initialization error:', err)
      setError('Could not load portfolio projects.')
    } finally {
      setLoading(false)
    }
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

  const createProject = (input: ProjectInput) =>
    run(async () => {
      const { supabase, userId } = await authenticatedClient()
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `proj-${Date.now()}`
      const now = new Date().toISOString()

      const newProject: ProjectItem = {
        id: newId,
        user_id: userId,
        name: input.name.trim(),
        desc: input.desc.trim() || 'Applied engineering project.',
        stack: input.stack.trim() || 'TypeScript, React',
        status: input.status || 'In Progress',
        github: input.github?.trim() || null,
        live_url: input.live_url?.trim() || null,
        created_at: now,
        updated_at: now,
      }

      // Try inserting into Supabase
      try {
        const { data, error } = await supabase
          .from('projects')
          .insert({
            id: newId,
            user_id: userId,
            title: newProject.name,
            name: newProject.name,
            description: newProject.desc,
            desc: newProject.desc,
            tech_stack: newProject.stack,
            stack: newProject.stack,
            status: newProject.status,
            repository_url: newProject.github,
            github: newProject.github,
            live_url: newProject.live_url,
            created_at: now,
            updated_at: now,
          })
          .select('*')
          .maybeSingle()

        if (!error && data) {
          newProject.id = data.id
        }
      } catch (sbErr) {
        console.warn('Supabase projects insert notice (local persistence active):', sbErr)
      }

      // Update state and user-scoped storage
      setProjects((current) => {
        const next = [newProject, ...current]
        localStorage.setItem(getLocalProjectsKey(userId), JSON.stringify(next))
        return next
      })

      return newProject
    })

  const updateProject = (id: string, input: Partial<ProjectInput>) =>
    run(async () => {
      const { supabase, userId } = await authenticatedClient()
      const now = new Date().toISOString()

      try {
        await supabase
          .from('projects')
          .update({
            ...(input.name !== undefined ? { name: input.name.trim(), title: input.name.trim() } : {}),
            ...(input.desc !== undefined ? { desc: input.desc.trim(), description: input.desc.trim() } : {}),
            ...(input.stack !== undefined ? { stack: input.stack.trim(), tech_stack: input.stack.trim() } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.github !== undefined ? { github: input.github?.trim() || null, repository_url: input.github?.trim() || null } : {}),
            ...(input.live_url !== undefined ? { live_url: input.live_url?.trim() || null } : {}),
            updated_at: now,
          })
          .eq('id', id)
          .eq('user_id', userId)
      } catch (sbErr) {
        console.warn('Supabase projects update notice:', sbErr)
      }

      setProjects((current) => {
        const next = current.map((p) => {
          if (p.id === id) {
            return {
              ...p,
              ...input,
              name: input.name !== undefined ? input.name.trim() : p.name,
              desc: input.desc !== undefined ? input.desc.trim() : p.desc,
              stack: input.stack !== undefined ? input.stack.trim() : p.stack,
              updated_at: now,
            }
          }
          return p
        })
        localStorage.setItem(getLocalProjectsKey(userId), JSON.stringify(next))
        return next
      })
    })

  const deleteProject = (id: string) =>
    run(async () => {
      const { supabase, userId } = await authenticatedClient()

      try {
        await supabase
          .from('projects')
          .delete()
          .eq('id', id)
          .eq('user_id', userId)
      } catch (sbErr) {
        console.warn('Supabase projects delete notice:', sbErr)
      }

      setProjects((current) => {
        const next = current.filter((p) => p.id !== id)
        localStorage.setItem(getLocalProjectsKey(userId), JSON.stringify(next))
        return next
      })
    })

  return {
    projects,
    loading,
    error,
    busy,
    createProject,
    updateProject,
    deleteProject,
    refresh: load,
  }
}

export function ProjectsWorkspace({ notify }: { notify: (msg: string) => void }) {
  const { projects, loading, error, busy, createProject, updateProject, deleteProject } = useProjects()
  const [showAdd, setShowAdd] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null)
  const [statusFilter, setStatusFilter] = useState<'All' | 'Idea' | 'In Progress' | 'Completed' | 'Published'>('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Form State
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [stack, setStack] = useState('')
  const [status, setStatus] = useState<'Idea' | 'In Progress' | 'Completed' | 'Published'>('In Progress')
  const [github, setGithub] = useState('')
  const [liveUrl, setLiveUrl] = useState('')

  const openAdd = () => {
    setName('')
    setDesc('')
    setStack('')
    setStatus('In Progress')
    setGithub('')
    setLiveUrl('')
    setEditingProject(null)
    setShowAdd(true)
  }

  const openEdit = (proj: ProjectItem) => {
    setEditingProject(proj)
    setName(proj.name)
    setDesc(proj.desc)
    setStack(proj.stack)
    setStatus(proj.status)
    setGithub(proj.github || '')
    setLiveUrl(proj.live_url || '')
    setShowAdd(true)
  }

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      if (editingProject) {
        await updateProject(editingProject.id, {
          name,
          desc,
          stack,
          status,
          github: github || null,
          live_url: liveUrl || null,
        })
        notify(`Updated "${name.trim()}".`)
      } else {
        await createProject({
          name,
          desc,
          stack,
          status,
          github: github || null,
          live_url: liveUrl || null,
        })
        notify(`Added "${name.trim()}" to portfolio tracker.`)
      }
      setShowAdd(false)
      setEditingProject(null)
    } catch (err: any) {
      console.error('Project save error:', err)
      notify(err.message || 'Could not save project.')
    }
  }

  const handleDelete = async (proj: ProjectItem) => {
    if (!window.confirm(`Delete project "${proj.name}"?`)) return
    try {
      await deleteProject(proj.id)
      notify(`Project "${proj.name}" deleted.`)
    } catch (err: any) {
      notify(err.message || 'Could not delete project.')
    }
  }

  const filteredProjects = useMemo(() => {
    return projects.filter((proj) => {
      const matchStatus = statusFilter === 'All' || proj.status === statusFilter
      const q = searchQuery.toLowerCase().trim()
      const matchQuery = !q || proj.name.toLowerCase().includes(q) || proj.desc.toLowerCase().includes(q) || proj.stack.toLowerCase().includes(q)
      return matchStatus && matchQuery
    })
  }, [projects, statusFilter, searchQuery])

  return (
    <>
      <div className="surface panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">PROOF OF WORK</span>
            <h2>Portfolio & Capstone Projects</h2>
            <p className="muted">Build, persist, and showcase high-impact engineering projects for recruiters.</p>
          </div>
          <Button className="primary-btn" onClick={openAdd} disabled={busy}>
            <Plus data-icon="inline-start" /> Add Project
          </Button>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-white/5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {(['All', 'In Progress', 'Completed', 'Idea', 'Published'] as const).map((filter) => (
              <button
                key={filter}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  statusFilter === filter
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
                onClick={() => setStatusFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="search-wrap min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <input
              placeholder="Search projects or tech..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs"
            />
            {searchQuery && (
              <button className="text-xs text-zinc-400 hover:text-white px-1" onClick={() => setSearchQuery('')}>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-400 text-sm">
            <Sparkles className="w-5 h-5 animate-spin mx-auto mb-2 text-violet-400" />
            Loading your portfolio projects...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="empty-state my-6">
            <FolderGit2 className="w-8 h-8 text-zinc-500 mb-2" />
            <strong>{searchQuery ? 'No matching projects found' : 'No projects logged yet'}</strong>
            <span className="text-xs text-zinc-400 max-w-md">
              {searchQuery ? 'Try adjusting your search keywords.' : 'Add your first full-stack, ML, or systems project to demonstrate your proof of work.'}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
            {filteredProjects.map((proj) => {
              const statusTone =
                proj.status === 'Completed'
                  ? 'emerald'
                  : proj.status === 'In Progress'
                  ? 'violet'
                  : proj.status === 'Published'
                  ? 'cyan'
                  : 'amber'

              return (
                <div key={proj.id} className="surface p-4 rounded-xl border border-white/5 hover:border-violet-500/30 transition flex flex-col justify-between group">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`pill pill-${statusTone} text-xs font-medium`}>{proj.status}</span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-zinc-400 hover:text-white"
                          onClick={() => openEdit(proj)}
                          aria-label={`Edit ${proj.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-zinc-400 hover:text-red-400"
                          onClick={() => handleDelete(proj)}
                          aria-label={`Delete ${proj.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <strong className="block text-base text-white mb-1.5">{proj.name}</strong>
                    <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{proj.desc}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 mb-3 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
                      <Tag className="w-3 h-3 text-violet-400 shrink-0" />
                      <span className="truncate">{proj.stack}</span>
                    </div>

                    <div className="flex gap-2">
                      {proj.github ? (
                        <a
                          href={proj.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-zinc-200 transition"
                        >
                          <GitBranch className="w-3.5 h-3.5" />
                          <span>Code</span>
                        </a>
                      ) : (
                        <button
                          onClick={() => openEdit(proj)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-white/10 hover:border-violet-500/40 text-xs text-zinc-400 hover:text-zinc-200 transition"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Repo</span>
                        </button>
                      )}

                      {proj.live_url && (
                        <a
                          href={proj.live_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-xs text-violet-300 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Demo</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Project Modal */}
      {showAdd && (
        <div className="modal-backdrop">
          <div className="modal surface">
            <button className="modal-close" onClick={() => setShowAdd(false)} aria-label="Close modal">
              <X />
            </button>
            <div className="eyebrow accent">{editingProject ? 'EDIT PROJECT' : 'NEW PROJECT'}</div>
            <h2>{editingProject ? 'Edit Project Details' : 'Add Project to Portfolio'}</h2>
            <p className="muted">Persisted securely in your YATVERSE workspace.</p>

            <form onSubmit={handleFormSubmit} className="mt-4">
              <div className="form-grid">
                <label className="field-wide">
                  Project Title *
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Distributed Consensus Engine"
                    required
                  />
                </label>

                <label>
                  Current Status
                  <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                    <option value="Idea">Idea</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Published">Published</option>
                  </select>
                </label>

                <label>
                  Tech Stack
                  <input
                    value={stack}
                    onChange={(e) => setStack(e.target.value)}
                    placeholder="e.g. Next.js, Python, PostgreSQL"
                  />
                </label>

                <label className="field-wide">
                  Repository URL
                  <input
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="https://github.com/username/project"
                  />
                </label>

                <label className="field-wide">
                  Live Preview / Demo URL (Optional)
                  <input
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                    placeholder="https://my-app.vercel.app"
                  />
                </label>

                <label className="field-wide">
                  Description & Impact
                  <textarea
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white outline-none focus:border-violet-400"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Describe problem solved, architecture patterns, and technical results..."
                    rows={3}
                  />
                </label>
              </div>

              <div className="modal-footer mt-5">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="primary-btn" disabled={busy || !name.trim()}>
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  FileUp,
  ListChecks,
  Plus,
  Sparkles,
  Upload,
  X,
  Clock,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pill } from '@/components/ui/pill'
import { Progress } from '@/components/ui/progress'

export interface SyllabusWorkspaceProps {
  academic: any
  notify: (msg: string) => void
  onOpenSubject: (subject: any) => void
}

export function SyllabusWorkspace({
  academic,
  notify,
  onOpenSubject,
}: SyllabusWorkspaceProps) {
  const [extracting, setExtracting] = useState(false)
  const [extractProgress, setExtractProgress] = useState('')
  const [extractedData, setExtractedData] = useState<any>(null)
  const [error, setError] = useState('')
  const [manualText, setManualText] = useState('')
  const [showManualModal, setShowManualModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    if (!file) return

    // 1. Client-side File Validation
    const fileName = file.name.toLowerCase()
    const isSupported =
      fileName.endsWith('.pdf') ||
      fileName.endsWith('.txt') ||
      fileName.endsWith('.md') ||
      file.type.startsWith('image/') ||
      file.type === 'application/pdf'

    if (!isSupported) {
      setError(`Unsupported file format "${file.name}". Please upload a PDF (.pdf), document (.txt, .md), or syllabus image.`)
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(`File "${file.name}" exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller file.`)
      return
    }

    setExtracting(true)
    setExtractProgress('Uploading document...')
    setError('')
    setSelectedFile(file)

    const formData = new FormData()
    formData.append('file', file)

    // Abort controller with 25-second safeguard timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 25000)

    try {
      setExtractProgress('Analyzing curriculum with AI & extracting structured units...')
      const res = await fetch('/api/syllabus/extract', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      let data: any = {}
      try {
        data = await res.json()
      } catch (jsonErr) {
        throw new Error(`Server returned status ${res.status}: Failed to read response.`)
      }

      if (!res.ok) {
        throw new Error(data.error || `Syllabus extraction failed with code ${res.status}`)
      }

      if (data.syllabus && data.syllabus.units && Array.isArray(data.syllabus.units)) {
        setExtractedData(data.syllabus)
        notify(`Syllabus extracted: ${data.syllabus.courseTitle || 'Course Curriculum'}`)
      } else {
        throw new Error('Could not parse units from the uploaded document. Please check the file or paste syllabus text.')
      }
    } catch (err: any) {
      clearTimeout(timeoutId)
      console.error('Extraction error:', err)
      if (err.name === 'AbortError') {
        setError('Extraction timed out after 25s. The server is busy or the file was too complex. Try pasting text directly.')
      } else {
        setError(err.message || 'Could not parse syllabus file. Please try again or paste syllabus text.')
      }
    } finally {
      setExtracting(false)
      setExtractProgress('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleManualExtract = async () => {
    if (!manualText.trim()) {
      setError('Please paste syllabus or curriculum text before extracting.')
      return
    }

    setExtracting(true)
    setExtractProgress('Parsing syllabus text & extracting course structure...')
    setError('')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

    try {
      const res = await fetch('/api/syllabus/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: manualText.trim() }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      let data: any = {}
      try {
        data = await res.json()
      } catch (jsonErr) {
        throw new Error(`Server returned status ${res.status}: Failed to read response.`)
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract syllabus from text.')
      }

      if (data.syllabus && data.syllabus.units && Array.isArray(data.syllabus.units)) {
        setExtractedData(data.syllabus)
        setShowManualModal(false)
        setManualText('')
        notify(`Syllabus parsed: ${data.syllabus.courseTitle || 'Course Curriculum'}`)
      } else {
        throw new Error('No structured units could be derived. Please add more syllabus details.')
      }
    } catch (err: any) {
      clearTimeout(timeoutId)
      console.error('Manual extract error:', err)
      if (err.name === 'AbortError') {
        setError('Extraction timed out after 20s. Please try again with shorter text.')
      } else {
        setError(err.message || 'Could not parse syllabus text.')
      }
    } finally {
      setExtracting(false)
      setExtractProgress('')
    }
  }

  const importToAcademicCore = async () => {
    if (!extractedData || importing) return
    setImporting(true)

    try {
      // 1. Create Subject
      const createdSubject = await academic.createSubject({
        name: extractedData.courseTitle || 'New Subject',
        code: extractedData.courseCode || null,
        credits: extractedData.credits || 4,
        teacher: null,
        progress: 0,
        status: 'active',
      })

      // 2. Create tasks for extracted units
      if (extractedData.units && Array.isArray(extractedData.units)) {
        for (const unit of extractedData.units.slice(0, 8)) {
          const title = unit.title || `Unit ${unit.unitNumber}`
          const desc = unit.topics?.length ? `Topics: ${unit.topics.join(', ')}` : undefined
          await academic.createTask({
            subject_id: createdSubject.id,
            title: `Study ${title}`,
            description: desc,
            task_type: 'study',
            duration_minutes: (unit.estimatedHours || 2) * 45,
            scheduled_date: new Date(Date.now() + 86400000 * (unit.unitNumber || 1))
              .toISOString()
              .slice(0, 10),
          })
        }
      }

      notify(
        `Imported "${createdSubject.name}" and ${extractedData.units?.length || 0} unit tasks to Academic Core!`
      )
      setExtractedData(null)
    } catch (err: any) {
      console.error('Import error:', err)
      notify('Failed to import into academic workspace.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.txt,.md,.doc,.docx,image/*,application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFileUpload(file)
        }}
      />

      <div className="surface panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">SYLLABUS INTELLIGENCE</span>
            <h2>Turn your syllabus into an actionable plan.</h2>
            <p className="muted">
              Upload your syllabus as a PDF, document, or image. YATVERSE extracts course units, topics, and estimated hours to auto-schedule your study plan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div
            className="p-6 rounded-2xl border border-violet-500/30 bg-violet-950/20 hover:border-violet-500/60 transition cursor-pointer flex flex-col items-center justify-center text-center group"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-110 transition mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <strong className="text-base text-white">Upload Syllabus</strong>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">
              Upload your syllabus as a PDF, document (.pdf, .txt, .md, .docx), or image (.png, .jpg, .jpeg).
            </p>
            <Button
              className="primary-btn mt-4 text-xs h-9"
              disabled={extracting}
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
            >
              <FileUp data-icon="inline-start" /> {extracting ? 'Extracting…' : 'Choose Syllabus File'}
            </Button>
          </div>

          <div
            className="p-6 rounded-2xl border border-white/10 bg-black/30 hover:border-white/20 transition cursor-pointer flex flex-col items-center justify-center text-center group"
            onClick={() => setShowManualModal(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setShowManualModal(true)}
          >
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-zinc-300 group-hover:scale-110 transition mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <strong className="text-base text-white">Paste Syllabus Text</strong>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">
              Have course text or unit outlines copied? Paste them directly for rapid AI structuring.
            </p>
            <Button
              variant="outline"
              className="mt-4 text-xs h-9"
              disabled={extracting}
              onClick={(e) => {
                e.stopPropagation()
                setShowManualModal(true)
              }}
            >
              <Plus data-icon="inline-start" /> Paste Syllabus Text
            </Button>
          </div>
        </div>

        {extracting && (
          <div className="surface p-4 rounded-xl border border-violet-500/40 bg-violet-950/20 mt-4 flex items-center gap-3 animate-pulse">
            <Sparkles className="w-5 h-5 text-violet-400 animate-spin" />
            <div>
              <strong className="block text-sm text-white">
                {extractProgress || 'AI Syllabus Extraction in Progress…'}
              </strong>
              <span className="text-xs text-zinc-400">
                Detecting course title, credits, unit modules, and high-yield exam topics.
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="surface p-4 rounded-xl border border-red-500/40 bg-red-500/10 mt-4 flex items-center justify-between gap-3 text-red-400 text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError('')} className="text-xs text-red-300 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Extracted Syllabus Confirmation Card */}
        {extractedData && (
          <div className="surface p-5 rounded-2xl border border-violet-500/40 bg-violet-950/20 mt-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <Pill tone="violet">
                  {extractedData.courseCode || 'COURSE'} · {extractedData.credits || 4} CREDITS · {extractedData.source === 'gemini' ? 'AI EXTRACTED' : 'HEURISTIC PARSER'}
                </Pill>
                <h3 className="text-xl font-bold text-white mt-1.5">
                  {extractedData.courseTitle || 'Extracted Course Curriculum'}
                </h3>
                <p className="text-xs text-zinc-300 mt-1 max-w-2xl">{extractedData.rawSummary}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setExtractedData(null)} disabled={importing}>
                  Dismiss
                </Button>
                <Button className="primary-btn" onClick={importToAcademicCore} disabled={importing}>
                  <CheckCircle2 data-icon="inline-start" /> {importing ? 'Importing…' : 'Import to Academic Core'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {extractedData.units?.map((unit: any) => (
                <div
                  key={unit.unitNumber}
                  className="surface p-3.5 rounded-xl border border-white/10 bg-black/40"
                >
                  <div className="flex justify-between items-center mb-2">
                    <strong className="text-sm text-violet-300">
                      {unit.title || `Unit ${unit.unitNumber}`}
                    </strong>
                    <span className="text-[11px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded">
                      ~{unit.estimatedHours || 8} hrs
                    </span>
                  </div>
                  <ul className="text-xs text-zinc-300 space-y-1 list-disc list-inside">
                    {unit.topics?.slice(0, 5).map((t: string, i: number) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Manual Paste Syllabus Modal */}
      {showManualModal && (
        <div className="modal-backdrop">
          <div className="modal surface max-w-2xl w-full">
            <button
              className="modal-close"
              onClick={() => setShowManualModal(false)}
              aria-label="Close modal"
            >
              <X />
            </button>
            <div className="eyebrow accent">CURRICULUM INGESTION</div>
            <h2>Paste Course Syllabus Text</h2>
            <p className="muted">
              Paste your course outline, unit headings, or university syllabus text below.
            </p>
            <textarea
              className="w-full h-56 p-3.5 mt-3 rounded-xl border border-white/10 bg-black/50 text-white font-mono text-xs focus:outline-none focus:border-violet-500 transition resize-y"
              placeholder={`Example:
Course: CS-301 Operating Systems
Credits: 4

Unit 1: Process Management & CPU Scheduling
- Process states and PCB
- Scheduling algorithms (FCFS, SJF, Round Robin)

Unit 2: Memory Management & Virtual Memory
- Paging and segmentation
- Page replacement (LRU, Optimal)
- Thrashing`}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
            />
            <div className="modal-actions mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowManualModal(false)}>
                Cancel
              </Button>
              <Button className="primary-btn" onClick={handleManualExtract} disabled={extracting}>
                <Sparkles data-icon="inline-start" /> {extracting ? 'Extracting…' : 'Extract Syllabus Units'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

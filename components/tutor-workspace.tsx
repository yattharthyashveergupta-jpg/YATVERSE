'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  Copy,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Send,
  Sparkles,
  Target,
  Trash2,
  User,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pill } from '@/components/ui/pill'

export interface TutorWorkspaceProps {
  language: 'English' | 'Hinglish'
  setLanguage: (lang: 'English' | 'Hinglish') => void
  profile: any
  subjects: any[]
  tasks: any[]
  skills: any[]
}

interface ChatMessage {
  id: string
  from: 'user' | 'ai'
  text: string
  timestamp: string
  source?: string
  actionSuggestions?: string[]
}

export function TutorWorkspace({
  language,
  setLanguage,
  profile,
  subjects = [],
  tasks = [],
  skills = [],
}: TutorWorkspaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showContextDetails, setShowContextDetails] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const studentName = profile?.name || profile?.full_name || 'Student'
  const targetRole = profile?.role || profile?.career_goal || 'Software Engineer'
  const semester = profile?.semester ? `Semester ${profile?.semester}` : 'College'
  const branch = profile?.branch || 'Engineering'

  // Initial welcome message configured to student's live context
  useEffect(() => {
    if (messages.length === 0) {
      const isHinglish = language === 'Hinglish'
      const welcomeText = isHinglish
        ? `Namaste ${studentName}! Main hoon YAT, aapka personal 24/7 AI Tutor.

Main aapke **${semester} (${branch})** ke enrolled subjects (${subjects.length ? subjects.map((s) => s.name).slice(0, 3).join(', ') : 'CS Core'}) aur target goal **${targetRole}** se fully connected hoon.

Aap mujhse koi bhi academic question pooch sakte ho:
- **Concept Deep-Dive:** Kisi bhi theory ya mathematics concept ko intuition aur visualization ke saath samjho.
- **Code Debugging:** Apna code paste karo, main error find karke fix aur runtime optimize karunga.
- **Exam Preparation:** High-yield questions, Master Theorem, B+ Trees, OS Semaphores, ya numericals.
- **Career & Interview Prep:** ${targetRole} ke technical rounds ke real questions solve karo.

Aap kya explore karna chahte ho aaj?`
        : `Hello ${studentName}! I am YAT, your personal 24/7 AI Academic Tutor.

I have full contextual awareness of your **${semester} (${branch})** coursework (${subjects.length ? subjects.map((s) => s.name).slice(0, 3).join(', ') : 'CS Core'}) and your target career milestone: **${targetRole}**.

Feel free to ask **any educational question without restrictions**:
- **Concept Breakdown:** Step-by-step mathematical & intuitive derivations with real-world analogies.
- **Code Debugging & Optimization:** Paste your code in any language for instant bug diagnosis and Big-O analysis.
- **Exam Sprints:** High-yield exam pitfalls, formula sheets, and numerical problem solving.
- **Technical Placement Prep:** System design, core CS fundamentals, and algorithms tailored to ${targetRole}.

What would you like to master today?`

      setMessages([
        {
          id: 'welcome-msg',
          from: 'ai',
          text: welcomeText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'Gemini AI Tutor',
          actionSuggestions: [
            'Explain Dijkstra vs Bellman-Ford intuitively',
            `What skills should I learn first for ${targetRole}?`,
            'How to calculate B+ Tree height given block size?',
            'Give me a 15-minute quick revision on OS Deadlocks',
          ],
        },
      ])
    }
  }, [studentName, semester, branch, targetRole, language, subjects])

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage.trim()
    if (!textToSend || loading) return

    const userMsgId = `user-${Date.now()}`
    const userMsg: ChatMessage = {
      id: userMsgId,
      from: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!customText) setInputMessage('')
    setLoading(true)
    setError('')

    const historyPayload = messages.slice(-8).map((m) => ({
      from: m.from,
      text: m.text,
    }))

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)

    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          language,
          history: historyPayload,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || `Tutor API responded with status ${res.status}`)
      }

      const data = await res.json()
      const reply = data.reply || 'I am ready to help you with your next academic question.'

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        from: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: data.source || 'Gemini 3.7 Flash',
      }

      setMessages((prev) => [...prev, aiMsg])
    } catch (err: any) {
      clearTimeout(timeoutId)
      console.error('Tutor error:', err)
      if (err.name === 'AbortError') {
        setError('Tutor response timed out after 25s. The server is under high load. Please try again.')
      } else {
        setError(err.message || 'Unable to connect to AI Tutor. Please try again.')
      }

      // Add fallback error message
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          from: 'ai',
          text: `⚠️ **Connection Issue**: ${err.message || 'I could not complete your request at this moment.'}\n\nPlease click retry or rephrase your question.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'System Fallback',
        },
      ])
    } finally {
      setLoading(false)
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const clearChat = () => {
    if (window.confirm('Clear current tutor conversation history?')) {
      setMessages([])
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[580px] max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="surface p-4 rounded-xl border border-white/5 mb-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 shadow-inner">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">YAT AI Academic Tutor</h2>
              <Pill tone="violet" className="text-[10px] uppercase font-mono">
                Unrestricted 24/7 AI
              </Pill>
            </div>
            <p className="text-xs text-zinc-400">
              Personalized with your syllabus, {subjects.length} subjects & {targetRole} target
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <div className="flex items-center bg-zinc-900/90 border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setLanguage('English')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                language === 'English'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('Hinglish')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                language === 'Hinglish'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Hinglish
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowContextDetails(!showContextDetails)}
            className="text-xs text-zinc-300 border border-white/5 hover:bg-white/5"
          >
            <GraduationCap className="w-3.5 h-3.5 mr-1 text-violet-400" />
            Context
            {showContextDetails ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            disabled={messages.length <= 1}
            className="text-xs text-zinc-400 hover:text-red-400 hover:bg-red-950/20"
            title="Clear Chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Expandable Live Context Drawer */}
      {showContextDetails && (
        <div className="surface p-3.5 rounded-xl border border-violet-500/20 bg-violet-950/10 mb-3 text-xs text-zinc-300 shrink-0 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <BrainCircuit className="w-4 h-4 text-violet-400" /> Active Student Context Injected Into Tutor:
            </span>
            <span className="text-[11px] text-violet-300/80 font-mono">Gemini RAG System Prompt Active</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 rounded bg-black/30 border border-white/5">
              <span className="text-zinc-500 block text-[10px]">STUDENT & PROGRAM</span>
              <span className="font-medium text-white">{studentName} ({branch})</span>
            </div>
            <div className="p-2 rounded bg-black/30 border border-white/5">
              <span className="text-zinc-500 block text-[10px]">SEMESTER & TARGET</span>
              <span className="font-medium text-white">{semester} · {targetRole}</span>
            </div>
            <div className="p-2 rounded bg-black/30 border border-white/5">
              <span className="text-zinc-500 block text-[10px]">ENROLLED SUBJECTS</span>
              <span className="font-medium text-white">{subjects.length} Subjects Active</span>
            </div>
            <div className="p-2 rounded bg-black/30 border border-white/5">
              <span className="text-zinc-500 block text-[10px]">TRACKED SKILLS</span>
              <span className="font-medium text-white">{skills.length} Skills Profiled</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 surface p-4 rounded-xl border border-white/5 bg-zinc-950/40">
        {messages.map((msg) => {
          const isUser = msg.from === 'user'
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300 shrink-0 mt-0.5 shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-violet-600 text-white rounded-tr-sm shadow-md'
                    : 'surface bg-zinc-900/90 text-zinc-200 border border-white/10 rounded-tl-sm shadow-sm'
                }`}
              >
                {/* Header inside bubble */}
                <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-white/10 text-[11px]">
                  <span className={`font-semibold ${isUser ? 'text-violet-100' : 'text-violet-300'}`}>
                    {isUser ? 'You' : 'YAT AI Tutor'}
                  </span>
                  <div className="flex items-center gap-2 text-zinc-400">
                    {msg.source && <span className="font-mono text-[10px] text-zinc-400">{msg.source}</span>}
                    <span>{msg.timestamp}</span>
                    <button
                      onClick={() => copyText(msg.text, msg.id)}
                      className="hover:text-white transition-colors"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Formatted Content */}
                <div className="whitespace-pre-wrap space-y-2 text-zinc-100 break-words font-sans text-sm">
                  {msg.text}
                </div>

                {/* Quick Action Suggestion Chips if provided */}
                {msg.actionSuggestions && msg.actionSuggestions.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <span className="text-[11px] text-zinc-400 font-medium block mb-2">
                      💡 Suggested Follow-ups:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.actionSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(suggestion)}
                          className="text-xs text-left px-2.5 py-1 rounded-full bg-violet-950/40 hover:bg-violet-900/60 border border-violet-500/30 text-violet-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {suggestion} →
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5 shadow-sm">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          )
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-lg bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300 shrink-0">
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
            </div>
            <div className="surface p-3.5 rounded-2xl rounded-tl-sm bg-zinc-900/90 border border-white/10 text-xs text-zinc-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
              <span>YAT Tutor is formulating an intuitive response with your semester context…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center justify-between mt-2 shrink-0">
          <span>{error}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleSendMessage()}
            className="text-xs h-7 text-red-200 hover:bg-red-900/40"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Input Form Bar */}
      <div className="mt-3 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage()
          }}
          className="relative surface rounded-xl border border-white/10 bg-zinc-900/90 p-2 shadow-lg focus-within:border-violet-500/50 transition-all"
        >
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask YAT Tutor anything (e.g. "Explain B+ Tree indexing", "Why did my quicksort hit O(N^2)?", "Give 5 interview questions for ${targetRole}")...`}
            rows={2}
            className="w-full bg-transparent border-0 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-0 resize-none px-2 py-1 leading-relaxed"
          />

          <div className="flex items-center justify-between pt-2 px-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500 hidden sm:inline">
                Shift + Enter for newline · Markdown supported
              </span>
              <span className="text-[11px] text-violet-400/80 font-medium">
                {language} Mode Active
              </span>
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={!inputMessage.trim() || loading}
              className="primary-btn bg-violet-600 hover:bg-violet-500 text-white px-4 h-8 text-xs font-medium shadow-md transition-all flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
                </>
              ) : (
                <>
                  Send <Send className="w-3.5 h-3.5 ml-0.5" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

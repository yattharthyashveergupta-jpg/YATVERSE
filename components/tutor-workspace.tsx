'use client'

import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import {
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Compass,
  Copy,
  ExternalLink,
  Globe,
  GraduationCap,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Search,
  Send,
  Sparkles,
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
  subjects?: any[]
  tasks?: any[]
  skills?: any[]
}

interface ChatMessage {
  id: string
  from: 'user' | 'ai'
  text: string
  timestamp: string
  source?: string
  actionSuggestions?: string[]
  isError?: boolean
  isRealtime?: boolean
  sources?: Array<{ title: string; url: string }>
  searchQueries?: string[]
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
  const [error, setError] = useState<string | null>(null)
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showContextDetails, setShowContextDetails] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const studentName = profile?.name || profile?.full_name || 'Student'
  const targetRole = profile?.role || profile?.career_goal || 'Software Engineer'
  const semester = profile?.semester ? `Semester ${profile?.semester}` : 'Current Semester'
  const branch = profile?.branch || 'Computer Science'

  // Initial welcome message configured to student's live context
  useEffect(() => {
    if (messages.length === 0) {
      const isHinglish = language === 'Hinglish'
      const welcomeText = isHinglish
        ? `Namaste **${studentName}**! Main hoon **YAT**, aapka personal Real-Time AI Academic Tutor & Placement Mentor.

Main aapke **${semester} (${branch})** ke coursework (${
            subjects.length > 0 ? subjects.map((s) => s.name).slice(0, 3).join(', ') : 'CS Core'
          }) aur target career goal **${targetRole}** se connected hoon, aur sath hi **Live Real-Time Web Search** se powered hoon.

Aap mujhse academic ya current live topics pooch sakte hain:
- **Real-Time & Live Web Data:** "Latest AI & Tech News 2026", "Current box office collections of recent movies", "Latest Python / Next.js updates", "Today's sports / tech headlines".
- **Concept Deep-Dives:** "Explain Binary Search with Time Complexity", "Why does Dijkstra fail on negative edges?", "How does virtual memory work?"
- **Code Debugging & Optimization:** Apna code paste karo in C, C++, Java, Python ya JS — main line-by-line flaw aur Big-O complexity explain karunga.
- **Exam & Placement Prep:** Master Theorem, DBMS Normalization, SQL Joins, System Design, ya ${targetRole} roadmap.

Aap kya explore ya discuss karna chahte hain?`
        : `Hello **${studentName}**! I am **YAT**, your 24/7 Real-Time AI Academic Tutor & Placement Mentor.

I am connected with your **${semester} (${branch})** coursework (${
            subjects.length > 0 ? subjects.map((s) => s.name).slice(0, 3).join(', ') : 'CS Core'
          }), target career trajectory **${targetRole}**, and equipped with **Live Google Search Grounding**.

Feel free to ask **academic concepts, coding problems, or live real-time queries**:
- **Real-Time & Current Information:** "Latest AI & Tech News in 2026", "Current box office collections of recent movie releases", "Latest stable versions of Python & Next.js", "Current sports tournaments & scores".
- **Conceptual Clarification:** "Explain Binary Search intuitively", "Why does Quicksort degrade to O(N²)?", "How does TCP 3-way handshake work?"
- **Code Debugging & Optimization:** Paste code in C, C++, Java, Python, or JS for step-by-step logic, bug diagnosis, and time/space complexity analysis.
- **Placement & Exam Prep:** Algorithms, DBMS, Operating Systems, Computer Networks, and technical problem-solving tailored for ${targetRole}.

What would you like to explore today?`

      setMessages([
        {
          id: 'welcome-msg',
          from: 'ai',
          text: welcomeText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'Gemini 3.6 Flash + Live Search',
          actionSuggestions: [
            'Latest Tech & AI News 2026',
            'Explain Binary Search with Time Complexity',
            'Current Movie Releases & Box Office',
            'Explain Recursion like I am 10',
            `Top skills needed for ${targetRole}`,
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
    const textToSend = (customText || inputMessage).trim()
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
    setError(null)
    setLastFailedMessage(null)

    // Build multi-turn history from valid non-error messages (last 16 messages)
    const validHistory = messages
      .filter((m) => !m.isError)
      .slice(-16)
      .map((m) => ({
        from: m.from,
        text: m.text,
      }))

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 50000)

    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          language,
          history: validHistory,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      let data: any = {}
      try {
        data = await res.json()
      } catch (jsonErr) {
        data = {}
      }

      if (!res.ok) {
        throw new Error(data.error || `AI Tutor service responded with status ${res.status}`)
      }

      const reply = data.reply || 'I am ready for your next question.'

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        from: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: data.source || (data.isRealtime ? 'Gemini 3.6 Flash + Google Search' : 'Gemini 3.6 Flash'),
        isRealtime: data.isRealtime || false,
        sources: data.sources || [],
        searchQueries: data.searchQueries || [],
      }

      setMessages((prev) => [...prev, aiMsg])
    } catch (err: any) {
      clearTimeout(timeoutId)
      console.error('Tutor request error:', err)
      let errorMsg = 'Unable to connect to Gemini AI Tutor. Please click Retry.'
      
      if (err.name === 'AbortError') {
        errorMsg = 'Request timed out while waiting for AI / Web Search response. Please click Retry.'
      } else if (err.message && err.message.includes('Failed to fetch')) {
        errorMsg = 'Network connection issue (Failed to fetch). Please check your internet connection and click Retry.'
      } else if (err.message) {
        errorMsg = err.message
      }

      setError(errorMsg)
      setLastFailedMessage(textToSend)

      // Append an error message bubble with retry capability
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          from: 'ai',
          text: `⚠️ **AI Response Notice**: ${errorMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'System Error',
          isError: true,
        },
      ])
    } finally {
      setLoading(false)
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }

  const handleRetry = () => {
    if (lastFailedMessage) {
      const msgToRetry = lastFailedMessage
      // Remove the last error message from the chat and retry cleanly
      setMessages((prev) => prev.filter((m) => !m.isError))
      setError(null)
      setLastFailedMessage(null)
      handleSendMessage(msgToRetry)
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
    setMessages([])
    setError(null)
    setLastFailedMessage(null)
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
              <h2 className="text-base font-semibold text-white tracking-tight">YAT AI Academic & Real-Time Tutor</h2>
              <Pill tone="emerald" className="text-[10px] uppercase font-mono flex items-center gap-1">
                <Globe className="w-3 h-3 text-emerald-400" />
                Gemini 3.6 Flash + Live Search
              </Pill>
            </div>
            <p className="text-xs text-zinc-400">
              Live multi-turn tutor with Google Search Grounding for real-time data & deep academic telemetry
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
            Telemetry
            {showContextDetails ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            disabled={messages.length <= 1 && !error}
            className="text-xs text-zinc-400 hover:text-red-400 hover:bg-red-950/20"
            title="Reset Conversation"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Expandable Live Context Drawer */}
      {showContextDetails && (
        <div className="surface p-3.5 rounded-xl border border-violet-500/20 bg-violet-950/10 mb-3 text-xs text-zinc-300 shrink-0 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <BrainCircuit className="w-4 h-4 text-violet-400" /> Active Student Context Injected Into Gemini:
            </span>
            <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
              <Globe className="w-3 h-3" /> Live Google Search Grounding Active
            </span>
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
              <span className="font-medium text-white">{subjects.length} Subjects</span>
            </div>
            <div className="p-2 rounded bg-black/30 border border-white/5">
              <span className="text-zinc-500 block text-[10px]">REAL-TIME ENGINE</span>
              <span className="font-medium text-emerald-300">Google Search + Gemini 3.6</span>
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
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-sm ${
                    msg.isError
                      ? 'bg-red-950/60 border border-red-500/40 text-red-400'
                      : msg.isRealtime
                      ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300'
                      : 'bg-violet-600/30 border border-violet-500/40 text-violet-300'
                  }`}
                >
                  {msg.isError ? (
                    <Zap className="w-4 h-4" />
                  ) : msg.isRealtime ? (
                    <Globe className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </div>
              )}

              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-violet-600 text-white rounded-tr-sm shadow-md'
                    : msg.isError
                    ? 'surface bg-red-950/30 text-red-200 border border-red-500/30 rounded-tl-sm shadow-sm'
                    : 'surface bg-zinc-900/90 text-zinc-200 border border-white/10 rounded-tl-sm shadow-sm'
                }`}
              >
                {/* Header inside bubble */}
                <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-white/10 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold ${
                        isUser
                          ? 'text-violet-100'
                          : msg.isError
                          ? 'text-red-300'
                          : msg.isRealtime
                          ? 'text-emerald-300'
                          : 'text-violet-300'
                      }`}
                    >
                      {isUser ? 'You' : msg.isError ? 'System Notice' : 'YAT AI Tutor'}
                    </span>
                    {msg.isRealtime && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[9px] flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5 text-emerald-400" />
                        Live Grounded
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    {msg.source && <span className="font-mono text-[10px] text-zinc-400">{msg.source}</span>}
                    <span>{msg.timestamp}</span>
                    {!msg.isError && (
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
                    )}
                  </div>
                </div>

                {/* Rich Markdown Formatted Content */}
                <div className="text-zinc-100 break-words font-sans text-sm leading-relaxed">
                  <Markdown
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '')
                        const codeString = String(children).replace(/\n$/, '')
                        if (!inline && (match || codeString.includes('\n'))) {
                          const lang = match ? match[1] : 'code'
                          const codeBlockId = `code-${msg.id}-${codeString.slice(0, 10)}`
                          return (
                            <div className="my-3 rounded-lg overflow-hidden border border-white/10 bg-black/70 shadow-md">
                              <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-white/10 text-[11px] font-mono text-zinc-400">
                                <span className="uppercase text-violet-300 font-semibold flex items-center gap-1.5">
                                  <Code2 className="w-3.5 h-3.5 text-violet-400" />
                                  {lang}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyText(codeString, codeBlockId)}
                                  className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-white/5"
                                >
                                  {copiedId === codeBlockId ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400 text-[10px]">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span className="text-[10px]">Copy Code</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-zinc-200 bg-transparent m-0">
                                <code {...props}>{codeString}</code>
                              </pre>
                            </div>
                          )
                        }
                        return (
                          <code
                            className="px-1.5 py-0.5 rounded bg-white/10 text-violet-200 font-mono text-xs"
                            {...props}
                          >
                            {children}
                          </code>
                        )
                      },
                      h1: ({ children }) => (
                        <h1 className="text-base font-bold text-white mt-3.5 mb-1.5 border-b border-white/10 pb-1">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-sm font-bold text-white mt-3 mb-1">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xs font-bold text-violet-300 mt-2.5 mb-1 uppercase tracking-wide">
                          {children}
                        </h3>
                      ),
                      ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
                      li: ({ children }) => <li className="text-zinc-200">{children}</li>,
                      p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-violet-500/60 pl-3 my-2 text-zinc-300 italic bg-violet-950/20 py-1 rounded-r">
                          {children}
                        </blockquote>
                      ),
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 underline font-medium inline-flex items-center gap-0.5"
                        >
                          {children}
                          <ExternalLink className="w-3 h-3 inline ml-0.5 opacity-70" />
                        </a>
                      ),
                    }}
                  >
                    {msg.text}
                  </Markdown>
                </div>

                {/* Real-time Sources and Citations Box */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-white/10 bg-black/30 -mx-4 -mb-4 p-3.5 rounded-b-xl">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-emerald-400" /> Live Web Sources & Grounding Citations:
                      </span>
                      {msg.searchQueries && msg.searchQueries.length > 0 && (
                        <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[200px]" title={msg.searchQueries.join(', ')}>
                          Searched: "{msg.searchQueries[0]}"
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {msg.sources.map((src, sIdx) => {
                        let domain = ''
                        try {
                          domain = new URL(src.url).hostname.replace(/^www\./, '')
                        } catch {
                          domain = src.title
                        }
                        return (
                          <a
                            key={sIdx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900/90 hover:bg-zinc-800/90 border border-white/10 hover:border-emerald-500/40 text-xs text-zinc-200 transition-all group"
                          >
                            <Search className="w-3 h-3 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-white truncate text-[11px] leading-tight group-hover:text-emerald-300">
                                {src.title || domain}
                              </p>
                              <p className="text-[10px] text-zinc-400 truncate">{domain}</p>
                            </div>
                            <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-emerald-400 shrink-0" />
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* In-Bubble Retry for Failed Messages */}
                {msg.isError && lastFailedMessage && (
                  <div className="mt-3 pt-2 border-t border-red-500/20 flex items-center justify-between">
                    <span className="text-xs text-red-300/80">Would you like to retry this question?</span>
                    <Button
                      size="sm"
                      onClick={handleRetry}
                      className="text-xs h-7 bg-red-600 hover:bg-red-500 text-white font-medium flex items-center gap-1 shadow-sm"
                    >
                      <RefreshCcw className="w-3 h-3" /> Retry Now
                    </Button>
                  </div>
                )}

                {/* Quick Action Suggestion Chips if provided */}
                {msg.actionSuggestions && msg.actionSuggestions.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <span className="text-[11px] text-zinc-400 font-medium block mb-2">
                      💡 Suggested Follow-ups & Questions:
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
            <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            </div>
            <div className="surface p-3.5 rounded-2xl rounded-tl-sm bg-zinc-900/90 border border-white/10 text-xs text-zinc-300 flex items-center gap-2 shadow-sm">
              <Globe className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>YAT Tutor is analyzing your query & retrieving live web data if needed…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Banner with 1-click Retry */}
      {error && (
        <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-center justify-between mt-2 shrink-0 animate-in fade-in">
          <span className="truncate mr-2">{error}</span>
          {lastFailedMessage && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRetry}
              className="text-xs h-7 text-red-200 hover:bg-red-900/40 flex items-center gap-1 shrink-0"
            >
              <RefreshCcw className="w-3 h-3" /> Retry Question
            </Button>
          )}
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
            placeholder={`Ask YAT Tutor anything — from coding/DSA & academic coursework to live real-time news, sports, movie collections, or tech releases...`}
            rows={2}
            className="w-full bg-transparent border-0 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-0 resize-none px-2 py-1 leading-relaxed"
          />

          <div className="flex items-center justify-between pt-2 px-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500 hidden sm:inline">
                Enter to send · Shift+Enter for newline · Real-Time Google Search Grounding
              </span>
              <span className="text-[11px] text-violet-400 font-medium">
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


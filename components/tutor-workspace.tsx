'use client'

import { useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface TutorWorkspaceProps {
  language: 'English' | 'Hinglish'
  setLanguage: (lang: 'English' | 'Hinglish') => void
  profile: any
  subjects: any[]
  tasks: any[]
  skills: any[]
}

export function TutorWorkspace({
  language,
  setLanguage,
  profile,
  subjects,
  tasks,
  skills,
}: TutorWorkspaceProps) {
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<Array<{ from: 'ai' | 'user'; text: string }>>(() => [
    {
      from: 'ai',
      text: `Hey ${profile?.name || 'there'}! I’m YAT, your personal AI Tutor. I'm connected to your ${
        subjects?.length || 0
      } subjects and ${tasks?.length || 0} tasks. What should we learn, debug, or practice today?`,
    },
  ])

  const send = async (textToSend?: string) => {
    const text = (textToSend || msg).trim()
    if (!text || sending) return
    const newHistory = [...messages, { from: 'user' as const, text }]
    setMessages(newHistory)
    setMsg('')
    setSending(true)

    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, language, history: newHistory.slice(-4) }),
      })

      if (!res.ok) throw new Error('AI response error')
      const data = await res.json()
      if (data.reply) {
        setMessages([...newHistory, { from: 'ai', text: data.reply }])
      } else {
        setMessages([...newHistory, { from: 'ai', text: 'Error generating response. Please try again.' }])
      }
    } catch (err) {
      console.error('Tutor error:', err)
      setMessages([
        ...newHistory,
        {
          from: 'ai',
          text: 'Could not connect to YAT AI. Please check your network and try again.',
        },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="tutor-layout">
      <div className="surface tutor-chat">
        <div className="tutor-head">
          <div className="ai-face">
            <Sparkles />
          </div>
          <div>
            <strong>YAT · your AI teacher</strong>
            <small>Online · understands your coursework & career goals</small>
          </div>
          <div className="language-toggle">
            <button
              className={language === 'English' ? 'selected' : ''}
              onClick={() => setLanguage('English')}
            >
              EN
            </button>
            <button
              className={language === 'Hinglish' ? 'selected' : ''}
              onClick={() => setLanguage('Hinglish')}
            >
              HI
            </button>
          </div>
        </div>

        <div className="messages">
          {messages.map((m, i) => (
            <div className={`message ${m.from}`} key={i}>
              <div style={{ whiteSpace: 'pre-line' }}>{m.text}</div>
            </div>
          ))}
          {sending && (
            <div className="message ai">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-violet-400" />
                <span>YAT is thinking…</span>
              </div>
            </div>
          )}
        </div>

        <div className="suggestions">
          <button onClick={() => void send('Explain recursion with an intuitive example')}>
            Explain recursion
          </button>
          <button onClick={() => void send('Break down Binary Search algorithm and edge cases')}>
            Binary search intuition
          </button>
          <button onClick={() => void send('Quiz me on core DSA patterns')}>Quiz me on DSA</button>
          <button onClick={() => void send('Make quick revision notes for my subjects')}>
            Make revision notes
          </button>
        </div>

        <div className="composer">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && void send()}
            placeholder={sending ? 'YAT is generating response…' : 'Ask YAT anything about code, math, or exams...'}
            disabled={sending}
          />
          <Button
            className="primary-btn"
            size="icon"
            onClick={() => void send()}
            disabled={sending || !msg.trim()}
            aria-label="Send"
          >
            <ArrowRight />
          </Button>
        </div>
      </div>

      <div className="surface tutor-context">
        <span className="eyebrow accent">YAT KNOWS YOUR CONTEXT</span>
        <h3>Today’s learning context</h3>
        {[
          ['Current focus', subjects?.[0]?.name || 'Computer Science'],
          ['Target role', profile.role || 'AI/ML Engineer'],
          ['Pending tasks', `${tasks?.filter((t: any) => !t.completed)?.length || 0} sessions`],
          ['Tracked skills', `${skills?.length || 0} skills`],
          ['Language mode', language],
        ].map(([a, b]) => (
          <div className="context-row" key={a}>
            <span>{a}</span>
            <strong>{b}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

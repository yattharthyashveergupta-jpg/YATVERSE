'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, Check, CheckCheck, RefreshCw, Send, ShieldAlert, Sparkles, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AcademicTask } from '@/components/academic-core'
import { createClient } from '@/utils/supabase/client'
import {
  getPushPermissionStatus,
  isPushSupported,
  requestPushPermissionAndSubscribe,
  sendLocalBrowserNotification,
  type PushPermissionStatus,
} from '@/lib/push-notifications'

export type NotificationItem = {
  id: string
  user_id: string
  task_id: string | null
  title: string
  message: string
  type: string
  is_read: boolean
  read_at: string | null
  scheduled_for: string | null
  created_at: string
}

const notificationColumns = 'id, user_id, task_id, title, message, type, is_read, read_at, scheduled_for, created_at'

function formatScheduledFor(value: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotificationCenter({
  tasks,
  notify,
}: {
  tasks: AcademicTask[]
  notify: (message: string) => void
}) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pushStatus, setPushStatus] = useState<PushPermissionStatus>('default')
  const [pushBusy, setPushBusy] = useState(false)
  const lock = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Check initial browser push status
  useEffect(() => {
    setPushStatus(getPushPermissionStatus())
  }, [])

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.warn('Notification load: user session unavailable.', {
          message: userError?.message || 'No active user session',
          name: userError?.name,
          status: (userError as any)?.status,
        })
        setItems([])
        setError('')
        if (showLoading) setLoading(false)
        return
      }

      const { data, error: notificationError } = await supabase
        .from('notifications')
        .select(notificationColumns)
        .eq('user_id', user.id)
        .order('is_read', { ascending: true })
        .order('created_at', { ascending: false })

      if (notificationError) {
        console.error('Notification load failed:', {
          message: notificationError.message,
          code: notificationError.code,
          details: notificationError.details,
          hint: notificationError.hint,
        })

        if (
          notificationError.code === '42P01' ||
          notificationError.message?.includes('does not exist') ||
          notificationError.code === 'PGRST200'
        ) {
          console.warn(
            'Notice: "notifications" table is not provisioned in Supabase. Required table: public.notifications.'
          )
        }

        // Try API fallback route in case server client has cookie resolution
        try {
          const res = await fetch('/api/notifications')
          if (res.ok) {
            const apiData = await res.json()
            if (Array.isArray(apiData.notifications)) {
              setItems(apiData.notifications as NotificationItem[])
              setError('')
              if (showLoading) setLoading(false)
              return
            }
          }
        } catch (apiErr) {
          console.warn('Notification API fallback check:', apiErr)
        }

        setError(notificationError.message || 'We could not load notifications. Please try again.')
      } else {
        setItems((data ?? []) as NotificationItem[])
        setError('')
      }
    } catch (err: any) {
      console.error('Unexpected error loading notifications:', {
        message: err?.message || String(err),
        stack: err?.stack,
      })
      setError(err?.message || 'Network error loading notifications.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  async function markRead(item: NotificationItem) {
    if (item.is_read || lock.current) return
    lock.current = true
    setBusy(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        console.warn('Cannot mark notification as read: user session unavailable.', {
          message: userError?.message,
        })
        throw new Error('Authenticated user unavailable.')
      }

      const { data, error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('user_id', user.id)
        .select(notificationColumns)
        .maybeSingle()

      if (updateError) {
        console.error('Unable to mark notification as read:', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
        })
        throw updateError
      }

      setItems((current) =>
        current.map((notification) =>
          notification.id === item.id
            ? (data as NotificationItem) || { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      )
      notify('Notification marked as read.')
    } catch (markReadError: any) {
      console.error('Unable to mark notification as read:', {
        message: markReadError?.message,
        code: markReadError?.code,
        details: markReadError?.details,
        hint: markReadError?.hint,
      })
      setError(markReadError?.message || 'We could not update this notification. Please try again.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  async function markAllAsRead() {
    const unread = items.filter((item) => !item.is_read)
    if (unread.length === 0 || lock.current) return
    lock.current = true
    setBusy(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        console.warn('Cannot mark all as read: user session unavailable.', {
          message: userError?.message,
        })
        throw new Error('Authenticated user unavailable.')
      }

      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (updateError) {
        console.error('Failed to mark all notifications as read:', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
        })
        throw updateError
      }

      setItems((current) =>
        current.map((item) => ({ ...item, is_read: true, read_at: new Date().toISOString() }))
      )
      notify('All notifications marked as read.')
    } catch (err: any) {
      console.error('Failed to mark all notifications as read:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
      })
      setError(err?.message || 'Could not update all notifications.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  async function handleEnablePush() {
    setPushBusy(true)
    try {
      const res = await requestPushPermissionAndSubscribe()
      setPushStatus(res.status)
      if (res.status === 'granted') {
        notify('Browser push notifications enabled!')
        await sendLocalBrowserNotification('YATVERSE Push Connected', {
          body: 'You will now receive urgent study deadlines and syllabus alerts.',
        })
      } else if (res.status === 'denied') {
        notify('Notifications blocked in browser permissions.')
      }
    } catch (err) {
      console.error('Push activation error:', err)
      notify('Could not enable push notifications.')
    } finally {
      setPushBusy(false)
    }
  }

  async function handleSendTestNotification() {
    if (pushStatus !== 'granted') {
      await handleEnablePush()
      return
    }
    const success = await sendLocalBrowserNotification('YATVERSE Academic Reminder', {
      body: 'Upcoming sprint: 2 high-priority tasks scheduled for review today.',
    })
    if (success) {
      notify('Test browser notification dispatched!')
    } else {
      notify('Could not trigger browser notification.')
    }
  }

  const unreadCount = items.filter((item) => !item.is_read).length
  const taskTitle = (taskId: string | null) => tasks.find((task) => task.id === taskId)?.title

  return (
    <div className="notification-center" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </Button>

      {open && (
        <div className="notification-panel" role="dialog" aria-label="Notifications">
          <div className="notification-head">
            <div>
              <strong>Notifications</strong>
              <small>{unreadCount ? `${unreadCount} unread` : 'All caught up'}</small>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void markAllAsRead()}
                  disabled={loading || busy}
                  title="Mark all as read"
                  className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                >
                  <CheckCheck className="w-3.5 h-3.5 mr-1 inline" /> Mark all
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Refresh notifications"
                onClick={() => void load()}
                disabled={loading || busy}
                className="w-7 h-7"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Browser Push Notification Banner */}
          <div className="px-3 py-2 border-b border-white/5 bg-zinc-950/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${pushStatus === 'granted' ? 'bg-emerald-400' : pushStatus === 'denied' ? 'bg-red-400' : 'bg-amber-400'}`} />
              <span className="text-[11px] text-zinc-300">
                {pushStatus === 'granted'
                  ? 'Browser Push Active'
                  : pushStatus === 'denied'
                  ? 'Push Blocked in Browser'
                  : 'Browser Push Off'}
              </span>
            </div>

            {pushStatus === 'granted' ? (
              <button
                onClick={handleSendTestNotification}
                className="text-[10px] text-violet-400 hover:text-violet-300 transition font-mono flex items-center gap-1"
                title="Trigger a test browser push alert"
              >
                <Send className="w-2.5 h-2.5" /> Test Push
              </button>
            ) : pushStatus === 'default' ? (
              <button
                onClick={handleEnablePush}
                disabled={pushBusy}
                className="text-[10px] bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 px-2 py-0.5 rounded border border-violet-500/30 transition"
              >
                {pushBusy ? 'Enabling…' : 'Enable Push'}
              </button>
            ) : null}
          </div>

          {loading ? (
            <p className="notification-state">Loading notifications…</p>
          ) : error ? (
            <div className="notification-state">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={() => void load()} disabled={busy}>
                Try again
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="notification-state">
              <Check className="w-5 h-5 text-violet-400 mb-1" />
              <p>No notifications yet.</p>
              <small className="text-muted-foreground text-xs">
                Important reminders and task updates will appear here.
              </small>
            </div>
          ) : (
            <div className="notification-list">
              {items.map((item) => (
                <button
                  type="button"
                  className={`notification-item ${
                    item.is_read ? 'notification-read' : 'notification-unread'
                  }`}
                  key={item.id}
                  disabled={busy}
                  onClick={() => void markRead(item)}
                >
                  <span className="notification-dot" aria-hidden="true" />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.message || 'No additional details.'}</small>
                    <em>
                      {item.type || 'general'}
                      {taskTitle(item.task_id)
                        ? ` · ${taskTitle(item.task_id)}`
                        : item.task_id
                        ? ' · Linked task'
                        : ''}
                      {formatScheduledFor(item.scheduled_for)
                        ? ` · ${formatScheduledFor(item.scheduled_for)}`
                        : ''}
                    </em>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

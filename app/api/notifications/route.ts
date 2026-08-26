import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch notifications
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('is_read', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If notifications are empty, generate initial contextual notifications from real tasks/subjects
    if (!notifications || notifications.length === 0) {
      const { data: subjects } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)

      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)

      const { data: career } = await supabase
        .from('career_applications')
        .select('*')
        .eq('user_id', user.id)

      const toInsert = []

      // 1. Check for low progress subjects
      const lowProgress = subjects?.filter((s) => (s.progress || 0) < 40)
      if (lowProgress && lowProgress.length > 0) {
        toInsert.push({
          user_id: user.id,
          title: `Academic Focus: ${lowProgress[0].name}`,
          message: `Subject progress is currently ${lowProgress[0].progress}%. Schedule a revision sprint to stay on track.`,
          type: 'academic',
          is_read: false,
        })
      }

      // 2. Check for pending tasks
      if (tasks && tasks.length > 0) {
        toInsert.push({
          user_id: user.id,
          title: `Upcoming Task: ${tasks[0].title}`,
          message: `Scheduled for study: ${tasks[0].duration_minutes || 45} minutes planned.`,
          type: 'study',
          task_id: tasks[0].id,
          is_read: false,
        })
      }

      // 3. Check for career interview rounds
      const interviewing = career?.filter((c) => c.application_status === 'Interviewing')
      if (interviewing && interviewing.length > 0) {
        toInsert.push({
          user_id: user.id,
          title: `Interview Round: ${interviewing[0].company_name}`,
          message: `Active interview pipeline for ${interviewing[0].role}. Practice interview questions with AI.`,
          type: 'career',
          is_read: false,
        })
      }

      if (toInsert.length > 0) {
        await supabase.from('notifications').insert(toInsert)
        const { data: refreshed } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        return NextResponse.json({ notifications: refreshed || toInsert })
      }
    }

    return NextResponse.json({ notifications: notifications || [] })
  } catch (err: any) {
    console.error('Notifications fetch error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { title, message, type, task_id, scheduled_for } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title,
        message,
        type: type || 'general',
        task_id: task_id || null,
        scheduled_for: scheduled_for || null,
        is_read: false,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ notification: data })
  } catch (err: any) {
    console.error('Notification create error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

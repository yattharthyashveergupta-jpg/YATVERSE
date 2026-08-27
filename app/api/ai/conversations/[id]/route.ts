import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [convRes, msgsRes] = await Promise.all([
      supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
    ])

    if (convRes.error || !convRes.data) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const messages = (msgsRes.data || []).map((m: any) => ({
      id: m.id,
      from: m.role,
      text: m.content,
      timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: m.source || undefined,
      isRealtime: m.is_realtime || false,
      sources: m.sources || [],
      searchQueries: m.search_queries || [],
      createdAt: m.created_at,
    }))

    return NextResponse.json({
      conversation: convRes.data,
      messages,
    })
  } catch (err: any) {
    console.error('Conversation GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body.title === 'string' && body.title.trim()) {
      updates.title = body.title.trim().slice(0, 120)
    }

    if (typeof body.pinned === 'boolean') {
      updates.pinned = body.pinned
    }

    const { data, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ conversation: data })
  } catch (err: any) {
    console.error('Conversation PATCH error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Messages will cascade delete due to foreign key constraint
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id })
  } catch (err: any) {
    console.error('Conversation DELETE error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

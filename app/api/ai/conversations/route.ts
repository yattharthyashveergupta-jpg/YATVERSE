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
      return NextResponse.json({ conversations: [], guest: true })
    }

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        pinned,
        created_at,
        updated_at,
        messages(id, content, role, created_at, is_realtime)
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.warn('Error fetching conversations from Supabase:', error)
      return NextResponse.json({ conversations: [], error: error.message })
    }

    // Format conversations with preview and message count
    const formatted = (conversations || []).map((c: any) => {
      const msgs = Array.isArray(c.messages) ? c.messages : []
      // Sort messages by created_at
      msgs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      const lastMsg = msgs[msgs.length - 1]
      return {
        id: c.id,
        title: c.title || 'Conversation',
        pinned: c.pinned || false,
        created_at: c.created_at,
        updated_at: c.updated_at,
        messageCount: msgs.length,
        lastMessagePreview: lastMsg?.content ? lastMsg.content.slice(0, 100) : '',
        lastMessageRole: lastMsg?.role || null,
        lastMessageTime: lastMsg?.created_at || c.updated_at,
      }
    })

    return NextResponse.json({ conversations: formatted })
  } catch (err: any) {
    console.error('Conversations GET error:', err)
    return NextResponse.json({ conversations: [], error: err.message }, { status: 500 })
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
      return NextResponse.json(
        { error: 'Unauthorized. Sign in to save persistent conversations.' },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const title = (body.title || 'New Conversation').trim().slice(0, 120)

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title,
        updated_at: new Date().toISOString(),
      })
      .select('id, title, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error creating conversation in Supabase:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ conversation: data })
  } catch (err: any) {
    console.error('Conversations POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

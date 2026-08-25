import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subscription } = await req.json()
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 })
    }

    // Try persisting to push_subscriptions table if exists
    try {
      await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: user.id,
            endpoint: subscription.endpoint,
            subscription: subscription,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id, endpoint' }
        )
    } catch (dbErr) {
      console.warn('Notice storing push subscription in database:', dbErr)
    }

    return NextResponse.json({ success: true, message: 'Push subscription registered.' })
  } catch (err: any) {
    console.error('Push subscribe route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

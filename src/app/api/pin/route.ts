import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { action, pin } = await req.json()

    if (!pin || pin.length !== 4) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 400 })
    }

    // SHA-256 hash (Simple but effective for this use case, salt is user.id)
    const hash = crypto.createHash('sha256').update(`${user.id}-${pin}`).digest('hex')

    if (action === 'setup') {
      const { error } = await supabase.from('profiles').update({ pin_hash: hash }).eq('id', user.id)
      if (error) throw error

      const res = NextResponse.json({ success: true })
      // Set pin_enabled so middleware knows they have a pin
      res.cookies.set('pin_enabled', 'true', { path: '/', maxAge: 60 * 60 * 24 * 365 * 10 }) // 10 years
      // Also unlock it for now
      res.cookies.set('app_unlocked', 'true', { path: '/', maxAge: 60 * 60 }) // 1 hour
      return res
    } 
    
    else if (action === 'verify') {
      const { data: profile } = await supabase.from('profiles').select('pin_hash').eq('id', user.id).single()
      
      if (profile?.pin_hash === hash) {
        const res = NextResponse.json({ success: true })
        // Set unlocked for 1 hour
        res.cookies.set('app_unlocked', 'true', { path: '/', maxAge: 60 * 60 })
        // Ensure pin_enabled is set just in case
        res.cookies.set('pin_enabled', 'true', { path: '/', maxAge: 60 * 60 * 24 * 365 * 10 })
        return res
      } else {
        return NextResponse.json({ error: 'Incorrect PIN' }, { status: 403 })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

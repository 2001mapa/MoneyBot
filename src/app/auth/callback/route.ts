import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const token = searchParams.get('token')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
            }
          },
        },
      }
    )
    
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && user) {
      // Bloqueo de seguridad: Lista blanca de correos autorizados
      const ALLOWED_EMAIL = 'miguelalbornoz.dev@gmail.com'
      if (!user.email || user.email.toLowerCase() !== ALLOWED_EMAIL) {
        // Cerramos la sesión inmediatamente y redirigimos con un parámetro de error
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?error=unauthorized_email`)
      }

      // Upsert profile. Si no existe, se crea; si existe, se actualiza.
      const updateData: any = { 
        id: user.id, 
        email: user.email,
        updated_at: new Date().toISOString()
      }
      
      // Si veníamos desde Telegram con un token válido, vinculamos el chat_id
      if (token) {
        const chatId = await redis.get(`auth_token_${token}`)
        if (chatId) {
          updateData.telegram_chat_id = parseInt(chatId.toString())
          await redis.del(`auth_token_${token}`) // Consumir el token
        }
      }
      
      await supabase.from('profiles').upsert(updateData)

      // Fetch profile to see if they have a PIN set
      const { data: profile } = await supabase.from('profiles').select('pin_hash').eq('id', user.id).single()
      
      const res = NextResponse.redirect(`${origin}${next}`)
      
      if (profile?.pin_hash) {
        res.cookies.set('pin_enabled', 'true', { path: '/', maxAge: 60 * 60 * 24 * 365 * 10 })
        // If they just logged in, they proved identity, so unlock the app for a session
        res.cookies.set('app_unlocked', 'true', { path: '/', maxAge: 60 * 60 })
      }

      return res
    }
  }

  // Error de login
  return NextResponse.redirect(`${origin}/login?error=true`)
}

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const chatId = searchParams.get('chat_id')

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
      // Upsert profile. Si no existe, se crea; si existe, se actualiza.
      const updateData: any = { 
        id: user.id, 
        email: user.email,
        updated_at: new Date().toISOString()
      }
      
      // Si veníamos desde Telegram, vinculamos el chat_id automáticamente
      if (chatId) {
        updateData.telegram_chat_id = parseInt(chatId)
      }
      
      await supabase.from('profiles').upsert(updateData)

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Error de login
  return NextResponse.redirect(`${origin}/login?error=true`)
}

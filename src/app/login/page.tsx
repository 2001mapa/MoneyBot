'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { Wallet } from 'lucide-react'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const searchParams = useSearchParams()
  const chatId = searchParams.get('chat_id')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback${chatId ? `?chat_id=${chatId}` : ''}`,
      },
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('¡Enlace mágico enviado! Revisa tu correo.')
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback${chatId ? `?chat_id=${chatId}` : ''}`,
      },
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="bg-foreground/5 p-4 rounded-full mb-6 text-foreground">
          <Wallet className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold mb-2">MoneyBot</h1>
        <p className="text-foreground/60 text-center text-sm mb-8">
          {chatId ? "Vincula tu cuenta con Telegram para continuar." : "Inicia sesión para gestionar tus finanzas."}
        </p>

        <button 
          onClick={handleGoogleLogin}
          className="w-full bg-foreground text-background font-bold py-3 px-4 rounded-xl mb-4 hover:opacity-90 transition-opacity shadow-md"
        >
          Continuar con Google
        </button>

        <div className="flex items-center w-full mb-4">
          <div className="flex-1 border-t border-foreground/10"></div>
          <span className="px-3 text-[10px] text-foreground/40 font-bold uppercase tracking-wider">o usando tu correo</span>
          <div className="flex-1 border-t border-foreground/10"></div>
        </div>

        <form onSubmit={handleLogin} className="w-full">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            required
            className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3.5 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl disabled:opacity-50 hover:bg-blue-700 transition-colors shadow-md"
          >
            {loading ? 'Enviando...' : 'Enviar Enlace Mágico'}
          </button>
        </form>
        
        {message && <p className="mt-4 text-sm font-medium text-center text-blue-600">{message}</p>}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="flex-1 max-w-lg mx-auto w-full">
      <header className="flex justify-end p-6">
        <ThemeSwitcher />
      </header>
      <Suspense fallback={<div className="flex justify-center p-8 text-sm font-medium">Cargando...</div>}>
        <LoginContent />
      </Suspense>
    </main>
  )
}

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
  const token = searchParams.get('token')
  const errorParam = searchParams.get('error')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback${token ? `?token=${token}` : ''}`,
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
        redirectTo: `${location.origin}/auth/callback${token ? `?token=${token}` : ''}`,
      },
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="bg-card p-4 rounded-full mb-6 text-foreground">
          <Wallet className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold mb-2">MoneyBot</h1>
        <p className="text-muted-foreground text-center text-sm mb-8">
          {token ? "Vincula tu cuenta con Telegram para continuar." : "Inicia sesión para gestionar tus finanzas."}
        </p>

        <button 
          onClick={handleGoogleLogin}
          className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-xl mb-4 hover:opacity-90 transition-opacity shadow-md"
        >
          Continuar con Google
        </button>

        <div className="flex items-center w-full mb-4">
          <div className="flex-1 border-t border-border"></div>
          <span className="px-3 text-[10px] text-foreground/40 font-bold uppercase tracking-wider">o usando tu correo</span>
          <div className="flex-1 border-t border-border"></div>
        </div>

        <form onSubmit={handleLogin} className="w-full">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            required
            className="w-full bg-card border border-border rounded-xl px-4 py-3.5 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold py-3.5 px-4 rounded-xl disabled:opacity-50 hover:bg-blue-700 transition-colors shadow-md"
          >
            {loading ? 'Enviando...' : 'Enviar Enlace Mágico'}
          </button>
        </form>
        
        {message && <p className="mt-4 text-sm font-medium text-center text-primary">{message}</p>}
        {errorParam === 'unauthorized_email' && (
          <div className="mt-4 p-3 bg-expense/10 border border-expense/20 rounded-xl">
            <p className="text-xs font-bold text-center text-expense">
              Acceso denegado. Tu correo no está autorizado para usar este sistema.
            </p>
          </div>
        )}
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

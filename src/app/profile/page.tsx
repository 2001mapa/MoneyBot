'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, LogOut, User, Palette, Coins, Bot, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return setLoading(false)

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (data) setProfile(data)
      setLoading(false)
    }
    loadProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    await supabase
      .from('profiles')
      .update({
        bot_alias: profile.bot_alias,
        theme: profile.theme,
        currency: profile.currency,
        monthly_budget: profile.monthly_budget
      })
      .eq('id', profile.id)
    setSaving(false)
    alert("¡Cambios guardados con éxito!")
  }

  return (
    <main className="flex-1 p-6 pb-28 max-w-lg mx-auto w-full">
      <header className="flex items-center mb-8 mt-4">
        <Link href="/" className="mr-4 p-2 bg-foreground/5 rounded-full hover:bg-foreground/10 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perfil</h1>
          <p className="text-foreground/60 text-sm mt-1">Configuración y preferencias</p>
        </div>
      </header>

      {loading ? (
        <p className="text-center text-foreground/50 py-10">Cargando perfil...</p>
      ) : !profile ? (
        <p className="text-center text-foreground/50 py-10">Error al cargar el perfil.</p>
      ) : (
        <div className="space-y-6">
          
          <div className="bg-foreground/[0.02] border border-foreground/5 p-6 rounded-3xl flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-600/10 text-blue-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8" />
            </div>
            <div>
              <p className="font-bold text-lg">{profile.email}</p>
              <p className="text-xs font-medium text-foreground/50">Vinculado a Telegram: {profile.telegram_chat_id ? '✅ Sí' : '❌ No'}</p>
            </div>
          </div>

          <div className="bg-foreground/[0.02] border border-foreground/5 p-6 rounded-3xl space-y-5">
            <h3 className="text-sm font-bold text-foreground/70 uppercase tracking-wider mb-2">Ajustes del Bot y App</h3>
            
            <div>
              <label className="flex items-center text-xs font-bold text-foreground/60 mb-2 uppercase tracking-wider">
                <Bot className="w-4 h-4 mr-2" /> Nombre del Asistente (Alias)
              </label>
              <input 
                type="text" 
                value={profile.bot_alias || ''} 
                onChange={e => setProfile({...profile, bot_alias: e.target.value})}
                className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-xs font-bold text-foreground/60 mb-2 uppercase tracking-wider">
                  <Coins className="w-4 h-4 mr-2" /> Moneda
                </label>
                <select 
                  value={profile.currency || 'COP'} 
                  onChange={e => setProfile({...profile, currency: e.target.value})}
                  className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="COP">COP ($)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="MXN">MXN ($)</option>
                </select>
              </div>
              <div>
                <label className="flex items-center text-xs font-bold text-foreground/60 mb-2 uppercase tracking-wider">
                  <Palette className="w-4 h-4 mr-2" /> Tema
                </label>
                <select 
                  value={profile.theme || 'luxury_gold'} 
                  onChange={e => setProfile({...profile, theme: e.target.value})}
                  className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="luxury_gold">Luxury Gold</option>
                  <option value="cyberpunk">Cyberpunk</option>
                  <option value="emerald">Emerald</option>
                  <option value="soft_pastel">Soft Pastel</option>
                  <option value="system">Sistema</option>
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center text-xs font-bold text-foreground/60 mb-2 uppercase tracking-wider">
                <Wallet className="w-4 h-4 mr-2" /> Presupuesto Mensual
              </label>
              <input 
                type="number" 
                value={profile.monthly_budget || 0} 
                onChange={e => setProfile({...profile, monthly_budget: Number(e.target.value)})}
                className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl disabled:opacity-50 hover:bg-blue-700 transition-colors shadow-md mt-4"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 bg-red-500/10 text-red-600 font-bold py-4 rounded-3xl hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión Segura</span>
          </button>
          
        </div>
      )}
    </main>
  )
}

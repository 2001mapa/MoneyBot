'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, LogOut, User, Coins, Bot, Wallet, MessageCircle, CheckCircle, XCircle, Save, PieChart, Lock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { OTPVerification } from '@/components/OTPVerification'

const CURRENCIES = [
  { value: 'COP', label: 'COP — Peso Colombiano', symbol: '$' },
  { value: 'USD', label: 'USD — Dólar', symbol: '$' },
  { value: 'EUR', label: 'EUR — Euro', symbol: '€' },
  { value: 'MXN', label: 'MXN — Peso Mexicano', symbol: '$' },
  { value: 'ARS', label: 'ARS — Peso Argentino', symbol: '$' },
  { value: 'VES', label: 'VES — Bolívar Venezolano', symbol: 'Bs.' },
]

const THEMES = [
  { value: 'navy-saas',          label: 'Midnight',  swatch: '#3B82F6' },
  { value: 'charcoal-lime',      label: 'Carbon',    swatch: '#A3E635' },
  { value: 'emerald-mint',       label: 'Forest',    swatch: '#A7F3D0' },
  { value: 'burgundy-blush',     label: 'Rosewood',  swatch: '#F3D5D8' },
  { value: 'teal-coral',         label: 'Coastal',   swatch: '#FF7F50' },
  { value: 'plum-lavender',      label: 'Velvet',    swatch: '#C4B5FD' },
  { value: 'terracotta-mustard', label: 'Desert',    swatch: '#EAB308' },
  { value: 'midnight-slate',     label: 'Midnight Slate', swatch: '#06B6D4' },
]

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [initialProfile, setInitialProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { setTheme, theme } = useTheme()

  const hasChanges = JSON.stringify(profile) !== JSON.stringify(initialProfile)

  const handleDeleteData = async () => {
    setDeleting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    // Delete all related records
    await Promise.all([
      supabase.from('transactions').delete().eq('user_id', user.id),
      supabase.from('debts').delete().eq('user_id', user.id),
      supabase.from('savings_goals').delete().eq('user_id', user.id),
      supabase.from('categories').delete().eq('user_id', user.id),
      supabase.from('debt_payments').delete().eq('user_id', user.id),
    ])
    
    setDeleting(false)
    setShowDeleteModal(false)
    router.push('/')
  }

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return setLoading(false)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setInitialProfile(data)
      }
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
    await supabase.from('profiles').update({
      bot_alias: profile.bot_alias,
      theme: profile.theme,
      currency: profile.currency,
      monthly_budget: profile.monthly_budget,
      needs_percent: profile.needs_percent ?? 50,
      wants_percent: profile.wants_percent ?? 30,
      savings_percent: profile.savings_percent ?? 20
    }).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setInitialProfile(profile)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <main className="flex-1 pb-28 max-w-lg mx-auto w-full">

      {/* Header */}
      <header className="flex items-center gap-4 px-6 pt-10 pb-6">
        <Link href="/" className="p-2 glass border border-border/50 rounded-xl hover:border-border transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-0.5">Configuración</p>
          <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
        </div>
      </header>

      {loading ? (
        <div className="px-6 space-y-4">
          {/* User card skeleton */}
          <div className="rounded-3xl border border-border/30 p-5 flex items-center gap-4">
            <div className="skeleton w-16 h-16 rounded-2xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-3 w-52" />
              <div className="skeleton h-3 w-28 mt-1" />
            </div>
          </div>
          {/* Bot settings skeleton */}
          <div className="rounded-3xl border border-border/30 p-5 space-y-4">
            <div className="skeleton h-3 w-24" />
            <div className="space-y-2">
              <div className="skeleton h-3 w-36" />
              <div className="skeleton h-11 w-full rounded-2xl" />
            </div>
            <div className="space-y-2">
              <div className="skeleton h-3 w-36" />
              <div className="skeleton h-11 w-full rounded-2xl" />
            </div>
          </div>
          {/* Preferences skeleton */}
          <div className="rounded-3xl border border-border/30 p-5 space-y-4">
            <div className="skeleton h-3 w-28" />
            <div className="space-y-2">
              <div className="skeleton h-3 w-20" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton h-10 rounded-xl" />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="skeleton h-3 w-24" />
              <div className="grid grid-cols-3 gap-2">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="skeleton h-9 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
          <div className="skeleton h-14 w-full rounded-2xl" />
          <div className="skeleton h-14 w-full rounded-2xl" />
        </div>
      ) : !profile ? (
        <div className="px-6 text-center py-20">
          <p className="text-muted-foreground text-sm">Error al cargar el perfil.</p>
        </div>
      ) : (
        <div className="px-6 space-y-4">

          {/* User Card */}
          <div className="glass p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-base truncate">{profile.full_name || profile.email}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{profile.email}</p>
              <div className="flex items-center gap-1.5 mt-2">
                {profile.telegram_chat_id ? (
                  <CheckCircle className="w-3.5 h-3.5 text-income flex-shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-expense flex-shrink-0" />
                )}
                <span className={`text-xs font-semibold ${profile.telegram_chat_id ? 'text-income' : 'text-expense'}`}>
                  {profile.telegram_chat_id ? 'Telegram vinculado' : 'Telegram no vinculado'}
                </span>
              </div>
              {!profile.telegram_chat_id && (
                <a 
                  href="https://t.me/PanelFinancieroBot" 
                  target="_blank"
                  className="mt-4 block w-full py-2.5 px-4 bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9]/20 transition-all font-bold text-sm text-center rounded-xl"
                >
                  Conectar con Telegram
                </a>
              )}
            </div>
          </div>

          {/* Bot Settings */}
          <div className="glass p-5 space-y-5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Asistente</p>

            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                <Bot className="w-3.5 h-3.5" />
                Nombre del Asistente
              </label>
              <input
                type="text"
                value={profile.bot_alias || ''}
                onChange={e => setProfile({ ...profile, bot_alias: e.target.value })}
                placeholder="Ej: Luka, Finanzas, MoneyBot…"
                className="w-full glass border border-border/50 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                <Wallet className="w-3.5 h-3.5" />
                Presupuesto Mensual
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground">$</span>
                <input
                  type="number"
                  value={profile.monthly_budget || 0}
                  onChange={e => setProfile({ ...profile, monthly_budget: Number(e.target.value) })}
                  className="w-full glass border border-border/50 rounded-2xl pl-8 pr-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
            </div>
          </div>

          {/* Regla 50/30/20 */}
          <div className="glass p-5 space-y-5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Inteligencia Financiera</p>
            
            <div>
              <label className="flex justify-between items-center text-xs font-semibold text-muted-foreground mb-4">
                <span className="flex items-center gap-2">
                  <PieChart className="w-3.5 h-3.5" />
                  Regla de Distribución
                </span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  (profile.needs_percent ?? 50) + (profile.wants_percent ?? 30) + (profile.savings_percent ?? 20) === 100 
                  ? 'bg-income/20 text-income' : 'bg-expense/20 text-expense'
                }`}>
                  Total: {(profile.needs_percent ?? 50) + (profile.wants_percent ?? 30) + (profile.savings_percent ?? 20)}%
                </span>
              </label>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span>Necesidades</span>
                    <span className="font-bold">{profile.needs_percent ?? 50}%</span>
                  </div>
                  <input
                    type="range"
                    min="0" max="100"
                    value={profile.needs_percent ?? 50}
                    onChange={e => setProfile({ ...profile, needs_percent: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span>Deseos</span>
                    <span className="font-bold">{profile.wants_percent ?? 30}%</span>
                  </div>
                  <input
                    type="range"
                    min="0" max="100"
                    value={profile.wants_percent ?? 30}
                    onChange={e => setProfile({ ...profile, wants_percent: Number(e.target.value) })}
                    className="w-full accent-expense"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span>Ahorro / Metas</span>
                    <span className="font-bold">{profile.savings_percent ?? 20}%</span>
                  </div>
                  <input
                    type="range"
                    min="0" max="100"
                    value={profile.savings_percent ?? 20}
                    onChange={e => setProfile({ ...profile, savings_percent: Number(e.target.value) })}
                    className="w-full accent-income"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="glass p-5 space-y-5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Preferencias</p>

            {/* Currency */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                <Coins className="w-3.5 h-3.5" />
                Moneda
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CURRENCIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setProfile({ ...profile, currency: c.value })}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      profile.currency === c.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground'
                    }`}
                  >
                    <span className="text-base font-black">{c.symbol}</span>
                    <span className="text-xs font-bold">{c.value}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme picker */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                <MessageCircle className="w-3.5 h-3.5" />
                Tema Visual
              </label>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setProfile({ ...profile, theme: t.value })
                      setTheme(t.value)
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      (profile.theme || theme) === t.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ background: t.swatch }}
                    />
                    <span className="text-xs font-bold truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="glass p-5 space-y-5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Seguridad</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm">Bloqueo por PIN</p>
                  <p className="text-xs text-muted-foreground">Protege tu app con código</p>
                </div>
              </div>
              <div className="flex gap-2">
                {profile.pin_hash && (
                  <button 
                    onClick={async () => {
                      await fetch('/api/pin/lock', { method: 'POST' })
                      router.push('/lock')
                      router.refresh()
                    }}
                    className="px-4 py-2 border border-border/50 text-muted-foreground text-xs font-bold rounded-lg hover:bg-white/5 transition-all"
                  >
                    Bloquear Ahora
                  </button>
                )}
                <button 
                  onClick={() => setShowPinSetup(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 transition-all"
                >
                  {profile.pin_hash ? 'Cambiar PIN' : 'Configurar'}
                </button>
              </div>
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || (!hasChanges && !saved)}
            className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-2xl transition-all shadow-lg ${
              saved
                ? 'bg-income text-white'
                : hasChanges
                  ? 'bg-primary text-primary-foreground hover:opacity-90'
                  : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <span>Guardando...</span>
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>¡Cambios guardados!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>

          {/* Reset Data */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-expense/25 text-expense font-bold hover:bg-expense/10 transition-all mb-4"
          >
            <XCircle className="w-4 h-4" />
            <span>Eliminar Todos los Registros</span>
          </button>

          {/* Logout */}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-muted/50 text-foreground font-bold hover:bg-muted transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>

        </div>
      )}

      {/* PIN Setup Modal */}
      {showPinSetup && (
        <div className="fixed inset-0 z-50 bg-[#0B0F19]">
          <button 
            onClick={() => setShowPinSetup(false)}
            className="absolute top-6 left-6 z-50 p-2 glass border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <OTPVerification
            title="Nuevo PIN"
            subtitle="Ingresa 4 dígitos para proteger tu app"
            hideToast={true}
            onVerify={async (code) => {
              const res = await fetch('/api/pin', {
                method: 'POST',
                body: JSON.stringify({ action: 'setup', pin: code }),
                headers: { 'Content-Type': 'application/json' }
              })
              return res.ok
            }}
            onSuccess={() => {
              setShowPinSetup(false)
              setProfile({ ...profile, pin_hash: 'set' }) // just to update UI state locally
            }}
          />
        </div>
      )}

      {/* Reset Data Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm glass p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-expense/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-6 h-6 text-expense" />
              </div>
              <h3 className="text-lg font-black tracking-tight">¿Borrar todo?</h3>
              <p className="text-sm text-muted-foreground font-medium px-4">
                Esto eliminará todas tus transacciones, deudas, metas y categorías de forma irreversible.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="py-3 px-4 rounded-xl font-bold text-sm bg-muted text-muted-foreground hover:bg-muted/80 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteData}
                disabled={deleting}
                className="py-3 px-4 rounded-xl font-bold text-sm bg-expense text-white shadow-lg shadow-expense/25 hover:opacity-90 transition-all disabled:opacity-50"
              >
                {deleting ? 'Borrando...' : 'Sí, borrar todo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm glass p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="text-lg font-black tracking-tight">¿Cerrar Sesión?</h3>
              <p className="text-sm text-muted-foreground font-medium px-4">
                Tendrás que volver a iniciar sesión para ver tus finanzas en la web.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="py-3 px-4 rounded-xl font-bold text-sm bg-muted text-muted-foreground hover:bg-muted/80 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="py-3 px-4 rounded-xl font-bold text-sm bg-foreground text-background shadow-lg hover:opacity-90 transition-all"
              >
                Sí, salir
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

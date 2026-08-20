import { createClient } from '@/lib/supabase/server'
import { Target, PieChart, Coins } from 'lucide-react'

export default async function PlanningPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch profile, current month txs, and savings goals
  const now = new Date()
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [profileRes, txRes, goalsRes] = await Promise.all([
    supabase.from('profiles').select('needs_percent, wants_percent, savings_percent, currency').eq('id', user.id).single(),
    supabase.from('transactions').select('amount, type, categories(bucket)').eq('user_id', user.id).gte('transaction_date', startOfMonth),
    supabase.from('savings_goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  ])

  const profile = profileRes.data || { needs_percent: 50, wants_percent: 30, savings_percent: 20, currency: 'COP' }
  const transactions = txRes.data || []
  const goals = goalsRes.data || []

  // Calc incomes and bucket expenses
  let totalIncome = 0
  let needsSpent = 0
  let wantsSpent = 0
  let savingsSpent = 0

  transactions.forEach(tx => {
    if (tx.type === 'income') {
      totalIncome += Number(tx.amount)
    } else if (tx.type === 'expense') {
      const cat = Array.isArray(tx.categories) ? tx.categories[0] : tx.categories
      const bucket = cat?.bucket || 'needs'
      if (bucket === 'needs') needsSpent += Number(tx.amount)
      else if (bucket === 'wants') wantsSpent += Number(tx.amount)
      else if (bucket === 'savings') savingsSpent += Number(tx.amount)
    }
  })

  // Target values based on percentages
  const needsTarget = totalIncome * ((profile.needs_percent ?? 50) / 100)
  const wantsTarget = totalIncome * ((profile.wants_percent ?? 30) / 100)
  const savingsTarget = totalIncome * ((profile.savings_percent ?? 20) / 100)

  const getProgress = (spent: number, target: number) => {
    if (target === 0) return 0
    return Math.min(100, Math.round((spent / target) * 100))
  }

  const needsProgress = getProgress(needsSpent, needsTarget)
  const wantsProgress = getProgress(wantsSpent, wantsTarget)
  const savingsProgress = getProgress(savingsSpent, savingsTarget)

  return (
    <main className="flex-1 pb-28 max-w-lg mx-auto w-full px-6 pt-10">
      <header className="mb-6">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-1">Inteligencia</p>
        <h1 className="text-2xl font-bold tracking-tight">Regla de Distribución</h1>
      </header>

      {/* Bento 1: 50/30/20 Activity Rings */}
      <div className="glass p-6 mb-6 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 min-h-[200px]">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        
        {/* Anillos SVG (iOS Activity Rings Style) */}
        <div className="relative z-10 flex shrink-0 justify-center">
          <svg width="180" height="180" viewBox="0 0 120 120" className="-rotate-90 filter drop-shadow-md">
            {/* Needs Ring */}
            <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-primary/20" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 50} strokeDashoffset={(2 * Math.PI * 50) * (1 - Math.min(1, needsSpent / (needsTarget || 1)))} className="text-primary transition-all duration-1000" />
            
            {/* Wants Ring */}
            <circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" strokeWidth="8" className="text-expense/20" />
            <circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 38} strokeDashoffset={(2 * Math.PI * 38) * (1 - Math.min(1, wantsSpent / (wantsTarget || 1)))} className="text-expense transition-all duration-1000" />
            
            {/* Savings Ring */}
            <circle cx="60" cy="60" r="26" fill="none" stroke="currentColor" strokeWidth="8" className="text-yellow-500/20" />
            <circle cx="60" cy="60" r="26" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 26} strokeDashoffset={(2 * Math.PI * 26) * (1 - Math.min(1, savingsSpent / (savingsTarget || 1)))} className="text-yellow-500 transition-all duration-1000" />
          </svg>
          {/* Inner text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-muted-foreground uppercase">Ingresos</span>
            <span className="text-base font-black text-foreground">${(totalIncome / 1000).toFixed(0)}k</span>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full space-y-4 z-10">
          <div className="flex justify-between items-center bg-muted/20 px-4 py-3 rounded-2xl min-h-[44px]">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)] shrink-0" />
              <div className="leading-tight">
                <p className="text-sm font-bold">Necesidades</p>
                <p className="text-xs text-muted-foreground font-semibold">{profile.needs_percent}% del total</p>
              </div>
            </div>
            <div className="text-right leading-tight">
              <p className="text-sm font-bold text-primary">${needsSpent.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground font-semibold">/ ${needsTarget.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex justify-between items-center bg-muted/20 px-4 py-3 rounded-2xl min-h-[44px]">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-expense shadow-[0_0_8px_var(--expense)] shrink-0" />
              <div className="leading-tight">
                <p className="text-sm font-bold">Deseos</p>
                <p className="text-xs text-muted-foreground font-semibold">{profile.wants_percent}% del total</p>
              </div>
            </div>
            <div className="text-right leading-tight">
              <p className="text-sm font-bold text-expense">${wantsSpent.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground font-semibold">/ ${wantsTarget.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex justify-between items-center bg-muted/20 px-4 py-3 rounded-2xl min-h-[44px]">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-yellow-500 shadow-[0_0_8px_var(--color-yellow-500)] shrink-0" />
              <div className="leading-tight">
                <p className="text-sm font-bold">Ahorros</p>
                <p className="text-xs text-muted-foreground font-semibold">{profile.savings_percent}% del total</p>
              </div>
            </div>
            <div className="text-right leading-tight">
              <p className="text-sm font-bold text-yellow-500">${savingsSpent.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground font-semibold">/ ${savingsTarget.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Savings Goals */}
      <header className="flex justify-between items-end mb-4 mt-8">
        <div>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-1">Bolsillos</p>
          <h2 className="text-xl font-bold tracking-tight">Metas de Ahorro</h2>
        </div>
        <Target strokeWidth={1.5} className="w-5 h-5 text-muted-foreground" />
      </header>

      <div className="grid grid-cols-1 gap-4">
        {goals.length === 0 ? (
          <div className="text-center py-10 glass p-6">
            <p className="text-3xl mb-2">🎯</p>
            <p className="text-sm text-muted-foreground font-medium">Sin metas activas</p>
            <p className="text-xs text-muted-foreground mt-1 opacity-60">Dile a Luka: "Crea una meta para..."</p>
          </div>
        ) : (
          goals.map(goal => {
            const goalProgress = getProgress(Number(goal.current_amount), Number(goal.target_amount))
            return (
              <div key={goal.id} className="glass p-5 hover:border-blue-500/50 transition-all group">
                <div className="flex items-center space-x-4 mb-3">
                  <div className="w-12 h-12 squircle flex items-center justify-center text-2xl bg-blue-500/10 text-blue-500 flex-shrink-0 group-hover:scale-110 transition-transform">
                    {goal.icon || '🎯'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base truncate text-foreground">{goal.name}</p>
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                      Faltan ${(Number(goal.target_amount) - Number(goal.current_amount)).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-blue-500 text-lg">{goalProgress}%</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 mt-4">
                  <button className="w-12 h-12 rounded-full bg-muted text-foreground flex items-center justify-center hover:bg-border transition-colors shrink-0 shadow-sm">
                    <span className="text-2xl font-black mb-0.5">-</span>
                  </button>
                  <div className="flex-1 relative h-5 bg-border/30 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 shadow-[0_0_12px_rgba(59,130,246,0.5)]" 
                      style={{ width: `${goalProgress}%` }}
                    />
                  </div>
                  <button className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center hover:opacity-90 transition-opacity shrink-0 shadow-md">
                    <span className="text-2xl font-black mb-0.5">+</span>
                  </button>
                </div>

                <div className="flex justify-between mt-3 px-12 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <span>${Number(goal.current_amount).toLocaleString()}</span>
                  <span>${Number(goal.target_amount).toLocaleString()}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

    </main>
  )
}

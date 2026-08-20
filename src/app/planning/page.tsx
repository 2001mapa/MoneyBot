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

      {/* 50/30/20 Card */}
      <div className="glass space-y-6 mb-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
        
        <div className="relative z-10">
          <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-widest">Ingresos del Mes</p>
          <p className="text-3xl font-black text-foreground mb-6">${totalIncome.toLocaleString()}</p>

          <div className="space-y-5">
            {/* Needs */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-sm font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]"></span>
                    Necesidades ({profile.needs_percent ?? 50}%)
                  </p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    ${needsSpent.toLocaleString()} / ${needsTarget.toLocaleString()}
                  </p>
                </div>
                <span className={`text-xs font-black ${needsProgress >= 100 ? 'text-expense' : 'text-primary'}`}>
                  {needsProgress}%
                </span>
              </div>
              <div className="h-2 w-full bg-border/40 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${needsProgress >= 100 ? 'bg-expense shadow-[0_0_10px_var(--expense)]' : 'bg-primary shadow-[0_0_10px_var(--primary)]'}`} 
                  style={{ width: `${needsProgress}%` }}
                />
              </div>
            </div>

            {/* Wants */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-sm font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-expense shadow-[0_0_8px_var(--expense)]"></span>
                    Deseos ({profile.wants_percent ?? 30}%)
                  </p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    ${wantsSpent.toLocaleString()} / ${wantsTarget.toLocaleString()}
                  </p>
                </div>
                <span className={`text-xs font-black text-expense`}>
                  {wantsProgress}%
                </span>
              </div>
              <div className="h-2 w-full bg-border/40 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000 bg-expense shadow-[0_0_10px_var(--expense)]" 
                  style={{ width: `${wantsProgress}%` }}
                />
              </div>
            </div>

            {/* Savings */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-sm font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gold shadow-[0_0_8px_var(--gold)]"></span>
                    Ahorro ({profile.savings_percent ?? 20}%)
                  </p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    ${savingsSpent.toLocaleString()} / ${savingsTarget.toLocaleString()}
                  </p>
                </div>
                <span className={`text-xs font-black text-gold`}>
                  {savingsProgress}%
                </span>
              </div>
              <div className="h-2 w-full bg-border/40 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000 bg-gold shadow-[0_0_10px_var(--gold)]" 
                  style={{ width: `${savingsProgress}%` }}
                />
              </div>
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
          <div className="text-center py-10 glass">
            <p className="text-3xl mb-2">🎯</p>
            <p className="text-sm text-muted-foreground font-medium">Sin metas activas</p>
            <p className="text-xs text-muted-foreground mt-1 opacity-60">Dile a Luka: "Crea una meta para..."</p>
          </div>
        ) : (
          goals.map(goal => {
            const goalProgress = getProgress(Number(goal.current_amount), Number(goal.target_amount))
            return (
              <div key={goal.id} className="glass p-5 hover:border-gold/50 transition-all group">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-gold/10 flex-shrink-0 group-hover:scale-110 transition-transform">
                    {goal.icon || '🎯'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base truncate text-slate-200">{goal.name}</p>
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                      Faltan ${(Number(goal.target_amount) - Number(goal.current_amount)).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gold text-lg">{goalProgress}%</p>
                  </div>
                </div>
                
                <div className="h-2 w-full bg-border/40 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 bg-gold shadow-[0_0_8px_var(--gold)]" 
                    style={{ width: `${goalProgress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 px-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
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

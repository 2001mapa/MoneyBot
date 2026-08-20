import { createClient } from '@/lib/supabase/server'
import { GoalCard } from '@/components/GoalCard'
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
    supabase.from('transactions').select('amount, type, description, categories(bucket)').eq('user_id', user.id).gte('transaction_date', startOfMonth),
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
    const desc = tx.description?.toLowerCase() || ''
    const isTransfer = desc.startsWith('transferencia ')

    if (tx.type === 'income') {
      if (!isTransfer) {
        totalIncome += Number(tx.amount)
      }
    } else if (tx.type === 'expense') {
      if (!isTransfer) {
        const cat = Array.isArray(tx.categories) ? tx.categories[0] : tx.categories
        let bucket = cat?.bucket
        
        // Inferir bucket para transacciones espejo (que no tienen category_id)
        if (!bucket) {
          if (desc.includes('ahorro en meta') || desc.includes('préstamo')) {
            bucket = 'savings' // Ahorros y préstamos son del 20%
          } else {
            bucket = 'needs' // Abono a deudas o gastos sin categoría son del 50%
          }
        }

        if (bucket === 'needs') needsSpent += Number(tx.amount)
        else if (bucket === 'wants') wantsSpent += Number(tx.amount)
        else if (bucket === 'savings') savingsSpent += Number(tx.amount)
      }
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
            <span className="text-base font-black text-foreground">
              ${totalIncome >= 1000000 ? (totalIncome / 1000000).toFixed(1).replace('.0', '') + 'M' : totalIncome >= 1000 ? (totalIncome / 1000).toFixed(0) + 'k' : totalIncome}
            </span>
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
          goals.map(goal => (
            <GoalCard key={goal.id} goal={goal} userId={user.id} />
          ))
        )}
      </div>

    </main>
  )
}

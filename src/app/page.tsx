import { TrendingDown, TrendingUp, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { DashboardActions } from '@/components/DashboardActions'
export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const [profileRes, transactionsRes, allTxRes, allDebtsRes, savingsRes] = await Promise.all([
    supabase.from('profiles').select('full_name, currency, monthly_budget, needs_percent, wants_percent, savings_percent').eq('id', user.id).single(),
    supabase.from('transactions').select('*, categories(name, icon, color, bucket)').eq('user_id', user.id).order('transaction_date', { ascending: false }).limit(6),
    supabase.from('transactions').select('amount, type, transaction_date, created_at, payment_method, categories(bucket)').eq('user_id', user.id),
    supabase.from('debts').select('debt_type, balance_remaining, status, payment_method').eq('user_id', user.id).neq('status', 'paid'),
    supabase.from('savings_goals').select('current_amount').eq('user_id', user.id)
  ])

  let profile = { 
    full_name: '', 
    currency: 'COP', 
    monthly_budget: 0, 
    needs_percent: 50, 
    wants_percent: 30, 
    savings_percent: 20 
  }
  if (profileRes.data) profile = { ...profile, ...profileRes.data }

  const fallbackName = profile.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario'

  const transactions = transactionsRes.data || []

  let totalBalance = 0, bankBalance = 0, cashBalance = 0, ingresosMes = 0, gastosMes = 0
  let needsSpent = 0, wantsSpent = 0, savingsSpent = 0

  if (allTxRes.data) {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    allTxRes.data.forEach(tx => {
      const dateString = (tx.transaction_date || tx.created_at).split('T')[0]
      const parts = dateString.split('-')
      const isCurrentMonth = parseInt(parts[0]) === currentYear && parseInt(parts[1]) - 1 === currentMonth
      const isBank = ['tarjeta', 'transferencia', 'nequi', 'daviplata', 'banco'].includes((tx.payment_method || '').toLowerCase())

      if (tx.type === 'income') {
        totalBalance += Number(tx.amount)
        if (isBank) bankBalance += Number(tx.amount); else cashBalance += Number(tx.amount)
        if (isCurrentMonth) ingresosMes += Number(tx.amount)
      } else if (tx.type === 'expense') {
        totalBalance -= Number(tx.amount)
        if (isBank) bankBalance -= Number(tx.amount); else cashBalance -= Number(tx.amount)
        if (isCurrentMonth) {
          gastosMes += Number(tx.amount)
          const cat = Array.isArray(tx.categories) ? tx.categories[0] : tx.categories
          const bucket = cat?.bucket || 'needs'
          if (bucket === 'needs') needsSpent += Number(tx.amount)
          else if (bucket === 'wants') wantsSpent += Number(tx.amount)
          else if (bucket === 'savings') savingsSpent += Number(tx.amount)
        }
      }
    })
  }

  if (allDebtsRes.data) {
    allDebtsRes.data.forEach(debt => {
      if (debt.status === 'cancelled') return
      const isBank = ['tarjeta', 'transferencia', 'nequi', 'daviplata', 'banco'].includes((debt.payment_method || '').toLowerCase())
      if (debt.debt_type === 'i_owe') {
        totalBalance += Number(debt.balance_remaining)
        if (isBank) bankBalance += Number(debt.balance_remaining); else cashBalance += Number(debt.balance_remaining)
      } else if (debt.debt_type === 'they_owe') {
        totalBalance -= Number(debt.balance_remaining)
        if (isBank) bankBalance -= Number(debt.balance_remaining); else cashBalance -= Number(debt.balance_remaining)
      }
    })
  }

  let totalSavings = 0
  if (savingsRes.data) savingsRes.data.forEach(g => { totalSavings += Number(g.current_amount) })

  const availableLiquidity = totalBalance - totalSavings
  const isPositive = availableLiquidity >= 0

  // Calc 50/30/20 targets based on income (or monthly_budget if preferred, planning uses income)
  const targetBase = ingresosMes > 0 ? ingresosMes : profile.monthly_budget
  const needsTarget = targetBase * ((profile.needs_percent ?? 50) / 100)
  const wantsTarget = targetBase * ((profile.wants_percent ?? 30) / 100)
  const savingsTarget = targetBase * ((profile.savings_percent ?? 20) / 100)

  const getProgress = (spent: number, target: number) => target === 0 ? 0 : Math.min(100, Math.round((spent / target) * 100))
  const needsProgress = getProgress(needsSpent, needsTarget)
  const wantsProgress = getProgress(wantsSpent, wantsTarget)
  const savingsProgress = getProgress(savingsSpent, savingsTarget)

  return (
    <main className="flex-1 pb-28 max-w-lg mx-auto w-full pt-safe px-4 sm:px-6">

      {/* Header */}
      <header className="flex justify-between items-start pt-6 pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 opacity-60">
            Panel Financiero
          </p>
          <h1 className="text-2xl font-black tracking-tight">
            Hola, {fallbackName.split(' ')[0]} 👋
          </h1>
        </div>
        {/* Avatar Profile Link */}
        <Link href="/profile" className="w-12 h-12 rounded-full border border-border/50 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="w-full h-full flex items-center justify-center font-bold text-sm bg-primary/10 text-primary">
            {fallbackName.charAt(0).toUpperCase()}
          </div>
        </Link>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Bento 1: Hero Liquidity (Ancho Completo) */}
        <div className="md:col-span-2">
          <div className="card-hero relative overflow-hidden flex flex-col justify-between p-6 h-full min-h-[220px]">
            {/* Top row */}
            <div className="flex justify-between items-start z-10">
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                Liquidez Disponible
              </p>
            </div>
            
            {/* Main Balance */}
            <div className="z-10 mt-2 mb-4">
              <h2 className="text-4xl font-black text-white tracking-tighter truncate">
                {isPositive ? '' : '-'}${Math.abs(availableLiquidity).toLocaleString()}
              </h2>
            </div>

            {/* Sub balances as floating pills inside */}
            <div className="flex gap-2 z-10 w-full overflow-x-auto pb-1 scrollbar-hide">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2.5 border border-white/10 shrink-0">
                <span className="text-xs text-white/60 uppercase font-bold tracking-wider">Banco</span>
                <span className="text-sm font-bold text-white">${bankBalance.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2.5 border border-white/10 shrink-0">
                <span className="text-xs text-white/60 uppercase font-bold tracking-wider">Efec</span>
                <span className="text-sm font-bold text-white">${cashBalance.toLocaleString()}</span>
              </div>
            </div>

            {/* Quick Actions overlaying bottom right (optional style) or just glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 blur-[100px] rounded-full pointer-events-none" />
          </div>
        </div>

        {/* Quick Action Buttons (Bento Cells) */}
        <DashboardActions userId={user.id} />

        {/* Bento 2: Distribución Resumida */}
        <div className="md:col-span-2 glass p-5">
          <div className="flex justify-between items-center mb-4 min-h-[44px]">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Distribución {profile.needs_percent}/{profile.wants_percent}/{profile.savings_percent}</p>
            <Link href="/planning" className="p-2 -mr-2 text-primary opacity-80 hover:opacity-100 transition-opacity">
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
          
          <div className="space-y-4">
            {/* Needs */}
            <div className="relative h-6 bg-border/50 rounded-full overflow-hidden shadow-inner">
              <div 
                className="absolute top-0 left-0 h-full rounded-full bg-primary transition-all duration-1000 shadow-[0_0_8px_var(--primary)]"
                style={{ width: `${needsProgress}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-black tracking-widest text-foreground pointer-events-none drop-shadow-md">
                <span>NECESIDADES</span>
                <span>{needsProgress}%</span>
              </div>
            </div>
            {/* Wants */}
            <div className="relative h-6 bg-border/50 rounded-full overflow-hidden shadow-inner">
              <div 
                className="absolute top-0 left-0 h-full rounded-full bg-expense transition-all duration-1000 shadow-[0_0_8px_var(--expense)]"
                style={{ width: `${wantsProgress}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-black tracking-widest text-foreground pointer-events-none drop-shadow-md">
                <span>DESEOS</span>
                <span>{wantsProgress}%</span>
              </div>
            </div>
            {/* Savings */}
            <div className="relative h-6 bg-border/50 rounded-full overflow-hidden shadow-inner">
              <div 
                className="absolute top-0 left-0 h-full rounded-full bg-yellow-500 transition-all duration-1000 shadow-[0_0_8px_var(--color-yellow-500)]"
                style={{ width: `${savingsProgress}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-black tracking-widest text-foreground pointer-events-none drop-shadow-md">
                <span>AHORROS</span>
                <span>{savingsProgress}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bento 3: Actividad Reciente */}
        <section className="md:col-span-2 glass p-5">
          <div className="flex justify-between items-center mb-4 min-h-[44px]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recientes</h3>
            <Link href="/transactions"
              className="p-2 -mr-2 text-xs uppercase tracking-wider font-bold text-primary hover:underline">
              Ver Todo
            </Link>
          </div>

          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-8 bg-muted/20 rounded-2xl">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm font-bold text-muted-foreground">Sin movimientos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx: any) => {
                // Generar fondo pastel basado en el color si existe, o un fallback suave
                const iconColor = tx.categories?.color || (tx.type === 'income' ? '#10b981' : '#f43f5e')
                const isIncome = tx.type === 'income'
                
                return (
                  <Link href="/transactions" key={tx.id} className="tx-row flex justify-between items-center p-2 -mx-2 rounded-[20px] transition-colors cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-12 h-12 squircle flex items-center justify-center text-xl shrink-0"
                        style={{ backgroundColor: `${iconColor}22`, color: iconColor }}
                      >
                        {tx.categories?.icon ?? (isIncome ? '💵' : '🛒')}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm capitalize truncate text-foreground">
                          {tx.description}
                        </p>
                        <p className="text-[11px] font-bold mt-0.5 uppercase tracking-wider text-muted-foreground">
                          {tx.payment_method}
                        </p>
                      </div>
                    </div>
                    <p className={`font-black text-sm tracking-tight shrink-0 ml-2 ${isIncome ? 'text-income' : 'text-foreground'}`}>
                      {isIncome ? '+' : '-'}${Number(tx.amount).toLocaleString()}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </main>
  )
}

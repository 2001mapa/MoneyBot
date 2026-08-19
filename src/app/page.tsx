import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let profile = { full_name: 'Usuario', currency: 'COP' }
  if (user) {
    const { data: profileData } = await supabase.from('profiles').select('full_name, currency').eq('id', user.id).single()
    if (profileData) profile = profileData
  }

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, categories(name, icon, color)')
    .eq('user_id', user?.id || '')
    .order('transaction_date', { ascending: false })
    .limit(10)

  let totalBalance = 0
  let ingresosMes = 0
  let gastosMes = 0

  const { data: allTx } = await supabase
    .from('transactions').select('*, categories(icon)').eq('user_id', user?.id || '')
  
  if (allTx) {
    allTx.forEach(tx => {
      if (tx.type === 'income') { totalBalance += Number(tx.amount); ingresosMes += Number(tx.amount) }
      else if (tx.type === 'expense') { totalBalance -= Number(tx.amount); gastosMes += Number(tx.amount) }
    })
  }

  const { data: allDebts } = await supabase.from('debts').select('*').eq('user_id', user?.id || '').neq('status', 'paid')
  if (allDebts) {
    allDebts.forEach(debt => {
      if (debt.debt_type === 'i_owe') totalBalance += Number(debt.balance_remaining)
      else if (debt.debt_type === 'they_owe') totalBalance -= Number(debt.balance_remaining)
    })
  }

  const isPositive = totalBalance >= 0

  return (
    <main className="flex-1 pb-28 max-w-lg mx-auto w-full">

      {/* Header */}
      <header className="flex justify-between items-start px-6 pt-10 pb-6">
        <div>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-1">Panel Financiero</p>
          <h1 className="text-2xl font-bold tracking-tight">Hola, {profile.full_name?.split(' ')[0] || 'Usuario'} 👋</h1>
        </div>
        <ThemeSwitcher />
      </header>

      {/* Balance Card — glass hero */}
      <div className="px-6 mb-5">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-7 shadow-2xl">
          {/* Decorative blobs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-black/15 blur-2xl" />
          <div className="absolute top-4 right-5 opacity-10">
            <Wallet className="w-28 h-28 text-primary-foreground" />
          </div>
          <div className="relative z-10">
            <p className="text-primary-foreground/60 font-semibold text-xs uppercase tracking-widest mb-3">Balance Total</p>
            <p className="text-4xl font-black tracking-tight leading-none text-primary-foreground">
              {isPositive ? '+' : ''}<span className="text-5xl">${Math.abs(totalBalance).toLocaleString()}</span>
            </p>
            <p className="text-primary-foreground/50 text-sm font-medium mt-3">{profile.currency} · Liquidez real disponible</p>
          </div>
        </div>
      </div>

      {/* Stats — glass cards */}
      <div className="grid grid-cols-2 gap-3 px-6 mb-6">
        <div className="glass border border-border/50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Ingresos</p>
            <div className="p-1.5 rounded-lg bg-income/15">
              <TrendingUp className="w-3.5 h-3.5 text-income" />
            </div>
          </div>
          <p className="font-black text-xl tracking-tight text-income">${ingresosMes.toLocaleString()}</p>
        </div>
        <div className="glass border border-border/50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Gastos</p>
            <div className="p-1.5 rounded-lg bg-expense/15">
              <TrendingDown className="w-3.5 h-3.5 text-expense" />
            </div>
          </div>
          <p className="font-black text-xl tracking-tight text-expense">${gastosMes.toLocaleString()}</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <section className="px-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold">Movimientos Recientes</h3>
          <span className="text-xs font-semibold text-primary">Ver todos</span>
        </div>
        
        <div className="space-y-2">
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-14 glass border border-border/50 rounded-3xl">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm text-muted-foreground font-medium">Sin movimientos aún</p>
              <p className="text-xs text-muted-foreground mt-1 opacity-60">Dile algo a Luka por Telegram</p>
            </div>
          ) : (
            transactions.map((tx: any) => (
              <div key={tx.id} className="flex justify-between items-center p-4 rounded-2xl glass border border-border/40 hover:border-border/70 transition-all cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl glass border border-border/40 flex-shrink-0">
                    {tx.categories?.icon ?? (tx.type === 'income' ? '💵' : '🛒')}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm capitalize truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{tx.payment_method}</p>
                  </div>
                </div>
                <p className={`font-black text-sm tracking-tight flex-shrink-0 ml-2 ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
                  {tx.type === 'income' ? '+' : '-'}${Number(tx.amount).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  )
}

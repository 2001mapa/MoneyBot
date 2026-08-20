import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null;
  }

  // Ejecutar queries pesadas en paralelo (Performance fix - Arch Agent)
  const [profileRes, transactionsRes, allTxRes, allDebtsRes, savingsRes] = await Promise.all([
    supabase.from('profiles').select('full_name, currency').eq('id', user.id).single(),
    supabase.from('transactions').select('*, categories(name, icon, color)').eq('user_id', user.id).order('transaction_date', { ascending: false }).limit(10),
    supabase.from('transactions').select('amount, type, transaction_date, created_at, payment_method').eq('user_id', user.id),
    supabase.from('debts').select('debt_type, balance_remaining, status, payment_method').eq('user_id', user.id).neq('status', 'paid'),
    supabase.from('savings_goals').select('current_amount').eq('user_id', user.id)
  ]);

  let profile = { full_name: 'Usuario', currency: 'COP' }
  if (profileRes.data) profile = profileRes.data

  const transactions = transactionsRes.data || []

  let totalBalance = 0
  let bankBalance = 0
  let cashBalance = 0
  let ingresosMes = 0
  let gastosMes = 0

  if (allTxRes.data) {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    allTxRes.data.forEach(tx => {
      const dateString = (tx.transaction_date || tx.created_at).split('T')[0]
      const parts = dateString.split('-')
      const txYear = parseInt(parts[0])
      const txMonth = parseInt(parts[1]) - 1

      const isCurrentMonth = txYear === currentYear && txMonth === currentMonth
      
      const method = tx.payment_method || 'efectivo'
      const isBank = ['tarjeta', 'transferencia', 'nequi', 'daviplata', 'banco'].includes(method.toLowerCase())

      if (tx.type === 'income') { 
        totalBalance += Number(tx.amount)
        if (isBank) bankBalance += Number(tx.amount)
        else cashBalance += Number(tx.amount)
        
        if (isCurrentMonth) ingresosMes += Number(tx.amount)
      } else if (tx.type === 'expense') { 
        totalBalance -= Number(tx.amount)
        if (isBank) bankBalance -= Number(tx.amount)
        else cashBalance -= Number(tx.amount)
        
        if (isCurrentMonth) gastosMes += Number(tx.amount)
      }
    })
  }

  if (allDebtsRes.data) {
    allDebtsRes.data.forEach(debt => {
      if (debt.status === 'cancelled') return
      
      const method = debt.payment_method || 'efectivo'
      const isBank = ['tarjeta', 'transferencia', 'nequi', 'daviplata', 'banco'].includes(method.toLowerCase())
      
      if (debt.debt_type === 'i_owe') {
        totalBalance += Number(debt.balance_remaining)
        if (isBank) bankBalance += Number(debt.balance_remaining)
        else cashBalance += Number(debt.balance_remaining)
      } else if (debt.debt_type === 'they_owe') {
        totalBalance -= Number(debt.balance_remaining)
        if (isBank) bankBalance -= Number(debt.balance_remaining)
        else cashBalance -= Number(debt.balance_remaining)
      }
    })
  }

  let totalSavings = 0
  if (savingsRes.data) {
    savingsRes.data.forEach(goal => {
      totalSavings += Number(goal.current_amount)
    })
  }

  const availableLiquidity = totalBalance - totalSavings
  const isPositive = availableLiquidity >= 0

  return (
    <main className="flex-1 pb-28 max-w-lg mx-auto w-full pt-safe">

      {/* Header */}
      <header className="flex justify-between items-start px-6 pt-6 pb-6">
        <div>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-1">Panel Financiero</p>
          <h1 className="text-2xl font-bold tracking-tight">Hola, {profile.full_name?.split(' ')[0] || 'Usuario'} 👋</h1>
        </div>
      </header>

      {/* Hero Card - Simplified Hick's Law */}
      <div className="px-6 mb-6">
        <div className="glass relative overflow-hidden flex flex-col justify-center items-center text-center p-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gold/10 rounded-full blur-3xl" />
          
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-2 z-10">
            Liquidez Real
          </p>
          <h2 className="text-5xl font-black text-white tracking-tight z-10 mb-4">
            {isPositive ? '+' : ''}${Math.abs(availableLiquidity).toLocaleString()}
          </h2>
          
          <div className="flex gap-4 items-center justify-center z-10 w-full">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Banco</span>
              <span className="text-sm font-semibold">${bankBalance.toLocaleString()}</span>
            </div>
            <div className="w-px h-6 bg-border/50" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Efectivo</span>
              <span className="text-sm font-semibold">${cashBalance.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones Rápidas (Fitts's Law -> 44x44 min) */}
      <div className="px-6 mb-8 grid grid-cols-2 gap-3">
        <Link href="/transactions?type=income" className="glass flex items-center justify-center gap-2 min-h-[56px] hover:bg-primary/5 hover:border-primary/30 transition-all active:scale-95">
          <TrendingUp className="w-5 h-5 text-primary" strokeWidth={1.5} />
          <span className="text-sm font-semibold text-slate-200">Ingreso</span>
        </Link>
        <Link href="/transactions?type=expense" className="glass flex items-center justify-center gap-2 min-h-[56px] hover:bg-expense/5 hover:border-expense/30 transition-all active:scale-95">
          <TrendingDown className="w-5 h-5 text-expense" strokeWidth={1.5} />
          <span className="text-sm font-semibold text-slate-200">Gasto</span>
        </Link>
      </div>

      {/* Recent Transactions Gestalt Group */}
      <section className="px-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-slate-200">Recientes</h3>
          <Link href="/transactions" className="text-[11px] uppercase tracking-wider font-bold text-primary hover:underline">
            Ver Todo
          </Link>
        </div>
        
        <div className="glass p-2">
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm text-muted-foreground font-medium">Sin movimientos</p>
            </div>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-800/30 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-slate-800/50 border border-border/50 flex-shrink-0">
                      {tx.categories?.icon ?? (tx.type === 'income' ? '💵' : '🛒')}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm capitalize truncate text-slate-200">{tx.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{tx.payment_method}</p>
                    </div>
                  </div>
                  <p className={`font-bold text-sm tracking-tight flex-shrink-0 ml-2 ${tx.type === 'income' ? 'text-primary' : 'text-slate-200'}`}>
                    {tx.type === 'income' ? '+' : '-'}${Number(tx.amount).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

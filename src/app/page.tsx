import { TrendingDown, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const [profileRes, transactionsRes, allTxRes, allDebtsRes, savingsRes] = await Promise.all([
    supabase.from('profiles').select('full_name, currency').eq('id', user.id).single(),
    supabase.from('transactions').select('*, categories(name, icon, color)').eq('user_id', user.id).order('transaction_date', { ascending: false }).limit(10),
    supabase.from('transactions').select('amount, type, transaction_date, created_at, payment_method').eq('user_id', user.id),
    supabase.from('debts').select('debt_type, balance_remaining, status, payment_method').eq('user_id', user.id).neq('status', 'paid'),
    supabase.from('savings_goals').select('current_amount').eq('user_id', user.id)
  ])

  let profile = { full_name: 'Usuario', currency: 'COP' }
  if (profileRes.data) profile = profileRes.data

  const transactions = transactionsRes.data || []

  let totalBalance = 0, bankBalance = 0, cashBalance = 0, ingresosMes = 0, gastosMes = 0

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
        if (isCurrentMonth) gastosMes += Number(tx.amount)
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

  return (
    <main className="flex-1 pb-28 max-w-lg mx-auto w-full pt-safe">

      {/* Header */}
      <header className="flex justify-between items-start px-6 pt-6 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
            Panel Financiero
          </p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
            Hola, {profile.full_name?.split(' ')[0] || 'Usuario'} 👋
          </h1>
        </div>
      </header>

      {/* Hero Card — bg-card-dark (60-30-10: el 10% de acento vive aquí) */}
      <div className="px-6 mb-5">
        <div className="card-hero relative overflow-hidden flex flex-col justify-center items-center text-center p-8">
          {/* Soft ambient glow */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20"
            style={{ background: 'var(--primary)' }} />

          <p className="text-xs font-bold uppercase tracking-widest mb-2 z-10 text-white/60">
            Liquidez Real
          </p>
          <h2 className="text-5xl font-black text-white tracking-tight z-10 mb-5">
            {isPositive ? '+' : '-'}${Math.abs(availableLiquidity).toLocaleString()}
          </h2>

          <div className="flex gap-6 items-center justify-center z-10 w-full">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Banco</span>
              <span className="text-sm font-bold text-white">${bankBalance.toLocaleString()}</span>
            </div>
            <div className="w-px h-6 bg-white/20" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Efectivo</span>
              <span className="text-sm font-bold text-white">${cashBalance.toLocaleString()}</span>
            </div>
            <div className="w-px h-6 bg-white/20" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Ahorros</span>
              <span className="text-sm font-bold text-white">${totalSavings.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen del mes — 2 tarjetas neumórficas */}
      <div className="px-6 mb-5 grid grid-cols-2 gap-3">
        <div className="glass p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
            Ingresos
          </p>
          <p className="text-xl font-black" style={{ color: 'var(--income)' }}>
            +${ingresosMes.toLocaleString()}
          </p>
        </div>
        <div className="glass p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
            Gastos
          </p>
          <p className="text-xl font-black" style={{ color: 'var(--expense)' }}>
            -${gastosMes.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Acciones rápidas — Fitts's Law (min 56px) */}
      <div className="px-6 mb-6 grid grid-cols-2 gap-3">
        <Link
          href="/transactions?type=income"
          className="glass flex items-center justify-center gap-2 min-h-[56px] transition-all active:scale-95"
        >
          <TrendingUp className="w-5 h-5" strokeWidth={1.5} style={{ color: 'var(--income)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Ingreso</span>
        </Link>
        <Link
          href="/transactions?type=expense"
          className="glass flex items-center justify-center gap-2 min-h-[56px] transition-all active:scale-95"
        >
          <TrendingDown className="w-5 h-5" strokeWidth={1.5} style={{ color: 'var(--expense)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Gasto</span>
        </Link>
      </div>

      {/* Movimientos recientes */}
      <section className="px-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Recientes</h3>
          <Link href="/transactions"
            className="text-[11px] uppercase tracking-wider font-bold hover:underline"
            style={{ color: 'var(--primary)' }}>
            Ver Todo
          </Link>
        </div>

        <div className="glass p-2">
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Sin movimientos</p>
            </div>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx: any) => (
                <div key={tx.id}
                  className="tx-row flex justify-between items-center p-3 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: 'var(--bg-app)', border: '1px solid var(--border)' }}>
                      {tx.categories?.icon ?? (tx.type === 'income' ? '💵' : '🛒')}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm capitalize truncate" style={{ color: 'var(--text-main)' }}>
                        {tx.description}
                      </p>
                      <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>
                        {tx.payment_method}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-sm tracking-tight flex-shrink-0 ml-2"
                    style={{ color: tx.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>
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

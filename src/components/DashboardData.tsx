'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { DashboardActions } from '@/components/DashboardActions'

interface Profile {
  full_name: string
  currency: string
  monthly_budget: number
  needs_percent: number
  wants_percent: number
  savings_percent: number
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string
  payment_method: string
  transaction_date: string
  created_at: string
  categories?: { name: string; icon: string; color: string; bucket: string } | null
}

interface DashboardDataProps {
  userId: string
  initialProfile: Profile
  fallbackName: string
}

export function DashboardData({ userId, initialProfile, fallbackName }: DashboardDataProps) {
  const [profile] = useState<Profile>(initialProfile)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [availableLiquidity, setAvailableLiquidity] = useState(0)
  const [bankBalance, setBankBalance] = useState(0)
  const [cashBalance, setCashBalance] = useState(0)
  const [needsProgress, setNeedsProgress] = useState(0)
  const [wantsProgress, setWantsProgress] = useState(0)
  const [savingsProgress, setSavingsProgress] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const fetchAndCompute = useCallback(async () => {
    setSyncing(true)
    const supabase = createClient()

    const [allTxRes, recentTxRes, allDebtsRes, savingsRes] = await Promise.all([
      supabase.from('transactions').select('amount, type, transaction_date, created_at, payment_method, description, categories(bucket)').eq('user_id', userId),
      supabase.from('transactions').select('*, categories(name, icon, color, bucket)').eq('user_id', userId).order('transaction_date', { ascending: false }).limit(6),
      supabase.from('debts').select('debt_type, balance_remaining, status, payment_method').eq('user_id', userId).neq('status', 'paid'),
      supabase.from('savings_goals').select('current_amount').eq('user_id', userId),
    ])

    // Compute balances
    let totalBalance = 0, bank = 0, cash = 0, ingresosMes = 0, gastosMes = 0
    let needsSpent = 0, wantsSpent = 0, savingsSpent = 0

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const bankMethods = ['tarjeta', 'transferencia', 'nequi', 'daviplata', 'banco']

    ;(allTxRes.data || []).forEach((tx: any) => {
      const dateStr = (tx.transaction_date || tx.created_at).split('T')[0]
      const parts = dateStr.split('-')
      const isCurrentMonth = parseInt(parts[0]) === currentYear && parseInt(parts[1]) - 1 === currentMonth
      const isBank = bankMethods.includes((tx.payment_method || '').toLowerCase())
      const isTransfer = (tx.description || '').toLowerCase().startsWith('transferencia ')

      if (tx.type === 'income') {
        totalBalance += Number(tx.amount)
        if (isBank) bank += Number(tx.amount); else cash += Number(tx.amount)
        if (isCurrentMonth && !isTransfer) ingresosMes += Number(tx.amount)
      } else if (tx.type === 'expense') {
        totalBalance -= Number(tx.amount)
        if (isBank) bank -= Number(tx.amount); else cash -= Number(tx.amount)
        if (isCurrentMonth && !isTransfer) {
          gastosMes += Number(tx.amount)
          const cat = Array.isArray(tx.categories) ? tx.categories[0] : tx.categories
          const bucket = cat?.bucket || 'needs'
          if (bucket === 'needs') needsSpent += Number(tx.amount)
          else if (bucket === 'wants') wantsSpent += Number(tx.amount)
          else if (bucket === 'savings') savingsSpent += Number(tx.amount)
        }
      }
    })

    ;(allDebtsRes.data || []).forEach((debt: any) => {
      if (debt.status === 'cancelled') return
      const isBank = bankMethods.includes((debt.payment_method || '').toLowerCase())
      if (debt.debt_type === 'i_owe') {
        totalBalance += Number(debt.balance_remaining)
        if (isBank) bank += Number(debt.balance_remaining); else cash += Number(debt.balance_remaining)
      } else if (debt.debt_type === 'they_owe') {
        totalBalance -= Number(debt.balance_remaining)
        if (isBank) bank -= Number(debt.balance_remaining); else cash -= Number(debt.balance_remaining)
      }
    })

    const targetBase = ingresosMes > 0 ? ingresosMes : profile.monthly_budget
    const getProgress = (spent: number, target: number) => target === 0 ? 0 : Math.min(100, Math.round((spent / target) * 100))

    setAvailableLiquidity(totalBalance)
    setBankBalance(bank)
    setCashBalance(cash)
    setNeedsProgress(getProgress(needsSpent, targetBase * ((profile.needs_percent ?? 50) / 100)))
    setWantsProgress(getProgress(wantsSpent, targetBase * ((profile.wants_percent ?? 30) / 100)))
    setSavingsProgress(getProgress(savingsSpent, targetBase * ((profile.savings_percent ?? 20) / 100)))
    setTransactions((recentTxRes.data || []) as Transaction[])
    setSyncing(false)
  }, [userId, profile])

  // Carga inicial
  useEffect(() => {
    fetchAndCompute()
  }, [fetchAndCompute])

  // WebSocket realtime: actualiza al instante sin F5
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions',  filter: `user_id=eq.${userId}` }, fetchAndCompute)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debts',         filter: `user_id=eq.${userId}` }, fetchAndCompute)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_goals', filter: `user_id=eq.${userId}` }, fetchAndCompute)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, fetchAndCompute])

  const isPositive = availableLiquidity >= 0

  return (
    <main className="flex-1 pb-28 max-w-lg mx-auto w-full pt-safe px-4 sm:px-6">
      {/* Header */}
      <header className="flex justify-between items-start pt-6 pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 opacity-60">
            Panel Financiero
          </p>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            Hola, {fallbackName.split(' ')[0]} 👋
            {syncing && <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" title="Sincronizando..." />}
          </h1>
        </div>
        <Link href="/profile" className="w-12 h-12 rounded-full border border-border/50 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="w-full h-full flex items-center justify-center font-bold text-sm bg-primary/10 text-primary">
            {fallbackName.charAt(0).toUpperCase()}
          </div>
        </Link>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Bento 1: Liquidez */}
        <div className="md:col-span-2">
          <div className="card-hero relative overflow-hidden flex flex-col justify-between p-6 h-full min-h-[220px]">
            <div className="flex justify-between items-start z-10">
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">Liquidez Disponible</p>
            </div>
            <div className="z-10 mt-2 mb-4">
              <h2 className="text-4xl font-black text-white tracking-tighter truncate">
                {isPositive ? '' : '-'}${Math.abs(availableLiquidity).toLocaleString()}
              </h2>
            </div>
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
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 blur-[100px] rounded-full pointer-events-none" />
          </div>
        </div>

        {/* Quick Actions */}
        <DashboardActions userId={userId} />

        {/* Bento 2: Distribución 50/30/20 */}
        <div className="md:col-span-2 glass p-5">
          <div className="flex justify-between items-center mb-4 min-h-[44px]">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Distribución {profile.needs_percent}/{profile.wants_percent}/{profile.savings_percent}
            </p>
            <Link href="/planning" className="p-2 -mr-2 text-primary opacity-80 hover:opacity-100 transition-opacity">
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="space-y-4">
            <div className="relative h-6 bg-border/50 rounded-full overflow-hidden shadow-inner">
              <div className="absolute top-0 left-0 h-full rounded-full bg-primary transition-all duration-700 shadow-[0_0_8px_var(--primary)]" style={{ width: `${needsProgress}%` }} />
              <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-black tracking-widest text-foreground pointer-events-none drop-shadow-md">
                <span>NECESIDADES</span><span>{needsProgress}%</span>
              </div>
            </div>
            <div className="relative h-6 bg-border/50 rounded-full overflow-hidden shadow-inner">
              <div className="absolute top-0 left-0 h-full rounded-full bg-expense transition-all duration-700 shadow-[0_0_8px_var(--expense)]" style={{ width: `${wantsProgress}%` }} />
              <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-black tracking-widest text-foreground pointer-events-none drop-shadow-md">
                <span>DESEOS</span><span>{wantsProgress}%</span>
              </div>
            </div>
            <div className="relative h-6 bg-border/50 rounded-full overflow-hidden shadow-inner">
              <div className="absolute top-0 left-0 h-full rounded-full bg-yellow-500 transition-all duration-700 shadow-[0_0_8px_var(--color-yellow-500)]" style={{ width: `${savingsProgress}%` }} />
              <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-black tracking-widest text-foreground pointer-events-none drop-shadow-md">
                <span>AHORROS</span><span>{savingsProgress}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bento 3: Actividad Reciente */}
        <section className="md:col-span-2 glass p-5">
          <div className="flex justify-between items-center mb-4 min-h-[44px]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recientes</h3>
            <Link href="/transactions" className="p-2 -mr-2 text-xs uppercase tracking-wider font-bold text-primary hover:underline">Ver Todo</Link>
          </div>
          {transactions.length === 0 ? (
            <div className="text-center py-8 bg-muted/20 rounded-2xl">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm font-bold text-muted-foreground">Sin movimientos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const iconColor = tx.categories?.color || (tx.type === 'income' ? '#10b981' : '#f43f5e')
                const isIncome = tx.type === 'income'
                return (
                  <Link href="/transactions" key={tx.id} className="tx-row flex justify-between items-center p-2 -mx-2 rounded-[20px] transition-colors cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 squircle flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: `${iconColor}22`, color: iconColor }}>
                        {tx.categories?.icon ?? (isIncome ? '💵' : '🛒')}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm capitalize truncate text-foreground">{tx.description}</p>
                        <p className="text-[11px] font-bold mt-0.5 uppercase tracking-wider text-muted-foreground">{tx.payment_method}</p>
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

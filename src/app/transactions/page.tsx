'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, FilterX, Plus } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { NewTransactionModal } from '@/components/NewTransactionModal'

function TransactionsContent() {
  const searchParams = useSearchParams()
  const initialType = searchParams.get('type') || 'all'
  
  const [type, setType] = useState(initialType)
  const [timeframe, setTimeframe] = useState('month')
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return setLoading(false)
      setUserId(user.id)

      let query = supabase
        .from('transactions')
        .select('*, categories(icon, name)')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (type !== 'all') {
        query = query.eq('type', type)
      }

      if (timeframe !== 'all') {
        const now = new Date()
        let startStr = ''
        
        if (timeframe === 'day') {
          startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        } else if (timeframe === 'week') {
          const start = new Date()
          start.setDate(start.getDate() - 7)
          startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
        } else if (timeframe === 'month') {
          startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        }
        
        query = query.gte('transaction_date', startStr)
      }

      const { data } = await query
      if (data) setTransactions(data)
      setLoading(false)
    }

    fetchTransactions()
  }, [type, timeframe])

  const typeFilters = [
    { id: 'all', label: 'Todos' },
    { id: 'income', label: 'Ingresos' },
    { id: 'expense', label: 'Gastos' }
  ]

  const timeFilters = [
    { id: 'day', label: 'Hoy' },
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mes' },
    { id: 'all', label: 'Siempre' }
  ]

  return (
    <main className="flex-1 pb-28 max-w-lg mx-auto w-full">
      {userId && (
        <NewTransactionModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          defaultType={type === 'income' ? 'income' : 'expense'} 
          userId={userId} 
        />
      )}
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-10 pb-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-11 h-11 flex items-center justify-center glass border border-border/50 rounded-full hover:border-border transition-all shadow-sm">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Movimientos</h1>
          </div>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="w-11 h-11 flex items-center justify-center bg-foreground text-background rounded-full hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-6 h-6" />
        </button>
      </header>

      {/* Filters */}
      <div className="px-6 space-y-3 mb-6">
        <div className="flex gap-2 bg-muted/50 p-1 rounded-2xl overflow-x-auto no-scrollbar">
          {typeFilters.map(f => (
            <button
              key={f.id}
              onClick={() => setType(f.id)}
              className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-xl transition-all ${
                type === f.id 
                  ? f.id === 'income' ? 'bg-income text-white shadow' 
                  : f.id === 'expense' ? 'bg-expense text-white shadow'
                  : 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        
        <div className="flex gap-2">
          {timeFilters.map(f => (
            <button
              key={f.id}
              onClick={() => setTimeframe(f.id)}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${
                timeframe === f.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/40 text-muted-foreground hover:border-border'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <section className="px-6 space-y-2">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl glass border border-border/30">
              <div className="skeleton w-11 h-11 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 rounded-full w-3/4" />
                <div className="skeleton h-2.5 w-16 rounded-full" />
              </div>
              <div className="skeleton h-4 w-20 rounded-full flex-shrink-0" />
            </div>
          ))
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 glass">
            <FilterX className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-bold">No hay movimientos</p>
            <p className="text-xs text-muted-foreground mt-1 px-8">Intenta cambiando los filtros de fecha o tipo para ver más resultados.</p>
          </div>
        ) : (
          transactions.map(tx => {
            const date = new Date(tx.transaction_date || tx.created_at)
            const dateStr = date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
            return (
              <div key={tx.id} className="flex justify-between items-center p-4 rounded-2xl glass border border-border/40 hover:border-border/70 transition-all">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl glass border border-border/40 flex-shrink-0">
                    {tx.categories?.icon ?? (tx.type === 'income' ? '💵' : '🛒')}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm capitalize truncate">{tx.description}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate uppercase tracking-wide">
                      {dateStr} • {tx.categories?.name || 'Otros'}
                    </p>
                  </div>
                </div>
                <p className={`font-black text-sm tracking-tight flex-shrink-0 ml-2 ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
                  {tx.type === 'income' ? '+' : '-'}${Number(tx.amount).toLocaleString()}
                </p>
              </div>
            )
          })
        )}
      </section>
    </main>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 pb-28 max-w-lg mx-auto w-full px-6 pt-10">
        <div className="skeleton h-8 w-40 mb-10" />
        <div className="skeleton h-24 w-full rounded-2xl mb-6" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 w-full rounded-2xl" />)}
        </div>
      </div>
    }>
      <TransactionsContent />
    </Suspense>
  )
}

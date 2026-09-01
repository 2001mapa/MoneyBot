'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, X, AlertCircle, Plus } from 'lucide-react'
import { NewDebtModal } from '@/components/NewDebtModal'

export default function DebtsPage() {
  const [debts, setDebts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'i_owe' | 'they_owe'>('i_owe')
  const [userId, setUserId] = useState<string | null>(null)
  
  const [payModalDebt, setPayModalDebt] = useState<any>(null)
  const [payAmount, setPayAmount] = useState('')
  const [detailsModalDebt, setDetailsModalDebt] = useState<any>(null)
  const [debtPayments, setDebtPayments] = useState<any[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [newDebtModalOpen, setNewDebtModalOpen] = useState(false)
  const [total, setTotal] = useState(0)

  const loadDebts = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setLoading(false)
    setUserId(user.id)
    const { data } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) {
      setDebts(data)
      let t = 0
      data.forEach(d => { if(d.status !== 'cancelled' && d.status !== 'paid') t += Number(d.balance_remaining) })
      setTotal(t)
    }
    setLoading(false)
  }

  useEffect(() => { loadDebts() }, [])

  const filteredDebts = debts.filter(d => d.debt_type === tab)

  const totalTab = filteredDebts
    .filter(d => d.status !== 'paid')
    .reduce((sum, d) => sum + Number(d.balance_remaining), 0)

  const handleAbonoSubmit = async () => {
    const amount = Number(payAmount)
    if (isNaN(amount) || amount <= 0 || amount > payModalDebt.balance_remaining) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newBalance = payModalDebt.balance_remaining - amount
    const newStatus = newBalance === 0 ? 'paid' : 'pending'

    const { error: paymentError } = await supabase.from('debt_payments').insert({
      debt_id: payModalDebt.id, user_id: user.id, amount, payment_method: 'efectivo'
    })

    if (paymentError) {
      alert('Error registrando abono: ' + paymentError.message)
      return
    }

    await supabase.from('debts').update({ balance_remaining: newBalance, status: newStatus }).eq('id', payModalDebt.id)

    // Crear transacción compensatoria (Doble entrada)
    const txType = payModalDebt.debt_type === 'i_owe' ? 'expense' : 'income'
    await supabase.from('transactions').insert({
      user_id: user.id,
      amount: amount,
      type: txType,
      description: `Abono de deuda: ${payModalDebt.person_name}`,
      category_icon: '💳',
      payment_method: 'efectivo',
      transaction_date: new Date().toISOString()
    })

    setDebts(debts.map(d => d.id === payModalDebt.id ? { ...d, balance_remaining: newBalance, status: newStatus } : d))
    setPayModalDebt(null)
    setPayAmount('')
  }

  const openDetails = async (debt: any) => {
    setDetailsModalDebt(debt)
    setLoadingDetails(true)
    const supabase = createClient()
    const { data } = await supabase.from('debt_payments').select('*').eq('debt_id', debt.id).order('created_at', { ascending: false })
    if (data) setDebtPayments(data)
    setLoadingDetails(false)
  }

  return (
    <main className="flex-1 pb-28 max-w-lg mx-auto w-full">
      {userId && (
        <NewDebtModal
          isOpen={newDebtModalOpen}
          onClose={() => setNewDebtModalOpen(false)}
          userId={userId}
        />
      )}
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-8 pb-6 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-11 h-11 flex items-center justify-center glass border border-border/50 rounded-full hover:border-border transition-colors shadow-sm">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-0.5 opacity-60">Control</p>
            <h1 className="text-2xl font-black tracking-tight">Deudas</h1>
          </div>
        </div>
        <button 
          onClick={() => setNewDebtModalOpen(true)}
          className="w-11 h-11 flex items-center justify-center bg-foreground text-background rounded-full hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-6 h-6" />
        </button>
      </header>

      {/* Summary banner */}
      {totalTab > 0 && (
        <div className="mx-6 mb-6 p-4 glass flex items-center gap-3">
          <AlertCircle strokeWidth={1.5} className="w-5 h-5 text-expense flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {tab === 'i_owe' ? 'Total que debes' : 'Total que te deben'}
            </p>
            <p className="font-black text-lg text-expense">${totalTab.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mx-6 mb-6">
        <div className="flex glass p-1">
          <button
            onClick={() => setTab('i_owe')}
            className={`flex-1 min-h-[44px] text-sm font-bold rounded-xl transition-colors ${
              tab === 'i_owe' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground'
            }`}
          >
            Lo que debo
          </button>
          <button
            onClick={() => setTab('they_owe')}
            className={`flex-1 min-h-[44px] text-sm font-bold rounded-xl transition-colors ${
              tab === 'they_owe' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground'
            }`}
          >
            Me deben
          </button>
        </div>
      </div>

      <div className="px-6 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="skeleton w-10 h-10 rounded-2xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-32" />
                    <div className="skeleton h-3 w-48" />
                  </div>
                </div>
                <div className="skeleton rounded-xl h-16 w-full" />
                <div className="flex gap-2">
                  <div className="skeleton flex-1 h-9 rounded-xl" />
                  <div className="skeleton flex-1 h-9 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredDebts.length === 0 ? (
          <div className="text-center py-16 px-6 glass">
            <p className="text-3xl mb-3">🤝</p>
            <p className="text-muted-foreground text-sm font-medium">No hay deudas registradas aquí</p>
          </div>
        ) : (
          filteredDebts.map(debt => (
            <div key={debt.id} className={`glass p-5 relative overflow-hidden transition-colors ${
              debt.status === 'paid' ? 'border-border/30 opacity-60' : 'border-border/50'
            }`}>
              {debt.status === 'paid' && (
                <div className="absolute top-4 right-4">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-income/10 text-income">Pagado</span>
                </div>
              )}
              
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-lg flex-shrink-0">
                  {tab === 'i_owe' ? '😰' : '🤑'}
                </div>
                <div>
                  <h3 className="font-bold text-base">{debt.person_name}</h3>
                  <p className="text-xs text-muted-foreground">{debt.description || 'Sin descripción'}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-4 p-3 bg-muted rounded-xl">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-0.5">Restante</p>
                  <p className={`font-black text-xl ${tab === 'i_owe' ? 'text-expense' : 'text-income'}`}>
                    ${Number(debt.balance_remaining).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-0.5">Original</p>
                  <p className="font-semibold text-sm">${Number(debt.total_amount).toLocaleString()}</p>
                </div>
              </div>

              {debt.status !== 'paid' && (
                <div className="flex gap-2">
                  <button onClick={() => setPayModalDebt(debt)} className="flex-1 bg-primary text-primary-foreground font-bold py-2.5 text-xs rounded-xl hover:opacity-90 transition-opacity">
                    Registrar Abono
                  </button>
                  <button onClick={() => openDetails(debt)} className="flex-1 bg-muted text-foreground font-bold py-2.5 text-xs rounded-xl hover:bg-card-elevated transition-colors">
                    Detalles
                  </button>
                </div>
              )}
              {debt.status === 'paid' && (
                <button onClick={() => openDetails(debt)} className="w-full bg-muted text-foreground font-bold py-2.5 text-xs rounded-xl hover:bg-card-elevated transition-colors">
                  Ver Historial
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pay Modal (iOS Bottom-Sheet) */}
      {payModalDebt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass border border-border/50 p-6 rounded-t-[32px] sm:rounded-[32px] w-full max-w-sm shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-full duration-300">
            
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Abonar</h2>
                <p className="text-sm font-medium text-muted-foreground mt-1">A: <span className="font-bold text-foreground">{payModalDebt.person_name}</span></p>
              </div>
              <button onClick={() => setPayModalDebt(null)} className="w-11 h-11 flex items-center justify-center bg-muted rounded-full text-muted-foreground hover:text-foreground hover:bg-border transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Monto a abonar</label>
              <input
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder={`Máx. $${Number(payModalDebt.balance_remaining).toLocaleString()}`}
                className="w-full bg-muted/50 border border-border/50 rounded-2xl px-5 py-4 text-3xl font-black focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
              />
            </div>
            
            {/* Quick amount pills */}
            <div className="flex gap-2 mb-8">
              <button onClick={() => setPayAmount('50000')} className="flex-1 py-3.5 bg-muted rounded-xl text-sm font-bold text-foreground hover:bg-border transition-colors">+$50k</button>
              <button onClick={() => setPayAmount('100000')} className="flex-1 py-3.5 bg-muted rounded-xl text-sm font-bold text-foreground hover:bg-border transition-colors">+$100k</button>
              <button onClick={() => setPayAmount(payModalDebt.balance_remaining.toString())} className="flex-1 py-3.5 bg-primary/10 text-primary rounded-xl text-sm font-bold hover:bg-primary/20 transition-colors">MAX</button>
            </div>

            <button onClick={handleAbonoSubmit} className="w-full bg-foreground text-background font-black py-4 rounded-full hover:opacity-90 transition-opacity shadow-lg">
              Confirmar Abono
            </button>
          </div>
        </div>
      )}

      {/* Details Modal (iOS Bottom-Sheet) */}
      {detailsModalDebt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass border border-border/50 p-6 rounded-t-[32px] sm:rounded-[32px] w-full max-w-md shadow-[0_-10px_40px_rgba(0,0,0,0.1)] max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-full duration-300">

            <div className="flex items-start justify-between mb-6 shrink-0">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Historial</h2>
                <p className="text-sm font-medium text-muted-foreground mt-1">{detailsModalDebt.description || detailsModalDebt.person_name}</p>
              </div>
              <button onClick={() => setDetailsModalDebt(null)} className="w-11 h-11 flex items-center justify-center bg-muted rounded-full text-muted-foreground hover:text-foreground hover:bg-border transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 shrink-0">Abonos realizados</h3>
            
            <div className="overflow-y-auto flex-1 space-y-2 pb-4 scrollbar-hide">
              {loadingDetails ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-16 bg-muted rounded-2xl w-full" />
                  <div className="h-16 bg-muted rounded-2xl w-full" />
                </div>
              ) : debtPayments.length === 0 ? (
                <div className="text-center py-10 bg-muted/30 rounded-2xl">
                  <p className="text-sm text-muted-foreground font-bold italic">No hay abonos registrados</p>
                </div>
              ) : (
                debtPayments.map(payment => (
                  <div key={payment.id} className="flex justify-between items-center p-4 bg-muted/50 border border-border/20 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center shadow-sm">
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-black text-base">${Number(payment.amount).toLocaleString()}</p>
                        <p className="text-xs font-bold text-muted-foreground mt-0.5">{new Date(payment.created_at).toLocaleDateString('es-CO')}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 bg-background rounded-full">{payment.payment_method}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

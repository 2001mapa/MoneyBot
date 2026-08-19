'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, PlusCircle, CheckCircle2, X } from 'lucide-react'

export default function DebtsPage() {
  const [debts, setDebts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'i_owe' | 'they_owe'>('i_owe')
  
  // Modal states
  const [payModalDebt, setPayModalDebt] = useState<any>(null)
  const [payAmount, setPayAmount] = useState('')
  const [detailsModalDebt, setDetailsModalDebt] = useState<any>(null)
  const [debtPayments, setDebtPayments] = useState<any[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    loadDebts()
  }, [])

  const loadDebts = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setLoading(false)

    const { data } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setDebts(data)
    setLoading(false)
  }

  const filteredDebts = debts.filter(d => d.debt_type === tab)

  const handleAbonoSubmit = async () => {
    const amount = Number(payAmount)
    if (isNaN(amount) || amount <= 0 || amount > payModalDebt.balance_remaining) {
      return alert("Monto inválido")
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newBalance = payModalDebt.balance_remaining - amount
    const newStatus = newBalance === 0 ? 'paid' : 'pending'

    await supabase.from('debt_payments').insert({
      debt_id: payModalDebt.id,
      user_id: user.id,
      amount: amount,
      payment_method: 'efectivo'
    })

    await supabase.from('debts').update({
      balance_remaining: newBalance,
      status: newStatus
    }).eq('id', payModalDebt.id)

    setDebts(debts.map(d => d.id === payModalDebt.id ? { ...d, balance_remaining: newBalance, status: newStatus } : d))
    setPayModalDebt(null)
    setPayAmount('')
  }

  const openDetails = async (debt: any) => {
    setDetailsModalDebt(debt)
    setLoadingDetails(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('debt_payments')
      .select('*')
      .eq('debt_id', debt.id)
      .order('created_at', { ascending: false })
    
    if (data) setDebtPayments(data)
    setLoadingDetails(false)
  }

  return (
    <main className="flex-1 p-6 pb-28 max-w-lg mx-auto w-full relative">
      <header className="flex items-center mb-6 mt-4">
        <Link href="/" className="mr-4 p-2 bg-card rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deudas</h1>
          <p className="text-muted-foreground text-sm mt-1">Control de préstamos</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-card p-1 rounded-2xl mb-6">
        <button 
          onClick={() => setTab('i_owe')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${tab === 'i_owe' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}
        >
          Lo que debo
        </button>
        <button 
          onClick={() => setTab('they_owe')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${tab === 'they_owe' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}
        >
          Me deben
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-center text-muted-foreground py-10">Cargando...</p>
        ) : filteredDebts.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-border rounded-3xl">
            <p className="text-muted-foreground text-sm font-medium">No hay deudas registradas aquí.</p>
          </div>
        ) : (
          filteredDebts.map(debt => (
            <div key={debt.id} className="bg-foreground/[0.02] border border-foreground/5 p-5 rounded-3xl relative overflow-hidden">
              {debt.status === 'paid' && (
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <CheckCircle2 className="w-16 h-16" />
                </div>
              )}
              <h3 className="font-bold text-lg">{debt.person_name}</h3>
              <p className="text-xs text-muted-foreground font-medium mb-4">{debt.description || 'Sin descripción'}</p>
              
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-foreground/40 mb-1">Restante</p>
                  <p className={`font-bold text-xl ${tab === 'i_owe' ? 'text-red-500' : 'text-emerald-500'}`}>
                    ${Number(debt.balance_remaining).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-foreground/40 mb-1">Total original</p>
                  <p className="font-semibold text-sm text-muted-foreground">${Number(debt.total_amount).toLocaleString()}</p>
                </div>
              </div>

              {debt.status !== 'paid' && (
                <div className="flex gap-2">
                  <button onClick={() => setPayModalDebt(debt)} className="flex-1 bg-primary text-primary-foreground font-bold py-2.5 text-xs rounded-xl shadow-sm hover:opacity-90">
                    Abonar
                  </button>
                  <button onClick={() => openDetails(debt)} className="flex-1 bg-card text-foreground font-bold py-2.5 text-xs rounded-xl hover:bg-muted">
                    Detalles
                  </button>
                </div>
              )}
              {debt.status === 'paid' && (
                <button onClick={() => openDetails(debt)} className="w-full bg-card text-foreground font-bold py-2.5 text-xs rounded-xl hover:bg-muted mt-2">
                  Ver Historial
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pay Modal */}
      {payModalDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-background border border-border p-6 rounded-3xl w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setPayModalDebt(null)} className="absolute top-4 right-4 p-2 bg-card rounded-full text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-bold mb-1">Registrar Abono</h2>
            <p className="text-sm text-muted-foreground mb-6">¿Cuánto vas a abonar a {payModalDebt.person_name}?</p>
            
            <div className="mb-6">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Monto a abonar</label>
              <input 
                type="number" 
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder={`Máximo: $${payModalDebt.balance_remaining}`}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button onClick={handleAbonoSubmit} className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-lg hover:opacity-90 transition-colors">
              Confirmar Abono
            </button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsModalDebt && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-background border-t sm:border border-border p-6 rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl relative max-h-[80vh] flex flex-col">
            <button onClick={() => setDetailsModalDebt(null)} className="absolute top-4 right-4 p-2 bg-card rounded-full text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-bold mb-1">Detalles de la Deuda</h2>
            <p className="text-sm text-muted-foreground mb-6">{detailsModalDebt.description || 'Sin descripción'}</p>
            
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Historial de Abonos</h3>
            <div className="overflow-y-auto flex-1 pr-2">
              {loadingDetails ? (
                <p className="text-sm text-muted-foreground py-4">Cargando historial...</p>
              ) : debtPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 italic">No hay abonos registrados todavía.</p>
              ) : (
                <div className="space-y-3">
                  {debtPayments.map(payment => (
                    <div key={payment.id} className="flex justify-between items-center p-3 bg-card rounded-xl">
                      <div>
                        <p className="font-bold text-sm">${Number(payment.amount).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{new Date(payment.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 bg-muted rounded-md">
                        {payment.payment_method}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, PlusCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function DebtsPage() {
  const [debts, setDebts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'i_owe' | 'they_owe'>('i_owe')

  useEffect(() => {
    async function loadDebts() {
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
    loadDebts()
  }, [])

  const filteredDebts = debts.filter(d => d.debt_type === tab)

  const handleAbono = async (debt: any) => {
    const amountStr = prompt(`¿Cuánto deseas abonar a la deuda de ${debt.person_name}? (Restante: $${debt.balance_remaining})`)
    if (!amountStr) return
    const amount = Number(amountStr)
    if (isNaN(amount) || amount <= 0 || amount > debt.balance_remaining) {
      return alert("Monto inválido")
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newBalance = debt.balance_remaining - amount
    const newStatus = newBalance === 0 ? 'paid' : 'pending'

    await supabase.from('debt_payments').insert({
      debt_id: debt.id,
      user_id: user.id,
      amount: amount,
      payment_method: 'efectivo'
    })

    await supabase.from('debts').update({
      balance_remaining: newBalance,
      status: newStatus
    }).eq('id', debt.id)

    setDebts(debts.map(d => d.id === debt.id ? { ...d, balance_remaining: newBalance, status: newStatus } : d))
    alert(`Abono de $${amount} registrado con éxito.`)
  }

  return (
    <main className="flex-1 p-6 pb-28 max-w-lg mx-auto w-full">
      <header className="flex items-center mb-6 mt-4">
        <Link href="/" className="mr-4 p-2 bg-foreground/5 rounded-full hover:bg-foreground/10 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deudas</h1>
          <p className="text-foreground/60 text-sm mt-1">Control de préstamos</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-foreground/5 p-1 rounded-2xl mb-6">
        <button 
          onClick={() => setTab('i_owe')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${tab === 'i_owe' ? 'bg-background shadow-sm text-foreground' : 'text-foreground/50 hover:text-foreground/80'}`}
        >
          Lo que debo
        </button>
        <button 
          onClick={() => setTab('they_owe')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${tab === 'they_owe' ? 'bg-background shadow-sm text-foreground' : 'text-foreground/50 hover:text-foreground/80'}`}
        >
          Me deben
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-center text-foreground/50 py-10">Cargando...</p>
        ) : filteredDebts.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-foreground/20 rounded-3xl">
            <p className="text-foreground/50 text-sm font-medium">No hay deudas registradas aquí.</p>
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
              <p className="text-xs text-foreground/60 font-medium mb-4">{debt.description || 'Sin descripción'}</p>
              
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-foreground/40 mb-1">Restante</p>
                  <p className={`font-bold text-xl ${tab === 'i_owe' ? 'text-red-500' : 'text-emerald-500'}`}>
                    ${Number(debt.balance_remaining).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-foreground/40 mb-1">Total original</p>
                  <p className="font-semibold text-sm text-foreground/70">${Number(debt.total_amount).toLocaleString()}</p>
                </div>
              </div>

              {debt.status !== 'paid' && (
                <div className="flex gap-2">
                  <button onClick={() => handleAbono(debt)} className="flex-1 bg-foreground text-background font-bold py-2.5 text-xs rounded-xl shadow-sm hover:opacity-90">
                    Abonar
                  </button>
                  <button className="flex-1 bg-foreground/5 text-foreground font-bold py-2.5 text-xs rounded-xl hover:bg-foreground/10">
                    Detalles
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <button className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-500 hover:scale-105 transition-all text-white z-50">
        <PlusCircle className="w-7 h-7" />
      </button>
    </main>
  )
}

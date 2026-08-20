'use client'

import { useState } from 'react'
import { X, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NewDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function NewDebtModal({ isOpen, onClose, userId }: NewDebtModalProps) {
  const [personName, setPersonName] = useState('')
  const [amount, setAmount] = useState('')
  const [debtType, setDebtType] = useState<'i_owe' | 'they_owe'>('i_owe')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName || !amount || Number(amount) <= 0) return;

    setLoading(true);
    
    // 1. Insert the debt
    const { data: debt, error: debtError } = await supabase.from('debts').insert({
      user_id: userId,
      person_name: personName,
      amount: Number(amount),
      balance_remaining: Number(amount),
      debt_type: debtType,
      status: 'pending',
      description: description || 'Sin descripción',
      payment_method: 'efectivo'
    }).select().single();

    if (debtError) {
      alert('Error: ' + debtError.message);
      setLoading(false);
      return;
    }

    // 2. Create the compensating transaction
    // If "they_owe" (me deben), I lent them money -> It's an expense from my pocket.
    // If "i_owe" (yo debo), they lent me money -> It's an income to my pocket.
    const transactionType = debtType === 'they_owe' ? 'expense' : 'income';
    await supabase.from('transactions').insert({
      user_id: userId,
      amount: Number(amount),
      type: transactionType,
      description: `Préstamo: ${personName} (${description})`,
      category_icon: '🤝',
      payment_method: 'efectivo',
      transaction_date: new Date().toISOString()
    });

    setLoading(false);
    onClose();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass border border-border/50 p-6 rounded-t-[32px] sm:rounded-[32px] w-full max-w-sm shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-full duration-300">
        
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Nueva Deuda</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">Registra un préstamo</p>
          </div>
          <button onClick={onClose} className="w-11 h-11 flex items-center justify-center bg-muted rounded-full text-muted-foreground hover:text-foreground hover:bg-border transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="flex bg-muted/50 p-1.5 rounded-2xl relative">
            <button 
              type="button"
              onClick={() => setDebtType('they_owe')}
              className={`flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${debtType === 'they_owe' ? 'bg-card text-foreground shadow-sm border border-border/50' : 'text-muted-foreground'}`}
            >
              Me Deben (Presté)
            </button>
            <button 
              type="button"
              onClick={() => setDebtType('i_owe')}
              className={`flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${debtType === 'i_owe' ? 'bg-card text-foreground shadow-sm border border-border/50' : 'text-muted-foreground'}`}
            >
              Yo Debo (Me Prestaron)
            </button>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">¿Quién?</label>
            <input
              type="text"
              required
              value={personName}
              onChange={e => setPersonName(e.target.value)}
              placeholder="Ej. Juan, María..."
              className="w-full bg-muted/50 border border-border/50 rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Monto Total</label>
            <input
              type="number"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="$0"
              className="w-full bg-muted/50 border border-border/50 rounded-2xl px-5 py-4 text-3xl font-black focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Descripción (Opcional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej. Almuerzo, Viaje..."
              className="w-full bg-muted/50 border border-border/50 rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-6 bg-foreground text-background font-black py-4 rounded-full flex justify-center items-center gap-2 hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50"
          >
            {loading ? 'Guardando...' : (
              <>Guardar Préstamo <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </form>

      </div>
    </div>
  )
}

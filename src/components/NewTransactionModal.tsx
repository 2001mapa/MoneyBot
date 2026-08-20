'use client'

import { useState } from 'react'
import { X, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'income' | 'expense';
  userId: string;
}

export function NewTransactionModal({ isOpen, onClose, defaultType = 'expense', userId }: NewTransactionModalProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'income' | 'expense'>(defaultType)
  const [method, setMethod] = useState('efectivo')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;

    setLoading(true);
    const { error } = await supabase.from('transactions').insert({
      user_id: userId,
      amount: Number(amount),
      type,
      description: description || 'Sin descripción',
      payment_method: method,
      category_icon: category || (type === 'income' ? '🟢' : '🔴'),
      transaction_date: new Date().toISOString()
    });

    setLoading(false);
    if (!error) {
      onClose();
      window.location.reload(); // Quick refresh for now to update Server Components
    } else {
      alert('Error guardando transacción: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass border border-border/50 p-6 rounded-t-[32px] sm:rounded-[32px] w-full max-w-sm shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-full duration-300">
        
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Nueva Transacción</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">Registra un movimiento</p>
          </div>
          <button onClick={onClose} className="w-11 h-11 flex items-center justify-center bg-muted rounded-full text-muted-foreground hover:text-foreground hover:bg-border transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Tipo Selector */}
          <div className="flex bg-muted/50 p-1.5 rounded-2xl relative">
            <button 
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${type === 'income' ? 'bg-card text-foreground shadow-sm border border-border/50' : 'text-muted-foreground'}`}
            >
              <TrendingUp className="w-4 h-4 text-primary" /> Ingreso
            </button>
            <button 
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${type === 'expense' ? 'bg-card text-foreground shadow-sm border border-border/50' : 'text-muted-foreground'}`}
            >
              <TrendingDown className="w-4 h-4 text-expense" /> Gasto
            </button>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Monto</label>
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
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Descripción</label>
            <input
              type="text"
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej. Almuerzo, Salario..."
              className="w-full bg-muted/50 border border-border/50 rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Método</label>
              <select 
                value={method} 
                onChange={e => setMethod(e.target.value)}
                className="w-full bg-muted/50 border border-border/50 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="nequi">Nequi</option>
                <option value="banco">Banco</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Icono/Cat</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="🍔"
                className="w-full bg-muted/50 border border-border/50 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none text-center"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-6 bg-foreground text-background font-black py-4 rounded-full flex justify-center items-center gap-2 hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50"
          >
            {loading ? 'Guardando...' : (
              <>Guardar Transacción <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </form>

      </div>
    </div>
  )
}

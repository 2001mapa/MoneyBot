'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { NewTransactionModal } from './NewTransactionModal'

export function DashboardActions({ userId }: { userId: string }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [defaultType, setDefaultType] = useState<'income'|'expense'>('expense')

  const openModal = (type: 'income' | 'expense') => {
    setDefaultType(type)
    setModalOpen(true)
  }

  return (
    <>
      <button onClick={() => openModal('income')} className="glass flex items-center p-4 gap-3 hover:bg-muted/50 transition-colors group min-h-[72px] text-left">
        <div className="w-12 h-12 squircle bg-income/15 text-income flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
          <TrendingUp strokeWidth={2} className="w-6 h-6" />
        </div>
        <div>
          <p className="font-bold text-base leading-tight text-foreground">Ingreso</p>
          <p className="text-xs font-bold text-muted-foreground uppercase">Nuevo abono</p>
        </div>
      </button>

      <button onClick={() => openModal('expense')} className="glass flex items-center p-4 gap-3 hover:bg-muted/50 transition-colors group min-h-[72px] text-left">
        <div className="w-12 h-12 squircle bg-expense/15 text-expense flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
          <TrendingDown strokeWidth={2} className="w-6 h-6" />
        </div>
        <div>
          <p className="font-bold text-base leading-tight text-foreground">Gasto</p>
          <p className="text-xs font-bold text-muted-foreground uppercase">Registrar salida</p>
        </div>
      </button>

      <NewTransactionModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        defaultType={defaultType} 
        userId={userId} 
      />
    </>
  )
}

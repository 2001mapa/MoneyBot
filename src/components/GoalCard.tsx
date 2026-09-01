'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

import { useRouter } from 'next/navigation'

interface GoalCardProps {
  goal: any;
  userId: string;
}

export function GoalCard({ goal: initialGoal, userId }: GoalCardProps) {
  const [goal, setGoal] = useState(initialGoal)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const getProgress = (current: number, target: number) => {
    if (!target || target === 0) return 0
    return Math.min(Math.round((current / target) * 100), 100)
  }

  const handleUpdate = async (amount: number) => {
    if (loading) return
    setLoading(true)

    const newAmount = Number(goal.current_amount) + amount
    if (newAmount < 0) {
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.from('savings_goals').update({
      current_amount: newAmount
    }).eq('id', goal.id)

    if (updateError) {
      alert('Error actualizando meta: ' + updateError.message)
      setLoading(false)
      return
    }

    // Compensating transaction
    const isDeposit = amount > 0
    await supabase.from('transactions').insert({
      user_id: userId,
      amount: Math.abs(amount),
      type: isDeposit ? 'expense' : 'income',
      description: `Ahorro en meta: ${goal.name}`,
      payment_method: 'transferencia',
      transaction_date: new Date().toISOString()
    })

    setGoal({ ...goal, current_amount: newAmount })
    setLoading(false)
    router.refresh()
  }

  const goalProgress = getProgress(Number(goal.current_amount), Number(goal.target_amount))

  return (
    <div className={`glass p-5 hover:border-blue-500/50 transition-colors group ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center space-x-4 mb-3">
        <div className="w-12 h-12 squircle flex items-center justify-center text-2xl bg-blue-500/10 text-blue-500 flex-shrink-0 group-hover:scale-110 transition-transform">
          {goal.icon || '🎯'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base truncate text-foreground">{goal.name}</p>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Faltan ${(Number(goal.target_amount) - Number(goal.current_amount)).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="font-black text-blue-500 text-lg">{goalProgress}%</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 mt-4">
        <button 
          onClick={() => handleUpdate(-50000)} // Restar 50k
          className="w-12 h-12 rounded-full bg-muted text-foreground flex items-center justify-center hover:bg-border transition-colors shrink-0 shadow-sm"
        >
          <span className="text-2xl font-black mb-0.5">-</span>
        </button>
        <div className="flex-1 relative h-5 bg-border/30 rounded-full overflow-hidden shadow-inner">
          <div 
            className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-colors duration-1000 shadow-[0_0_12px_rgba(59,130,246,0.5)]" 
            style={{ width: `${goalProgress}%` }}
          />
        </div>
        <button 
          onClick={() => handleUpdate(50000)} // Sumar 50k
          className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center hover:opacity-90 transition-opacity shrink-0 shadow-md"
        >
          <span className="text-2xl font-black mb-0.5">+</span>
        </button>
      </div>

      <div className="flex justify-between mt-3 px-12 text-xs font-bold text-muted-foreground uppercase tracking-wider">
        <span>${Number(goal.current_amount).toLocaleString()}</span>
        <span>${Number(goal.target_amount).toLocaleString()}</span>
      </div>
    </div>
  )
}

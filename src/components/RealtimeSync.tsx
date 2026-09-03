'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { refreshData } from '@/app/actions'

export function RealtimeSync() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function handleChange(table: string) {
      console.log(`🔄 Cambio en ${table}, invalidando caché y recargando UI...`)
      await refreshData()   // 1. Invalida caché en el servidor (Next.js)
      router.refresh()      // 2. Le dice al navegador que vaya a buscar los datos nuevos
    }

    const channel = supabase
      .channel('moneybot-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' },  () => handleChange('transactions'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_goals' }, () => handleChange('savings_goals'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debts' },         () => handleChange('debts'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' },      () => handleChange('profiles'))
      .subscribe((status) => {
        console.log('Supabase Realtime status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}

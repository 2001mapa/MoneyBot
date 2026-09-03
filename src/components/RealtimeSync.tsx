'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { refreshData } from '@/app/actions'

export function RealtimeSync() {
  const router = useRouter()
  // No necesitamos regenerar el cliente en cada render
  useEffect(() => {
    const supabase = createClient()
    
    // Escuchar cambios en TODAS las tablas relevantes para el usuario actual
    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        async (payload) => {
          console.log('Cambio detectado en transactions:', payload)
          await refreshData()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'savings_goals' },
        async () => {
          console.log('Cambio detectado en savings_goals, refrescando UI...')
          await refreshData()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'debts' },
        async () => {
          console.log('Cambio detectado en debts, refrescando UI...')
          await refreshData()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        async () => {
          console.log('Cambio detectado en profiles, refrescando UI...')
          await refreshData()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Conectado a Supabase Realtime')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}

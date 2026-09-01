'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
        () => {
          console.log('🔄 Cambio detectado en transactions, refrescando UI...')
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'savings_goals' },
        () => {
          console.log('🔄 Cambio detectado en savings_goals, refrescando UI...')
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'debts' },
        () => {
          console.log('🔄 Cambio detectado en debts, refrescando UI...')
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          console.log('🔄 Cambio detectado en profiles, refrescando UI...')
          router.refresh()
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

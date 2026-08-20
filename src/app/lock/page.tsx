'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { OTPVerification } from '@/components/OTPVerification'

export default function LockScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get('redirect') || '/'

  const handleVerify = async (code: string) => {
    const res = await fetch('/api/pin', {
      method: 'POST',
      body: JSON.stringify({ action: 'verify', pin: code }),
      headers: { 'Content-Type': 'application/json' }
    })
    return res.ok
  }

  const handleSuccess = () => {
    router.push(redirectPath)
    router.refresh()
  }

  return (
    <OTPVerification 
      title="App Bloqueada" 
      subtitle="Ingresa tu PIN de seguridad para continuar"
      hideToast={true}
      onVerify={handleVerify}
      onSuccess={handleSuccess}
    />
  )
}

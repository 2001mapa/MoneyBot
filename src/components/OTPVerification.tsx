'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Lock } from 'lucide-react'

interface OTPVerificationProps {
  onSuccess?: () => void
  onVerify?: (code: string) => Promise<boolean> // New async verify prop
  title?: string
  subtitle?: string
  hideToast?: boolean
}

export function OTPVerification({ 
  onSuccess, 
  onVerify,
  title = "Verify your number",
  subtitle = "Enter the 4-digit code",
  hideToast = false
}: OTPVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', ''])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isError, setIsError] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Effect to handle state change when OTP is complete
  useEffect(() => {
    async function processCode() {
      if (otp.every(digit => digit !== '') && !isVerifying && !isError) {
        setIsVerifying(true)
        
        const codeStr = otp.join('')
        
        if (onVerify) {
          const isValid = await onVerify(codeStr)
          if (isValid) {
            if (onSuccess) onSuccess()
          } else {
            // Shake and reset
            setIsError(true)
            setIsVerifying(false)
            setOtp(['', '', '', ''])
            setTimeout(() => {
              setIsError(false)
              inputRefs.current[0]?.focus()
            }, 600) // wait for shake animation
          }
        } else {
          // Default demo behavior
          setTimeout(() => {
            if (onSuccess) onSuccess()
          }, 2000)
        }
      }
    }
    processCode()
  }, [otp, isVerifying, isError, onSuccess, onVerify])

  const handleChange = (index: number, value: string) => {
    setIsError(false)
    const digit = value.slice(-1)
    if (!/^\d*$/.test(digit)) return

    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)

    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 4).replace(/\D/g, '')
    if (pastedData) {
      const newOtp = [...otp]
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i]
      }
      setOtp(newOtp)
      const nextFocus = Math.min(pastedData.length, 3)
      inputRefs.current[nextFocus]?.focus()
    }
  }

  const handleAutoFill = () => {
    const code = '4719'
    setOtp(code.split(''))
  }

  const shakeAnimation = isError ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      
      <div className="w-full max-w-sm mb-12">
        <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono tracking-widest uppercase mb-8">
          <span className="px-2 py-1 bg-white/5 rounded-md border border-white/10 flex items-center gap-2"><Lock className="w-3 h-3" /> Security</span>
          <span>App Lock</span>
        </div>
        
        <h1 className="text-3xl font-semibold mb-3">{title}</h1>
        <p className="text-gray-400 text-sm">{subtitle}</p>
      </div>

      <div className="w-full max-w-sm h-32 flex items-center justify-center relative">
        <AnimatePresence mode="wait">
          {!isVerifying ? (
            <motion.div
              key="inputs"
              initial={{ opacity: 0, y: 10 }}
              animate={isError ? shakeAnimation : { opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: isError ? 0.4 : 0.3 }}
              className="flex gap-4 w-full justify-center"
            >
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el }}
                  type="password"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  className={`w-16 h-16 bg-[#151A27] border ${isError ? 'border-red-500 text-red-500' : 'border-white/10 text-white focus:border-blue-500 focus:ring-blue-500'} rounded-xl text-center text-3xl font-black focus:outline-none focus:ring-1 transition-all shadow-[0_4px_24px_rgba(0,0,0,0.2)]`}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="loader"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative flex items-center justify-center w-24 h-24"
            >
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-dashed border-white/20"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                className="absolute inset-2 rounded-full border border-blue-500/30"
              >
                <div className="absolute top-0 left-1/2 w-2 h-2 -ml-1 -mt-1 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
              </motion.div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {!isVerifying && !hideToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.3 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[#1A2133]/90 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center justify-between shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">MESSAGE · OTP</p>
                <p className="text-sm font-medium">4719 is your verification code.</p>
              </div>
            </div>
            <button 
              onClick={handleAutoFill}
              className="px-4 py-1.5 bg-white text-black font-semibold text-sm rounded-full hover:bg-gray-200 transition-colors active:scale-95"
            >
              Fill
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

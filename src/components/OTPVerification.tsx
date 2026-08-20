'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock } from 'lucide-react'

interface OTPVerificationProps {
  onSuccess?: () => void
  onVerify?: (code: string) => Promise<boolean>
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
  const [isVerified, setIsVerified] = useState(false)
  const [isError, setIsError] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    async function processCode() {
      if (otp.every(digit => digit !== '') && !isVerifying && !isError && !isVerified) {
        setIsVerifying(true)
        const codeStr = otp.join('')
        
        if (onVerify) {
          const isValid = await onVerify(codeStr)
          if (isValid) {
            // After 1.5s in orbit, trigger the final collapse
            setTimeout(() => {
              setIsVerified(true)
              // Wait 0.5s for collapse animation, then route
              setTimeout(() => { if (onSuccess) onSuccess() }, 500)
            }, 1500)
          } else {
            // Wait a bit, then shake and reset
            setTimeout(() => {
              setIsError(true)
              setIsVerifying(false)
              setOtp(['', '', '', ''])
              setTimeout(() => {
                setIsError(false)
                inputRefs.current[0]?.focus()
              }, 600)
            }, 1000)
          }
        } else {
          setTimeout(() => {
            setIsVerified(true)
            setTimeout(() => { if (onSuccess) onSuccess() }, 500)
          }, 1500)
        }
      }
    }
    processCode()
  }, [otp, isVerifying, isError, isVerified, onSuccess, onVerify])

  const handleChange = (index: number, value: string) => {
    setIsError(false)
    const digit = value.slice(-1)
    if (!/^\d*$/.test(digit)) return
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    if (digit && index < 3) inputRefs.current[index + 1]?.focus()
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
      for (let i = 0; i < pastedData.length; i++) newOtp[i] = pastedData[i]
      setOtp(newOtp)
      const nextFocus = Math.min(pastedData.length, 3)
      inputRefs.current[nextFocus]?.focus()
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      
      <div className="w-full max-w-sm mb-12 text-center relative z-10">
        <h1 className="text-3xl font-semibold mb-3">{title}</h1>
        <p className="text-gray-400 text-sm">{subtitle}</p>
      </div>

      <div className="w-full max-w-sm h-32 flex items-center justify-center relative">
        
        {/* SVG Orbital Ring & Hub */}
        <AnimatePresence>
          {isVerifying && !isVerified && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ delay: 0.2, duration: 0.5, exit: { duration: 0.5, ease: "easeInOut" } }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <svg width="140" height="140" className="absolute">
                <circle cx="70" cy="70" r="48" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" />
                <circle cx="70" cy="70" r="4" fill="#3b82f6" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Orbiting Cubes */}
        <div className="relative flex items-center justify-center w-full h-full">
          {otp.map((digit, idx) => {
            const normalX = (idx - 1.5) * 80 // Spread them out: -120, -40, 40, 120
            const orbitAngle = idx * 90

            return (
              <motion.div
                key={idx}
                className="absolute flex items-center justify-center"
                initial={false}
                animate={
                  isVerified
                    ? {
                        x: 0,
                        rotate: orbitAngle + 1080 // Keep rotating or freeze
                      }
                    : isVerifying
                      ? {
                          x: 0,
                          rotate: [0, 0, orbitAngle + 360, orbitAngle + 720, orbitAngle + 1080],
                        }
                      : { x: normalX, rotate: 0 }
                }
                transition={{
                  x: { duration: 0.4, ease: "easeInOut" },
                  rotate: isVerified 
                    ? { duration: 0.5 }
                    : { times: [0, 0.2, 0.5, 0.8, 1], duration: 2.5, ease: [0.4, 0, 0.2, 1] }
                }}
              >
                <motion.div
                  animate={
                    isVerified
                      ? { x: 0, scale: 0 }
                      : isVerifying
                        ? { x: [0, 0, 48], scale: 0.5 }
                        : isError
                          ? { x: [-10, 10, -10, 10, -5, 5, 0], scale: 1 }
                          : { x: 0, scale: 1 }
                  }
                  transition={{
                    x: isVerifying && !isVerified ? { times: [0, 0.2, 1], duration: 1, ease: "easeInOut" } : { duration: 0.4 },
                    scale: { duration: 0.4, ease: "easeInOut" }
                  }}
                  className="relative w-16 h-16 flex items-center justify-center"
                >
                  {/* SVG Border Tracer (Illuminates from start to end) */}
                  {!isVerifying && !isError && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 64 64">
                      <motion.rect
                        x="1" y="1" width="62" height="62" rx="11"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: digit ? 1 : 0, opacity: digit ? 1 : 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </svg>
                  )}
                  
                  <input
                    ref={(el) => { inputRefs.current[idx] = el }}
                    type="password"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    disabled={isVerifying}
                    className={`absolute inset-0 w-full h-full bg-[#151A27] rounded-xl text-center text-3xl font-black focus:outline-none transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.2)] ${
                      isVerifying 
                        ? 'text-transparent border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] border-2' 
                        : isError 
                          ? 'border-red-500 text-red-500 border'
                          : digit ? 'border-transparent text-white' : 'border-white/10 text-white border'
                    }`}
                  />
                </motion.div>
              </motion.div>
            )
          })}
        </div>
      </div>

      <motion.div 
        animate={{ y: isVerifying ? -40 : 0, opacity: isVerifying ? 0.5 : 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="w-full max-w-sm mt-8 text-center text-sm text-gray-500"
      >
        Mantén tu PIN seguro y no lo compartas.
      </motion.div>
    </div>
  )
}

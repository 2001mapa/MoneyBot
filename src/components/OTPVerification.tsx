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
  const [isError, setIsError] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    async function processCode() {
      if (otp.every(digit => digit !== '') && !isVerifying && !isError) {
        setIsVerifying(true)
        const codeStr = otp.join('')
        
        if (onVerify) {
          const isValid = await onVerify(codeStr)
          if (isValid) {
            // Wait for orbital animation to finish (approx 2s)
            setTimeout(() => { if (onSuccess) onSuccess() }, 1800)
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
          setTimeout(() => { if (onSuccess) onSuccess() }, 2000)
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
          {isVerifying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <svg width="120" height="120" className="absolute">
                <circle cx="60" cy="60" r="36" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" />
                <circle cx="60" cy="60" r="3" fill="#10b981" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Morphing Inputs -> Satellites */}
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
                  isVerifying
                    ? {
                        x: 0,
                        rotate: [0, 0, orbitAngle + 360, orbitAngle + 720, orbitAngle + 1080],
                      }
                    : { x: normalX, rotate: 0 }
                }
                transition={{
                  x: { duration: 0.4, ease: "easeInOut" },
                  rotate: { 
                    times: [0, 0.2, 0.5, 0.8, 1], 
                    duration: 2.5, 
                    ease: [0.4, 0, 0.2, 1] 
                  }
                }}
              >
                <motion.input
                  ref={(el) => { inputRefs.current[idx] = el }}
                  type="password"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  disabled={isVerifying}
                  animate={
                    isVerifying
                      ? {
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: "#10b981",
                          borderColor: "rgba(16, 185, 129, 0)",
                          color: "rgba(0,0,0,0)",
                          x: [0, 0, 36], // Wait for collapse to finish (at center), then move out to radius 36
                        }
                      : isError
                        ? {
                            x: [-10, 10, -10, 10, -5, 5, 0],
                            borderColor: "#ef4444",
                            color: "#ef4444"
                          }
                        : {
                            width: 64,
                            height: 64,
                            borderRadius: 12,
                            backgroundColor: "#151A27",
                            borderColor: "rgba(255,255,255,0.1)",
                            color: "#ffffff",
                            x: 0
                          }
                  }
                  transition={{
                    width: { duration: 0.4, ease: "easeInOut" },
                    height: { duration: 0.4, ease: "easeInOut" },
                    backgroundColor: { duration: 0.4 },
                    x: isVerifying 
                        ? { times: [0, 0.2, 1], duration: 1, ease: "easeInOut" } 
                        : { duration: 0.4 },
                  }}
                  className="text-center text-3xl font-black focus:outline-none focus:ring-1 focus:border-blue-500 shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
                />
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

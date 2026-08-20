'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, AlertCircle } from 'lucide-react'

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
  title = "MoneyBot",
  subtitle = "Ingresa tu PIN de 4 dígitos",
  hideToast = false
}: OTPVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', ''])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [isError, setIsError] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const processCode = async (newOtp: string[]) => {
    if (!newOtp.every(d => d !== '') || isVerifying || isError || isVerified) return
    setIsVerifying(true)
    const codeStr = newOtp.join('')

    if (onVerify) {
      const isValid = await onVerify(codeStr)
      if (isValid) {
        setTimeout(() => {
          setIsVerified(true)
          setTimeout(() => { if (onSuccess) onSuccess() }, 700)
        }, 1800)
      } else {
        setTimeout(() => {
          setIsError(true)
          setIsVerifying(false)
          setOtp(['', '', '', ''])
          setTimeout(() => {
            setIsError(false)
            inputRefs.current[0]?.focus()
          }, 700)
        }, 1000)
      }
    } else {
      setTimeout(() => {
        setIsVerified(true)
        setTimeout(() => { if (onSuccess) onSuccess() }, 700)
      }, 1800)
    }
  }

  const handleChange = (index: number, value: string) => {
    setIsError(false)
    const digit = value.slice(-1)
    if (!/^\d*$/.test(digit)) return
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    if (digit && index < 3) inputRefs.current[index + 1]?.focus()
    processCode(newOtp)
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
      processCode(newOtp)
    }
  }

  // Posiciones de los 4 cubos en órbita (distribuidos en cruz)
  const orbitRadius = 52
  const orbitPositions = [
    { x: -orbitRadius, y: 0 },       // izquierda
    { x: 0,           y: -orbitRadius }, // arriba
    { x: orbitRadius, y: 0 },        // derecha
    { x: 0,           y: orbitRadius },  // abajo
  ]

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
    >
      {/* Ambient glow orb — adapts to theme primary color */}
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--primary), transparent 70%)' }}
      />

      {/* Header */}
      <motion.div
        className="w-full max-w-xs mb-14 text-center z-10"
        animate={{ y: isVerifying ? -12 : 0, opacity: isVerifying ? 0.6 : 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Icon neumorphic circle */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{
            background: 'var(--background)',
            boxShadow: '5px 5px 12px var(--neu-dark), -5px -5px 12px var(--neu-light)',
          }}
        >
          <motion.div
            animate={isVerified ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.4 }}
          >
            <ShieldCheck
              className="w-7 h-7"
              strokeWidth={1.5}
              style={{ color: isVerified ? 'var(--income)' : 'var(--primary)' }}
            />
          </motion.div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-1">{title}</h1>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{subtitle}</p>
      </motion.div>

      {/* === MAIN PIN AREA === */}
      <div className="relative w-40 h-40 flex items-center justify-center z-10 mb-14">

        {/* Orbital SVG ring — visible during verification */}
        <AnimatePresence>
          {isVerifying && !isVerified && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <svg width="160" height="160">
                {/* Guide ring */}
                <circle
                  cx="80" cy="80" r={orbitRadius}
                  stroke="var(--border)"
                  strokeWidth="1.5"
                  fill="none"
                />
                {/* Spinning comet arc */}
                <motion.circle
                  cx="80" cy="80" r={orbitRadius}
                  stroke="var(--primary)"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={`${orbitRadius * 0.8} ${orbitRadius * 6}`}
                  strokeLinecap="round"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  style={{ transformOrigin: '80px 80px' }}
                />
                {/* Center nucleus */}
                <motion.circle
                  cx="80" cy="80" r="5"
                  fill="var(--primary)"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ transformOrigin: '80px 80px' }}
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success ring */}
        <AnimatePresence>
          {isVerified && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: 'spring', bounce: 0.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <svg width="160" height="160">
                <motion.circle
                  cx="80" cy="80" r={orbitRadius}
                  stroke="var(--income)"
                  strokeWidth="2.5"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
                <circle cx="80" cy="80" r="8" fill="var(--income)" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The 4 orbiting cubes */}
        {otp.map((digit, idx) => {
          const normalX = (idx - 1.5) * 70  // Spread linearly: -105, -35, 35, 105
          const orbitPos = orbitPositions[idx]

          return (
            <motion.div
              key={idx}
              className="absolute"
              animate={
                isVerified
                  ? { x: 0, y: 0, scale: 0, opacity: 0 }
                  : isVerifying
                    ? { x: orbitPos.x, y: orbitPos.y, rotate: [0, 360], scale: 0.65, opacity: 0.9 }
                    : { x: normalX, y: 0, scale: 1, opacity: 1 }
              }
              transition={
                isVerified
                  ? { duration: 0.4, ease: 'easeIn' }
                  : isVerifying
                    ? {
                        x: { duration: 0.5, ease: 'easeInOut' },
                        y: { duration: 0.5, ease: 'easeInOut' },
                        rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
                        scale: { duration: 0.4 },
                      }
                    : { x: { duration: 0.4, ease: 'easeInOut' }, scale: { duration: 0.3 } }
              }
            >
              {/* Cube wrapper with neumorphism */}
              <motion.div
                className="w-14 h-14 rounded-xl flex items-center justify-center relative"
                style={{
                  background: 'var(--background)',
                  boxShadow: digit && !isVerifying
                    ? 'inset 3px 3px 7px var(--neu-dark), inset -3px -3px 7px var(--neu-light)'
                    : isError
                      ? '3px 3px 8px var(--neu-dark), -3px -3px 8px var(--neu-light)'
                      : '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)',
                }}
                animate={
                  isError ? { x: [-6, 6, -6, 6, -3, 3, 0] } : {}
                }
                transition={isError ? { duration: 0.5 } : {}}
              >
                {/* SVG border tracer — draws with theme primary color */}
                {!isVerifying && !isError && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 56 56">
                    <motion.rect
                      x="1.5" y="1.5" width="53" height="53" rx="10"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: digit ? 1 : 0, opacity: digit ? 1 : 0 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                    />
                  </svg>
                )}

                {/* Error indicator ring */}
                {isError && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 56 56">
                    <rect
                      x="1.5" y="1.5" width="53" height="53" rx="10"
                      fill="none"
                      stroke="var(--expense)"
                      strokeWidth="2"
                    />
                  </svg>
                )}

                {/* Glow ring while verifying */}
                {isVerifying && (
                  <motion.div
                    className="absolute inset-0 rounded-xl"
                    style={{ border: '1.5px solid var(--primary)', opacity: 0.6 }}
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                )}

                {/* Hidden input */}
                <input
                  ref={(el) => { inputRefs.current[idx] = el }}
                  type="password"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  disabled={isVerifying}
                  maxLength={1}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 rounded-xl"
                  style={{ caretColor: 'transparent' }}
                />

                {/* Dot indicator */}
                <AnimatePresence>
                  {digit && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', bounce: 0.5, duration: 0.3 }}
                      className="w-3 h-3 rounded-full z-10 pointer-events-none"
                      style={{ background: isVerifying ? 'var(--primary)' : 'var(--foreground)' }}
                    />
                  )}
                </AnimatePresence>

                {/* Empty placeholder dot */}
                {!digit && !isVerifying && (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: 'var(--muted-foreground)', opacity: 0.3 }}
                  />
                )}
              </motion.div>
            </motion.div>
          )
        })}
      </div>

      {/* Status text */}
      <motion.div
        className="z-10 flex flex-col items-center gap-2"
        animate={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.3 }}
      >
        <AnimatePresence mode="wait">
          {isVerifying && !isVerified && (
            <motion.p
              key="verifying"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--primary)' }}
            >
              Verificando...
            </motion.p>
          )}
          {isVerified && (
            <motion.p
              key="verified"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2"
              style={{ color: 'var(--income)' }}
            >
              <ShieldCheck className="w-4 h-4" strokeWidth={2} />
              Acceso concedido
            </motion.p>
          )}
          {isError && (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2"
              style={{ color: 'var(--expense)' }}
            >
              <AlertCircle className="w-4 h-4" strokeWidth={2} />
              PIN incorrecto
            </motion.p>
          )}
          {!isVerifying && !isVerified && !isError && (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Mantén tu PIN seguro y no lo compartas.
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

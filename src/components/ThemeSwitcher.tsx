'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState, useRef } from 'react'
import { Check } from 'lucide-react'

const themes = [
  { id: 'dark',         label: 'Dark',         swatch: '#818cf8', bg: '#09090b' },
  { id: 'light',        label: 'Light',        swatch: '#6366f1', bg: '#f8fafc' },
  { id: 'luxury_gold',  label: 'Gold',         swatch: '#c9a84c', bg: '#080808' },
  { id: 'emerald',      label: 'Emerald',      swatch: '#10b981', bg: '#011a12' },
  { id: 'cyberpunk',    label: 'Cyberpunk',    swatch: '#f9e11e', bg: '#050505' },
  { id: 'retro_pixel',  label: 'Retro',        swatch: '#7c3aed', bg: '#14122b' },
  { id: 'soft_pastel',  label: 'Pastel',       swatch: '#e879a0', bg: '#fdfcfb' },
]

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!mounted) return null

  const current = themes.find(t => t.id === theme) || themes[0]

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border hover:bg-muted transition-colors"
        aria-label="Cambiar tema"
      >
        <span
          className="w-4 h-4 rounded-full border-2 border-white/20 shadow-sm"
          style={{ background: current.swatch }}
        />
        <span className="text-xs font-bold uppercase tracking-wider">{current.label}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-2 space-y-0.5">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); setIsOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                  theme === t.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full flex-shrink-0 shadow-sm"
                  style={{ background: t.swatch, outline: `3px solid ${t.bg}`, outlineOffset: '-1px' }}
                />
                <span className="text-xs font-semibold flex-1">{t.label}</span>
                {theme === t.id && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

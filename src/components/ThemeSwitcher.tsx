'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState, useRef } from 'react'
import { Check } from 'lucide-react'

const themes = [
  { id: 'midnight', label: 'Midnight', swatch: '#3B82F6', bg: '#0F172A' },
  { id: 'carbon',   label: 'Carbon',   swatch: '#A3E635', bg: '#1F2937' },
  { id: 'forest',   label: 'Forest',   swatch: '#A7F3D0', bg: '#065F46' },
  { id: 'rosewood', label: 'Rosewood', swatch: '#F3D5D8', bg: '#7F1D1D' },
  { id: 'coastal',  label: 'Coastal',  swatch: '#FF7F50', bg: '#0F766E' },
  { id: 'velvet',   label: 'Velvet',   swatch: '#C4B5FD', bg: '#6D28D9' },
  { id: 'desert',   label: 'Desert',   swatch: '#EAB308', bg: '#C2410C' },
]

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!mounted) return null

  const current = themes.find(t => t.id === theme) || themes[0]

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-2xl glass border border-border/50 hover:border-border transition-all min-h-[44px]"
      >
        <span
          className="w-4 h-4 rounded-full shadow-sm ring-2 ring-white/20 flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${current.bg} 30%, ${current.swatch} 130%)` }}
        />
        <span className="text-xs font-bold tracking-wide">{current.label}</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-52 z-50 overflow-hidden rounded-2xl shadow-2xl"
          style={{
            background: 'var(--card-elevated, var(--card))',
            border: '1px solid var(--border)',
          }}
        >
          <div className="p-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 pt-2 pb-1">
              Tema
            </p>
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); setIsOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left min-h-[44px] ${
                  theme === t.id
                    ? 'bg-primary/20 text-primary'
                    : 'text-foreground hover:bg-primary/10'
                }`}
              >
                {/* Dual swatch: bg color + accent color */}
                <span
                  className="w-6 h-6 rounded-lg flex-shrink-0 shadow"
                  style={{
                    background: `linear-gradient(135deg, ${t.bg} 40%, ${t.swatch} 130%)`,
                    border: `1.5px solid ${t.swatch}55`
                  }}
                />
                <span className="text-xs font-semibold flex-1">{t.label}</span>
                {theme === t.id && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

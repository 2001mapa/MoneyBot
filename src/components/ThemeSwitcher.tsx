'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState, useRef } from 'react'
import { Check } from 'lucide-react'

const themes = [
  { id: 'navy-saas',           label: 'Midnight',   bg: '#0F172A', accent: '#3B82F6', app: '#F0F4F8' },
  { id: 'charcoal-lime',       label: 'Carbon',     bg: '#1F2937', accent: '#A3E635', app: '#F3F4F6' },
  { id: 'emerald-mint',        label: 'Forest',     bg: '#065F46', accent: '#A7F3D0', app: '#FFF8E7' },
  { id: 'burgundy-blush',      label: 'Rosewood',   bg: '#7F1D1D', accent: '#F3D5D8', app: '#FFFDF7' },
  { id: 'teal-coral',          label: 'Coastal',    bg: '#0F766E', accent: '#FF7F50', app: '#F5E6CA' },
  { id: 'plum-lavender',       label: 'Velvet',     bg: '#6D28D9', accent: '#C4B5FD', app: '#FAF7FF' },
  { id: 'terracotta-mustard',  label: 'Desert',     bg: '#C2410C', accent: '#EAB308', app: '#FFF7E6' },
  { id: 'midnight-slate',      label: 'Midnight Slate', bg: '#020617', accent: '#06B6D4', app: '#0F172A' },
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
        className="flex items-center gap-2 px-3 py-2 rounded-2xl glass border-[var(--border)] hover:opacity-80 transition-colors min-h-[44px]"
      >
        {/* Tri-color swatch: app bg + card dark + accent */}
        <span className="w-5 h-5 rounded-full flex-shrink-0 shadow-sm" style={{
          background: `conic-gradient(${current.app} 0deg 120deg, ${current.bg} 120deg 240deg, ${current.accent} 240deg 360deg)`,
          outline: '2px solid var(--border)',
        }} />
        <span className="text-xs font-bold tracking-wide" style={{ color: 'var(--text-main)' }}>
          {current.label}
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 z-50 overflow-hidden rounded-2xl shadow-xl"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 30px var(--neu-dark)',
          }}
        >
          <div className="p-2">
            <p className="text-[10px] font-bold uppercase tracking-widest px-3 pt-2 pb-1"
              style={{ color: 'var(--text-muted)' }}>
              Selecciona un tema
            </p>
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); setIsOpen(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left min-h-[44px]"
                style={{
                  background: theme === t.id ? `${t.accent}22` : 'transparent',
                  color: theme === t.id ? t.bg : 'var(--text-main)',
                }}
              >
                {/* Dual-color swatch */}
                <span
                  className="w-7 h-7 rounded-lg flex-shrink-0 shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${t.app} 0%, ${t.app} 45%, ${t.bg} 45%, ${t.bg} 70%, ${t.accent} 70%)`,
                    border: `1.5px solid ${t.accent}66`,
                  }}
                />
                <span className="text-xs font-semibold flex-1">{t.label}</span>
                {theme === t.id && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.bg }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

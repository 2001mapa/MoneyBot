'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState, useRef } from 'react'
import { Check } from 'lucide-react'

const themes = [
  // Oscuros
  { id: 'dark',        label: 'Dark',       swatch: '#0a84ff', bg: '#000000',   group: 'Oscuros' },
  { id: 'luxury_gold', label: 'Gold',       swatch: '#c9a84c', bg: '#080605',   group: 'Oscuros' },
  { id: 'emerald',     label: 'Emerald',    swatch: '#10b981', bg: '#011a12',   group: 'Oscuros' },
  { id: 'cyberpunk',   label: 'Cyberpunk',  swatch: '#f9e11e', bg: '#030303',   group: 'Oscuros' },
  { id: 'retro_pixel', label: 'Synthwave',  swatch: '#bf5fff', bg: '#0d0b1e',   group: 'Oscuros' },
  { id: 'ocean',       label: 'Ocean',      swatch: '#38bdf8', bg: '#020b18',   group: 'Oscuros' },
  { id: 'rose_gold',   label: 'Rose Gold',  swatch: '#e8818a', bg: '#100808',   group: 'Oscuros' },
  { id: 'nord',        label: 'Nord',       swatch: '#88c0d0', bg: '#1a1f2e',   group: 'Oscuros' },
  { id: 'sunset',      label: 'Sunset',     swatch: '#f97316', bg: '#100a05',   group: 'Oscuros' },
  { id: 'matrix',      label: 'Matrix',     swatch: '#00ff41', bg: '#000000',   group: 'Oscuros' },
  // Claros
  { id: 'light',       label: 'Light',      swatch: '#007aff', bg: '#f2f2f7',   group: 'Claros' },
  { id: 'soft_pastel', label: 'Pastel',     swatch: '#e879a0', bg: '#fdf6f0',   group: 'Claros' },
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
  const groups = ['Oscuros', 'Claros']

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-2xl glass border border-border/50 hover:border-border transition-all"
      >
        <span
          className="w-4 h-4 rounded-full shadow-sm ring-2 ring-white/20"
          style={{ background: current.swatch }}
        />
        <span className="text-xs font-bold tracking-wide">{current.label}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 glass border border-border/50 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-2">
            {groups.map(group => (
              <div key={group}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 pt-2 pb-1">{group}</p>
                {themes.filter(t => t.group === group).map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTheme(t.id); setIsOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${
                      theme === t.id
                        ? 'bg-primary/15 text-primary'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    {/* Swatch with the theme's bg + accent */}
                    <span
                      className="w-6 h-6 rounded-lg flex-shrink-0 shadow"
                      style={{
                        background: `linear-gradient(135deg, ${t.bg} 40%, ${t.swatch} 130%)`,
                        border: `1.5px solid ${t.swatch}44`
                      }}
                    />
                    <span className="text-xs font-semibold flex-1">{t.label}</span>
                    {theme === t.id && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
